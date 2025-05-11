"""
Main FastAPI application module for the Chatbot API.

This module defines the API endpoints and business logic for the chatbot application.
It includes endpoints for conversation handling and message operations.
The API uses SQLModel for database interactions and supports real-time chat functionality.

The module provides the following main features:
- Message management (create and retrieve messages)
- Real-time chat using WebSockets with OpenAI integration
- Health check endpoint

All database models are defined in the database module.
"""

import datetime
import json
import uuid
from contextlib import asynccontextmanager
from typing import TypedDict

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from chatbot_api.auth import UserInfo, get_current_user
from chatbot_api.config import AVAILABLE_MODELS
from chatbot_api.conversation_routes import router as conversation_router
from chatbot_api.conversation_routes import verify_conversation_access
from chatbot_api.database import (
    Message,
    Payment,
    Plan,
    Role,
    Subscription,
    create_db_and_tables,
    create_session,
    get_session,
)
from chatbot_api.openai_client import stream_chat_completion
from chatbot_api.user_routes import router as user_router


@asynccontextmanager
async def lifespan(app: FastAPI):  # pyright: ignore[reportUnusedParameter]
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include the routers
app.include_router(user_router)
app.include_router(conversation_router)


class StreamRequest(TypedDict):
    """TypedDict representing stream request data structure"""

    conversation_id: int
    model: str
    user_id: str
    created_at: datetime.datetime


stream_requests: dict[str, StreamRequest] = {}


class MessageCreate(BaseModel):
    """
    Request model for creating a new message.

    Attributes:
        conversation_id: ID of the conversation this message belongs to
        content: Content of the message
    """

    conversation_id: int
    content: str


class SubscribeRequest(BaseModel):
    """
    Request model for subscribing to a plan.

    Attributes:
        plan_id: ID of the plan to subscribe to
    """

    plan_id: int


class SubscribeResponse(BaseModel):
    """
    Response model for subscription endpoint.

    Attributes:
        status: Status of the subscription operation
        message: Human-readable message about the subscription
        subscription_id: ID of the created subscription
        plan_name: Name of the subscribed plan
        end_date: When the subscription will end
    """

    status: str
    message: str
    subscription_id: int
    plan_name: str
    end_date: datetime.datetime


@app.get("/health")
async def health_check():
    """
    Health check endpoint to verify that the API is running.

    Returns:
        A dictionary with a status message
    """
    return {"status": "ok"}


@app.post("/chat", response_model=dict)
async def start_chat(
    request: Request,
    message: MessageCreate,
    current_user: UserInfo = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """
    Start a chat session by sending a message and receiving a stream URL.

    Args:
        request: HTTP request object
        message: Message information from request body
        current_user: User information from JWT token
        session: Database session

    Returns:
        A dictionary containing the WebSocket URL for streaming the response
    """
    conversation = await verify_conversation_access(message.conversation_id, current_user, session)
    model = conversation.model

    # unique stream ID
    stream_id = str(uuid.uuid4())

    statement = select(Message).where(Message.conversation_id == message.conversation_id)
    result = await session.exec(statement)
    existing_messages = result.all()
    index = len(existing_messages)

    db_message = Message(
        conversation_id=message.conversation_id, role=Role.USER, content=message.content, index=index, model=None
    )
    session.add(db_message)
    await session.commit()
    await session.refresh(db_message)

    conversation.updated_at = datetime.datetime.now(datetime.UTC)
    session.add(conversation)
    await session.commit()

    scheme = "wss" if request.url.scheme == "https" else "ws"
    host = request.headers.get("host", request.url.hostname)
    root_path = request.scope.get("root_path", "").rstrip("/")
    ws_path = f"{root_path}/ws/stream/{stream_id}"

    stream_requests[stream_id] = {
        "conversation_id": message.conversation_id,
        "model": model,
        "user_id": current_user["id"],
        "created_at": datetime.datetime.now(datetime.UTC),
    }

    # Return the WebSocket URL
    return {"ws_url": f"{scheme}://{host}{ws_path}"}


@app.websocket("/ws/stream/{stream_id}")
async def stream_chat_response(websocket: WebSocket, stream_id: str):
    """
    WebSocket endpoint for streaming chat responses after a message is sent via POST.

    Args:
        websocket: WebSocket connection
        stream_id: Unique ID for this streaming session
    """
    try:
        await websocket.accept()

        # Verify the stream ID exists
        if stream_id not in stream_requests:
            await websocket.send_text(json.dumps({"error": "Invalid or expired stream ID"}))
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        stream_data = stream_requests[stream_id]
        conversation_id = stream_data["conversation_id"]
        model = stream_data["model"]

        # Clean up the stream request after use
        # Set a reasonable timeout (e.g. 5 minutes)
        created_at = stream_data["created_at"]
        if (datetime.datetime.now(datetime.UTC) - created_at).total_seconds() > 300:
            del stream_requests[stream_id]
            await websocket.send_text(json.dumps({"error": "Stream session expired"}))
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        async with create_session() as session:
            statement = select(Message).where(Message.conversation_id == conversation_id)
            result = await session.exec(statement)
            all_messages = sorted(result.all(), key=lambda m: m.index)
            openai_messages = [{"role": msg.role, "content": msg.content} for msg in all_messages]

            assistant_message = Message(
                conversation_id=conversation_id, role=Role.ASSISTANT, content="", index=len(all_messages), model=model
            )
            session.add(assistant_message)
            await session.commit()
            await session.refresh(assistant_message)

            full_response = ""
            try:
                async for response_chunk in stream_chat_completion(openai_messages, model):
                    full_response += response_chunk

                    await websocket.send_text(response_chunk)

                    # Update assistant message in the database periodically
                    if len(response_chunk) > 50:
                        assistant_message.content = full_response
                        session.add(assistant_message)
                        await session.commit()

            except Exception as e:
                await websocket.send_text(json.dumps({"error": f"Error from OpenAI API: {str(e)}"}))
                return

            # Update complete response in the database
            assistant_message.content = full_response
            session.add(assistant_message)
            await session.commit()

            await websocket.send_text(json.dumps({"event": "chat_ended"}))

            del stream_requests[stream_id]

    except WebSocketDisconnect:
        if stream_id in stream_requests:
            del stream_requests[stream_id]
    except Exception as e:
        # Send error message if possible
        try:
            await websocket.send_text(json.dumps({"error": f"Server error: {str(e)}"}))
        except WebSocketDisconnect:
            pass

        try:
            await websocket.close()
        except WebSocketDisconnect:
            pass

        if stream_id in stream_requests:
            del stream_requests[stream_id]


@app.get("/models")
async def get_available_models():
    """
    Get a list of available language models.

    Returns:
        A list of available model names
    """
    return {"models": AVAILABLE_MODELS}


@app.post("/subscribe", response_model=SubscribeResponse)
async def subscribe(
    request: SubscribeRequest,
    current_user: UserInfo = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SubscribeResponse:
    """
    Subscribe to a plan by creating a payment and subscription record.
    This is a demo endpoint that simulates a Stripe payment flow.

    Args:
        request: Subscription request containing plan_id
        current_user: User information from JWT token
        session: Database session

    Returns:
        SubscribeResponse containing subscription details
    """
    # Get the plan
    plan = await session.get(Plan, request.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    assert plan.id is not None, "Plan ID should not be None"

    user_id = uuid.UUID(current_user["id"])
    # Create a payment record (simulating Stripe payment)
    payment = Payment(
        user_id=user_id,
        amount=plan.price,
        method="credit_card",  # Simulated payment method
        status="completed",  # Simulated successful payment
        plan_id=plan.id,
    )
    session.add(payment)
    await session.commit()
    await session.refresh(payment)
    assert payment.id is not None, "Payment ID should not be None"

    # Create a subscription record
    end_date = datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=30)
    subscription = Subscription(
        user_id=user_id,
        payment_id=payment.id,
        plan_id=plan.id,
        start_date=datetime.datetime.now(datetime.UTC),
        end_date=end_date,
    )
    session.add(subscription)
    await session.commit()
    await session.refresh(subscription)
    assert subscription.id is not None, "Subscription ID should not be None"

    return SubscribeResponse(
        status="success",
        message=f"Successfully subscribed to {plan.name} plan",
        subscription_id=subscription.id,
        plan_name=plan.name,
        end_date=end_date,
    )


def main():
    """
    Entry point for the application when run directly.

    Starts the uvicorn server with the FastAPI application.
    """
    uvicorn.run(
        "chatbot_api.main:app", host="0.0.0.0", port=8000, reload=True, proxy_headers=True, forwarded_allow_ips="*"
    )


if __name__ == "__main__":
    main()
