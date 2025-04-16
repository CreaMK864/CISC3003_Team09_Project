"""
Main FastAPI application module for the Chatbot API.

This module defines the API endpoints and business logic for the chatbot application.
It includes endpoints for user management, conversation handling, and message operations.
The API uses SQLModel for database interactions and supports real-time chat functionality.

The module provides the following main features:
- User management (create and retrieve users)
- Conversation management (create, retrieve, and list conversations)
- Message management (create and retrieve messages)
- Health check endpoint

All database models are defined in the database module.
"""

from contextlib import asynccontextmanager
import datetime
import uuid

import uvicorn
from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from chatbot_api.database import Conversation, Message, User, delete_all_tables, create_db_and_tables, get_session
from chatbot_api.auth import get_current_user, UserInfo

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle event handler that runs when the application starts.
    Creates database tables before the application starts serving requests.
    
    Args:
        app: FastAPI application instance
    """
    await delete_all_tables()
    await create_db_and_tables()
    yield

app = FastAPI(title="Chatbot API", lifespan=lifespan)


# Create request models
class UserCreate(BaseModel):
    """
    Request model for creating a new user.
    
    Attributes:
        email: User's email address
        display_name: User's display name
        profile_picture_url: Optional URL to the user's profile picture
        password_hash: Optional hashed password
        last_selected_model: The model the user last selected, defaults to "gpt-4.1-nano"
    """
    email: str
    display_name: str
    profile_picture_url: str | None = None
    password_hash: str | None = None
    last_selected_model: str = "gpt-4.1-nano"


class ConversationCreate(BaseModel):
    """
    Request model for creating a new conversation.
    
    Attributes:
        user_id: ID of the user who owns the conversation
        title: Title of the conversation, defaults to "New Conversation"
        model: The model used for this conversation, defaults to "gpt-4.1-nano"
    """
    user_id: int
    title: str = "New Conversation"
    model: str = "gpt-4.1-nano"


class MessageCreate(BaseModel):
    """
    Request model for creating a new message.
    
    Attributes:
        conversation_id: ID of the conversation this message belongs to
        role: Role of the sender ("user" or "bot")
        content: Content of the message
    """
    conversation_id: int
    role: str
    content: str


@app.get("/health")
async def health_check():
    """
    Health check endpoint to verify that the API is running.
    
    Returns:
        A dictionary with a status message
    """
    return {"status": "ok"}


# Protected endpoint example using Supabase authentication
@app.get("/profile")
async def get_profile(current_user: UserInfo = Depends(get_current_user)):
    """
    Protected endpoint that requires a valid Supabase JWT token.
    Returns the user's profile information extracted from the token.
    
    Args:
        current_user: User information extracted from the JWT token
        
    Returns:
        User profile information
    """
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "user_metadata": current_user["claims"],
    }


# User CRUD operations
@app.post("/users/", response_model=User)
async def create_user(user: UserCreate, session: AsyncSession = Depends(get_session)):
    """
    Create a new user in the database.
    
    Args:
        user: User information from request body
        session: Database session
        
    Returns:
        The created user object
    """
    db_user = User(
        email=user.email,
        display_name=user.display_name,
        profile_picture_url=user.profile_picture_url,
        password_hash=user.password_hash,
        last_selected_model=user.last_selected_model,
    )
    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)
    return db_user


@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: int, session: AsyncSession = Depends(get_session)):
    """
    Get a user by their ID.
    
    Args:
        user_id: The ID of the user to retrieve
        session: Database session
        
    Returns:
        The user object if found
        
    Raises:
        HTTPException: If the user is not found
    """
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# Conversation CRUD operations
@app.post("/conversations/", response_model=Conversation)
async def create_conversation(
    conversation: ConversationCreate, 
    current_user: UserInfo = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
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
    """
    # Use the authenticated user's ID from the JWT token
    user_id = uuid.UUID(current_user["id"])
    
    db_conversation = Conversation(
        user_id=user_id, title=conversation.title, model=conversation.model
    )
    session.add(db_conversation)
    await session.commit()
    await session.refresh(db_conversation)
    return db_conversation


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
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Check if the conversation belongs to the authenticated user
    user_id = uuid.UUID(current_user["id"])
    if conversation.user_id != user_id:
        # Don't leak information about whether a conversation exists or not
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return conversation


@app.get("/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(
    conversation_id: int, 
    current_user: UserInfo = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
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


@app.get("/conversations", response_model=list[Conversation])
async def get_user_conversations(
    current_user: UserInfo = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
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


# Message CRUD operations
@app.post("/messages/", response_model=Message)
async def create_message(
    message: MessageCreate, 
    current_user: UserInfo = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Create a new message in a conversation.
    Requires authentication with Supabase JWT.
    
    Args:
        message: Message information from request body
        current_user: User information from JWT token
        session: Database session
        
    Returns:
        The created message object
    
    Notes:
        Also updates the conversation's updated_at timestamp
    """
    # Verify that the user has access to the conversation
    conversation = await verify_conversation_access(message.conversation_id, current_user, session)
    
    # Get current max index for the conversation to properly order messages
    statement = select(Message).where(Message.conversation_id == message.conversation_id)
    result = await session.exec(statement)
    existing_messages = result.all()
    index = len(existing_messages)
    
    db_message = Message(
        conversation_id=message.conversation_id,
        role=message.role,
        content=message.content,
        index=index
    )
    session.add(db_message)
    await session.commit()
    await session.refresh(db_message)

    # Update conversation's updated_at timestamp
    conversation.updated_at = datetime.datetime.now(datetime.UTC)
    session.add(conversation)
    await session.commit()

    return db_message


@app.get("/conversations/{conversation_id}/messages", response_model=list[Message])
async def get_conversation_messages(
    conversation_id: int, 
    current_user: UserInfo = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
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
    # Verify that the conversation exists and user has access
    await verify_conversation_access(conversation_id, current_user, session)
    
    # Retrieve messages
    statement = select(Message).where(Message.conversation_id == conversation_id)
    result = await session.exec(statement)
    messages = result.all()
    return messages


def main():
    """
    Entry point function to run the application with uvicorn server.
    """
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
