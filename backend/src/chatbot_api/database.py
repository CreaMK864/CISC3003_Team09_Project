"""
Database module for the Chatbot API.

This module defines the database models and connection handling for the chatbot application.
It uses SQLModel to define ORM models and create database tables.

The module includes the following main components:
- Database connection setup using environment variables
- User model for storing user information and preferences
- Conversation model for managing chat conversations
- Message model for storing individual messages in conversations
- Utility functions for database initialization and session management

The models use SQLModel's relationship system to establish connections between related entities.
"""

import datetime
import os
import uuid
from contextlib import asynccontextmanager
from enum import StrEnum
from typing import Final

from dotenv import load_dotenv
from sqlalchemy import DECIMAL, Column, DateTime, Text, UniqueConstraint, text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import Field, Relationship, SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from chatbot_api.config import DEFAULT_MODEL

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost/chatbot")
engine = create_async_engine(DATABASE_URL, echo=True, future=True)


class Role(StrEnum):
    """Enum representing the possible roles in a conversation."""

    USER = "user"
    ASSISTANT = "assistant"


class Plan(SQLModel, table=True):
    """
    SQLModel representing a subscription plan.

    Attributes:
        id: Primary key identifier for the plan
        name: Name of the plan (free, standard, plus)
        price: Monthly price of the plan
        features: JSON string containing plan features
        created_at: Timestamp when the plan was created
        updated_at: Timestamp when the plan was last updated
        users: Relationship to users on this plan
        payments: Relationship to payments for this plan
        subscriptions: Relationship to active subscriptions for this plan
    """

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(Text, unique=True))
    price: float = Field(sa_column=Column(DECIMAL(10, 2)))
    features: str = Field(sa_column=Column(Text))
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC),
        sa_column=Column(DateTime(timezone=True), server_default=text("(now() AT TIME ZONE 'UTC')")),
    )
    updated_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC),
        sa_column=Column(
            DateTime(timezone=True),
            server_default=text("(now() AT TIME ZONE 'UTC')"),
            onupdate=text("(now() AT TIME ZONE 'UTC')"),
        ),
    )

    users: list["User"] = Relationship(back_populates="plan")
    payments: list["Payment"] = Relationship(back_populates="plan")
    subscriptions: list["Subscription"] = Relationship(back_populates="plan")


class User(SQLModel, table=True):
    """
    SQLModel representing a user in the system.

    Attributes:
        id: Primary key identifier for the user
        display_name: User's display name
        plan_id: Foreign key to the user's current plan
        profile_picture_url: URL to the user's profile picture
        last_selected_model: The model the user last selected
        created_at: Timestamp when the user was created
        updated_at: Timestamp when the user was last updated
        theme: User's selected theme (dark or light)
        conversations: Relationship to the user's conversations
    """

    id: uuid.UUID | None = Field(default=None, primary_key=True)
    display_name: str = Field(sa_column=Column(Text), default="User")
    profile_picture_url: str | None = Field(sa_column=Column(Text))
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC),
        sa_column=Column(DateTime(timezone=True), server_default=text("(now() AT TIME ZONE 'UTC')")),
    )
    plan_id: int = Field(foreign_key="plan.id", default=1)  # Default to free plan
    updated_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC),
        sa_column=Column(DateTime(timezone=True), server_default=text("(now() AT TIME ZONE 'UTC')")),
    )
    theme: str = Field(sa_column=Column(Text), default="light")

    conversations: list["Conversation"] = Relationship(back_populates="user")
    plan: Plan = Relationship(back_populates="users")


class Conversation(SQLModel, table=True):
    """
    SQLModel representing a conversation between a user and the chatbot.

    Attributes:
        id: Primary key identifier for the conversation
        user_id: Foreign key to the user who owns this conversation
        title: Title of the conversation
        model: The language model used for this conversation
        created_at: Timestamp when the conversation was created
        updated_at: Timestamp when the conversation was last updated
        user: Relationship back to the user
        messages: Relationship to the messages in this conversation
    """

    id: int | None = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    title: str = Field(sa_column=Column(Text, default="New Conversation"))
    model: str = Field(sa_column=Column(Text, default=DEFAULT_MODEL))
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC),
        sa_column=Column(DateTime(timezone=True), server_default=text("(now() AT TIME ZONE 'UTC')")),
    )
    updated_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC),
        sa_column=Column(DateTime(timezone=True), server_default=text("(now() AT TIME ZONE 'UTC')")),
    )

    user: User = Relationship(back_populates="conversations")
    messages: list["Message"] = Relationship(back_populates="conversation")


class Message(SQLModel, table=True):
    """
    SQLModel representing a message in a conversation.

    Attributes:
        id: Primary key identifier for the message
        index: Order index of the message in the conversation
        conversation_id: Foreign key to the conversation this message belongs to
        role: Role of the sender ("user" or "bot")
        content: Content of the message
        timestamp: Timestamp when the message was created
        conversation: Relationship back to the conversation
    """

    id: int | None = Field(default=None, primary_key=True)
    index: int
    conversation_id: int = Field(foreign_key="conversation.id", index=True)
    role: Role  # Enum for message sender role
    content: str = Field(sa_column=Column(Text))
    timestamp: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC),
        sa_column=Column(DateTime(timezone=True), server_default=text("(now() AT TIME ZONE 'UTC')")),
    )
    model: str | None = Field(sa_column=Column(Text, nullable=True))

    conversation: Conversation = Relationship(back_populates="messages")


class Payment(SQLModel, table=True):
    """
    SQLModel representing a payment record.

    Attributes:
        id: Primary key identifier for the payment
        user_id: Foreign key to the user who made the payment
        amount: Amount of the payment (stored as DECIMAL for exact precision)
        method: Payment method used (e.g., credit card, PayPal)
        status: Status of the payment (e.g., completed, pending, failed)
        plan_id: Foreign key to the plan associated with this payment
        created_at: Timestamp when the payment was created
        updated_at: Timestamp when the payment was last updated
    """

    id: int | None = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    amount: float = Field(sa_column=Column(DECIMAL(10, 2)))
    method: str = Field(sa_column=Column(Text))
    status: str = Field(sa_column=Column(Text, index=True))
    plan_id: int = Field(foreign_key="plan.id")
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC),
        sa_column=Column(DateTime(timezone=True), server_default=text("(now() AT TIME ZONE 'UTC')")),
    )
    updated_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC),
        sa_column=Column(
            DateTime(timezone=True),
            server_default=text("(now() AT TIME ZONE 'UTC')"),
            onupdate=text("(now() AT TIME ZONE 'UTC')"),
        ),
    )

    plan: Plan = Relationship(back_populates="payments")


class Subscription(SQLModel, table=True):
    """
    SQLModel representing a subscription record.

    Attributes:
        id: Primary key identifier for the subscription
        user_id: Foreign key to the user who owns the subscription
        payment_id: Foreign key to the payment record associated with this subscription
        plan_id: Foreign key to the plan of the subscription
        start_date: Start date of the subscription
        end_date: End date of the subscription
    """

    id: int | None = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    payment_id: int = Field(foreign_key="payment.id", index=True)
    plan_id: int = Field(foreign_key="plan.id")
    start_date: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC),
        sa_column=Column(DateTime(timezone=True), server_default=text("(now() AT TIME ZONE 'UTC')")),
    )
    end_date: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=30),
        sa_column=Column(
            DateTime(timezone=True),
            server_default=text("(now() AT TIME ZONE 'UTC') + interval '30 days'"),
            index=True,
        ),
    )

    __table_args__ = (UniqueConstraint("user_id", "end_date", name="uix_user_active_subscription"),)

    plan: Plan = Relationship(back_populates="subscriptions")


async def delete_all_tables():
    """
    Delete all tables in the database.
    """
    async with engine.begin() as conn:
        try:
            await conn.run_sync(SQLModel.metadata.drop_all)
            await conn.run_sync(lambda conn: conn.execute(text("DROP TRIGGER on_auth_user_created ON auth.users")))
            await conn.run_sync(lambda conn: conn.execute(text("DROP FUNCTION handle_new_user")))
        except Exception:
            pass


async def init_default_plans(session: AsyncSession):
    """
    Initialize default subscription plans if they don't exist.
    """
    default_plans: Final = [
        {
            "id": 1,
            "name": "free",
            "price": 0.00,
            "features": '{"max_conversations": 5, "max_messages_per_conversation": 50, "models": ["gpt-3.5-turbo"]}',
        },
        {
            "id": 2,
            "name": "standard",
            "price": 9.99,
            "features": '{"max_conversations": 20, "max_messages_per_conversation": 200, "models": ["gpt-3.5-turbo", "gpt-4"]}',
        },
        {
            "id": 3,
            "name": "plus",
            "price": 19.99,
            "features": '{"max_conversations": -1, "max_messages_per_conversation": -1, "models": ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"]}',
        },
    ]

    for plan_data in default_plans:
        plan = await session.get(Plan, plan_data["id"])
        if not plan:
            plan = Plan(**plan_data)  # pyright: ignore
            session.add(plan)

    await session.commit()


async def create_db_and_tables():
    """
    Create all database tables if they don't exist.

    This function should be called when the application starts.
    """
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    # Needs to be in a separate transaction, otherwise this failing (usually expected) would cause the whole transaction to fail.
    async with engine.begin() as conn:
        # It is very difficult to set user.id to be a foreign key to auth.users.id, so we use SQL directly to do this.
        # Related discussion: https://github.com/sqlalchemy/alembic/discussions/1144
        try:
            await conn.exec_driver_sql(
                "ALTER TABLE public.user ADD CONSTRAINT fk_user_id FOREIGN KEY (id) REFERENCES auth.users (id) ON UPDATE CASCADE ON DELETE CASCADE"
            )
        except Exception as e:
            if "already exists" not in str(e):
                raise

    # Initialize default plans
    async with AsyncSession(engine) as session:
        await init_default_plans(session)

    # TODO: Create a trigger to automatically create a user entry when a new user signs up via Supabase Auth.


async def get_session():
    """
    Create and yield a database session.

    This function is used as a FastAPI dependency for database access.

    Yields:
        A SQLModel Session object that is automatically closed when done
    """
    async with AsyncSession(engine) as session:
        yield session


@asynccontextmanager
async def create_session():
    """
    Create and yield a database session using an async context manager.

    This function can be used with 'async with' syntax for database access.

    Yields:
        A SQLModel Session object that is automatically closed when done
    """
    async with AsyncSession(engine) as session:
        yield session
