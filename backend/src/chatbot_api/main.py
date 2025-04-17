"""
Main FastAPI application module for the Chatbot API.

This module defines the API endpoints and business logic for the chatbot application.
It includes endpoints for user management, conversation handling, and message operations.
The API uses SQLModel for database interactions and supports real-time chat functionality.

The module provides the following main features:
- User management (create and retrieve users)
- Conversation management (create, retrieve, and list conversations)
- Message management (create and retrieve messages)
- Real-time chat using WebSockets with OpenAI integration
- Health check endpoint

All database models are defined in the database module.
"""

import datetime
import json
import uuid
from contextlib import asynccontextmanager

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, field_validator
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from chatbot_api.auth import UserInfo, get_current_user
from chatbot_api.config import AVAILABLE_MODELS, DEFAULT_MODEL, is_valid_model
from chatbot_api.database import Conversation, Message, User, create_db_and_tables, delete_all_tables, get_session
from chatbot_api.openai_client import stream_chat_completion


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle event handler that runs when the application starts.
    Creates database tables before the application starts serving requests.

    Args:
        app: FastAPI application instance
    """
    # await delete_all_tables()
    await create_db_and_tables()
    yield


app = FastAPI(title="Chatbot API", lifespan=lifespan)


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
    def validate_model(cls, v):
        if not is_valid_model(v):
            raise ValueError(f"Invalid model. Available models: {', '.join(AVAILABLE_MODELS)}")
        return v


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


class UserUpdate(BaseModel):
    """
    Request model for updating a user.

    Attributes:
        display_name: User's display name (optional)
        profile_picture_url: URL to the user's profile picture (optional)
        last_selected_model: The model the user last selected (optional)
    """

    display_name: str | None = None
    profile_picture_url: str | None = None
    last_selected_model: str | None = None

    @field_validator("last_selected_model")
    @classmethod
    def validate_model(cls, v):
        if v is not None and not is_valid_model(v):
            raise ValueError(f"Invalid model. Available models: {', '.join(AVAILABLE_MODELS)}")
        return v


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


@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@app.patch("/users/{user_id}", response_model=User)
async def update_user(
    user_id: uuid.UUID,
    user_update: UserUpdate,
    current_user: UserInfo = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Update a user's information.
    Requires authentication with Supabase JWT.

    Args:
        user_id: The ID of the user to update
        user_update: User information to update from request body
        current_user: User information from JWT token
        session: Database session

    Returns:
        The updated user object

    Raises:
        HTTPException: If the user is not found or if the authenticated user
                      is trying to update another user's profile, or if the model is invalid
    """
    # Verify the authenticated user is modifying their own profile
    if str(user_id) != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this user")

    # Get the user from the database
    db_user = await session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Update user fields if provided in the request
    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)

    # Update the updated_at timestamp
    db_user.updated_at = datetime.datetime.now(datetime.UTC)

    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)

    return db_user


# Conversation CRUD operations
@app.post("/conversations/", response_model=Conversation)
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


@app.get("/conversations/{conversation_id}", response_model=Conversation)
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


@app.get("/conversations", response_model=list[Conversation])
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


# Message CRUD operations
@app.post("/messages/", response_model=Message)
async def create_message(
    message: MessageCreate,
    current_user: UserInfo = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
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
        conversation_id=message.conversation_id, role=message.role, content=message.content, index=index
    )
    session.add(db_message)
    await session.commit()
    await session.refresh(db_message)

    conversation.updated_at = datetime.datetime.now(datetime.UTC)
    session.add(conversation)
    await session.commit()

    return db_message


@app.get("/conversations/{conversation_id}/messages", response_model=list[Message])
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


@app.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time chat interaction with OpenAI API.

    The client must provide a valid Supabase JWT token in the Authorization header.
    Example of connecting with a JWT token:
    ```javascript
    // Example client-side JavaScript
    const token = "your-supabase-jwt-token";
    const socket = new WebSocket("wss://your-api.com/ws/chat");

    // Add the authorization header during connection
    socket.onopen = function() {
    // Send the authorization header in the first message
    socket.send(JSON.stringify({
        action: "authenticate",
        token: token
    }));
    
    // Then continue with regular chat messages
    // ...
    };
    ```

    The client sends a JSON message with the following structure:
    ```
    {
        "action": "chat",
        "conversation_id": 123,
        "content": "User message content",
        "model": "model-name"  # Optional, defaults to user's preferred model or a system default
    }
    ```

    The server will respond with streaming responses from the OpenAI API.
    When the response is complete, the server will send a special message:
    ```
    {
        "event": "chat_ended"
    }
    ```

    Args:
        websocket: WebSocket connection
    """
    try:
        await websocket.accept()

        # Get token from headers
        headers = websocket.headers
        auth_header = headers.get("authorization")
        
        if not auth_header or not auth_header.startswith("Bearer "):
            await websocket.send_text(json.dumps({"error": "Missing or invalid authorization header"}))
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        token = auth_header.replace("Bearer ", "")

        # Validate JWT token
        try:
            current_user = get_current_user(token)
            user_id = uuid.UUID(current_user["id"])
        except Exception:
            await websocket.send_text(json.dumps({"error": "Invalid authentication token"}))
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Create a database session
        async with get_session() as session:
            try:
                # Get user's default model
                db_user: User | None = await session.get(User, user_id)
                if not db_user:
                    await websocket.send_text(json.dumps({"error": "User not found"}))
                    await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                    return

                # User's preferred model, unless it's invalid
                if is_valid_model(db_user.last_selected_model):
                    default_model = db_user.last_selected_model
                else:
                    db_user.last_selected_model = DEFAULT_MODEL
                    session.add(db_user)
                    await session.commit()
                    await session.refresh(db_user)
                    default_model = DEFAULT_MODEL

                # Listen for messages
                while True:
                    data = await websocket.receive_text()
                    message_data = json.loads(data)

                    action = message_data.get("action")

                    if action == "chat":
                        conversation_id = message_data.get("conversation_id")
                        content = message_data.get("content", "")
                        model = message_data.get("model", default_model)

                        if not is_valid_model(model):
                            await websocket.send_text(
                                json.dumps({"error": f"Invalid model. Available models: {', '.join(AVAILABLE_MODELS)}"})
                            )
                            continue

                        try:
                            conversation = await verify_conversation_access(conversation_id, current_user, session)
                        except HTTPException:
                            await websocket.send_text(json.dumps({"error": "Conversation not found"}))
                            continue

                        user_message = Message(
                            conversation_id=conversation_id,
                            role="user",
                            content=content,
                            index=0,  # Will be updated after getting existing messages
                        )

                        statement = select(Message).where(Message.conversation_id == conversation_id)
                        result = await session.exec(statement)
                        existing_messages = result.all()
                        user_message.index = len(existing_messages)

                        session.add(user_message)
                        await session.commit()
                        await session.refresh(user_message)

                        conversation.updated_at = datetime.datetime.now(datetime.UTC)
                        conversation.model = model
                        session.add(conversation)
                        await session.commit()

                        # Prepare conversation history for OpenAI
                        all_messages = sorted(existing_messages + [user_message], key=lambda m: m.index)
                        openai_messages = [{"role": msg.role, "content": msg.content} for msg in all_messages]

                        assistant_message = Message(
                            conversation_id=conversation_id,
                            role="assistant",
                            content="",
                            index=len(all_messages),
                        )
                        session.add(assistant_message)
                        await session.commit()
                        await session.refresh(assistant_message)

                        # Stream response from OpenAI
                        full_response = ""
                        try:
                            async for response_chunk in stream_chat_completion(openai_messages, model):
                                full_response += response_chunk

                                await websocket.send_text(
                                    json.dumps({"event": "chat_response", "content": response_chunk})
                                )

                                # Update assistant message in the database periodically
                                # For performance, we don't update the database on every chunk
                                if len(response_chunk) > 50:
                                    assistant_message.content = full_response
                                    session.add(assistant_message)
                                    await session.commit()

                        except Exception as e:
                            await websocket.send_text(json.dumps({"error": f"Error from OpenAI API: {str(e)}"}))
                            continue

                        # Update complete response in the database
                        assistant_message.content = full_response
                        session.add(assistant_message)
                        await session.commit()

                        # Send completion signal
                        await websocket.send_text(json.dumps({"event": "chat_ended"}))

                    else:
                        await websocket.send_text(json.dumps({"error": f"Unknown action: {action}"}))

            except WebSocketDisconnect:
                # Handle client disconnect gracefully
                pass
            except Exception as e:
                # Send error message
                await websocket.send_text(json.dumps({"error": f"Server error: {str(e)}"}))

    except Exception as e:
        # Send error message if WebSocket is still connected
        try:
            await websocket.send_text(json.dumps({"error": f"Server error: {str(e)}"}))
        except:
            pass

        try:
            await websocket.close()
        except:
            pass


@app.get("/models")
async def get_available_models():
    """
    Get a list of available language models.

    Returns:
        A list of available model names
    """
    return {"models": AVAILABLE_MODELS}


def main():
    """
    Entry point for the application when run directly.

    Starts the uvicorn server with the FastAPI application.
    """
    uvicorn.run("chatbot_api.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
