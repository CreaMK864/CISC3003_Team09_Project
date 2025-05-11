"""
Conversation routes module for the Chatbot API.

This module defines the API endpoints and business logic for conversation management.
It includes endpoints for conversation CRUD operations and message handling.
"""

import datetime
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from chatbot_api.auth import UserInfo, get_current_user
from chatbot_api.config import AVAILABLE_MODELS, DEFAULT_MODEL, is_valid_model
from chatbot_api.database import Conversation, Message, get_session

router = APIRouter(prefix="/conversations", tags=["conversations"])


class ConversationCreate(BaseModel):
    """
    Request model for creating a new conversation.

    Attributes:
        title: Title of the conversation, defaults to "New Conversation"
        model: The model used for this conversation, defaults to DEFAULT_MODEL
    """

    title: str = "New Conversation"
    model: str = DEFAULT_MODEL

    @field_validator("model")
    @classmethod
    def validate_model(cls, v: Any) -> str:
        if not is_valid_model(v):
            raise ValueError(f"Invalid model. Available models: {', '.join(AVAILABLE_MODELS)}")
        return v


class MessageCreate(BaseModel):
    """
    Request model for creating a new message.

    Attributes:
        conversation_id: ID of the conversation this message belongs to
        content: Content of the message
    """

    conversation_id: int
    content: str


class ConversationUpdate(BaseModel):
    """
    Request model for updating a conversation.

    Attributes:
        title: New title for the conversation
        model: New model to use for this conversation
    """

    title: str | None = None
    model: str | None = None

    @field_validator("model")
    @classmethod
    def validate_model(cls, v: Any) -> str | None:
        if v is not None and not is_valid_model(v):
            raise ValueError(f"Invalid model. Available models: {', '.join(AVAILABLE_MODELS)}")
        return v


class ConversationSearchResult(BaseModel):
    """
    Response model for conversation search results.

    Attributes:
        conversation: The conversation object
        matching_messages: List of messages that match the search query
    """

    conversation: Conversation
    matching_messages: list[Message]


async def verify_conversation_access(
    conversation_id: int,
    current_user: UserInfo,
    session: AsyncSession,
) -> Conversation:
    """
    Verify that a conversation exists and belongs to the current user.

    Args:
        conversation_id: The ID of the conversation to verify
        current_user: User information from the JWT token
        session: Database session

    Returns:
        The conversation object if it exists and belongs to the user

    Raises:
        HTTPException: If the conversation is not found or doesn't belong to the user
    """
    conversation = await session.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    # Check if the conversation belongs to the authenticated user
    user_id = uuid.UUID(current_user["id"])
    if conversation.user_id != user_id:
        # Don't leak information about whether a conversation exists or not
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    return conversation


@router.get("", response_model=list[Conversation])
async def get_user_conversations(
    current_user: UserInfo = Depends(get_current_user), session: AsyncSession = Depends(get_session)
):
    """
    Get all conversations for the authenticated user.
    Requires authentication with Supabase JWT.

    Args:
        current_user: User information from JWT token
        session: Database session

    Returns:
        A list of conversation objects belonging to the user
    """
    user_id = uuid.UUID(current_user["id"])
    statement = select(Conversation).where(Conversation.user_id == user_id)
    result = await session.exec(statement)
    conversations = result.all()
    return conversations


@router.post("", response_model=Conversation)
async def create_conversation(
    conversation: ConversationCreate,
    current_user: UserInfo = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Create a new conversation.
    Requires authentication with Supabase JWT.

    Args:
        conversation: Conversation information from request body
        current_user: User information from JWT token
        session: Database session

    Returns:
        The created conversation object

    Raises:
        HTTPException: If the model is invalid
    """
    user_id = uuid.UUID(current_user["id"])

    db_conversation = Conversation(user_id=user_id, title=conversation.title, model=conversation.model)
    session.add(db_conversation)
    await session.commit()
    await session.refresh(db_conversation)
    return db_conversation


@router.get("/{conversation_id}", response_model=Conversation)
async def get_conversation(
    conversation_id: int,
    current_user: UserInfo = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Get a conversation by its ID.
    Requires authentication with Supabase JWT.

    Args:
        conversation_id: The ID of the conversation to retrieve
        current_user: User information from JWT token
        session: Database session

    Returns:
        The conversation object if found

    Raises:
        HTTPException: If the conversation is not found or doesn't belong to the user
    """
    conversation = await verify_conversation_access(conversation_id, current_user, session)
    return conversation


@router.patch("/{conversation_id}", response_model=Conversation)
async def update_conversation(
    conversation_id: int,
    update: ConversationUpdate,
    current_user: UserInfo = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Update a conversation's title or model.
    Requires authentication with Supabase JWT.

    Args:
        conversation_id: The ID of the conversation to update
        update: Update information from request body
        current_user: User information from JWT token
        session: Database session

    Returns:
        The updated conversation object

    Raises:
        HTTPException: If the conversation is not found or doesn't belong to the user
    """
    conversation = await verify_conversation_access(conversation_id, current_user, session)

    # Update fields if provided
    if update.title is not None:
        conversation.title = update.title
    if update.model is not None:
        conversation.model = update.model

    # Update the timestamp
    conversation.updated_at = datetime.datetime.now(datetime.UTC)

    session.add(conversation)
    await session.commit()
    await session.refresh(conversation)
    return conversation


@router.get("/{conversation_id}/messages", response_model=list[Message])
async def get_conversation_messages(
    conversation_id: int,
    current_user: UserInfo = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Get all messages for a specific conversation.
    Requires authentication with Supabase JWT.

    Args:
        conversation_id: The ID of the conversation whose messages to retrieve
        current_user: User information from JWT token
        session: Database session

    Returns:
        A list of message objects belonging to the conversation

    Raises:
        HTTPException: If the conversation is not found or doesn't belong to the user
    """
    await verify_conversation_access(conversation_id, current_user, session)

    statement = select(Message).where(Message.conversation_id == conversation_id)
    result = await session.exec(statement)
    messages = result.all()
    return messages


@router.get("/search", response_model=list[ConversationSearchResult])
async def search_conversations(
    query: str,
    current_user: UserInfo = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Search through conversations and messages for the authenticated user.
    Requires authentication with Supabase JWT.

    Args:
        query: The search query string
        current_user: User information from JWT token
        session: Database session

    Returns:
        A list of conversations with their matching messages that contain the search query
    """
    user_id = uuid.UUID(current_user["id"])

    # Get all conversations for the user
    conv_statement = select(Conversation).where(Conversation.user_id == user_id)
    conversations = (await session.exec(conv_statement)).all()

    results: list[ConversationSearchResult] = []
    for conversation in conversations:
        # Search in conversation title
        title_match = query.lower() in conversation.title.lower()

        # Search in messages
        msg_statement = select(Message).where(Message.conversation_id == conversation.id)
        messages = (await session.exec(msg_statement)).all()
        matching_messages = [msg for msg in messages if query.lower() in msg.content.lower()]

        # If either title or messages match, include in results
        if title_match or matching_messages:
            results.append(ConversationSearchResult(conversation=conversation, matching_messages=matching_messages))

    return results
