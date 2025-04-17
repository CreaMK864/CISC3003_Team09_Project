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
from enum import StrEnum

from dotenv import load_dotenv
from sqlalchemy import Column, DateTime, Text, text
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


class User(SQLModel, table=True):
    """
    SQLModel representing a user in the system.

    Attributes:
        id: Primary key identifier for the user
        display_name: User's display name
        profile_picture_url: URL to the user's profile picture
        last_selected_model: The model the user last selected
        created_at: Timestamp when the user was created
        updated_at: Timestamp when the user was last updated
        conversations: Relationship to the user's conversations
    """

    id: uuid.UUID | None = Field(default=None, primary_key=True)
    display_name: str = Field(sa_column=Column(Text), default="User")
    profile_picture_url: str | None = Field(sa_column=Column(Text))
    last_selected_model: str = Field(sa_column=Column(Text, default=DEFAULT_MODEL))
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC),
        sa_column=Column(DateTime(timezone=True), server_default=text("(now() AT TIME ZONE 'UTC')")),
    )
    updated_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC),
        sa_column=Column(DateTime(timezone=True), server_default=text("(now() AT TIME ZONE 'UTC')")),
    )

    conversations: list["Conversation"] = Relationship(back_populates="user")


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

    conversation: Conversation = Relationship(back_populates="messages")


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


async def create_db_and_tables():
    """
    Create all database tables if they don't exist.

    This function should be called when the application starts.
    """
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        # It is very difficult to set user.id to be a foreign key to auth.users.id, so we use SQL directly to do this.
        # Related discussion: https://github.com/sqlalchemy/alembic/discussions/1144
        try:
            await conn.exec_driver_sql(
                "ALTER TABLE public.user ADD CONSTRAINT fk_user_id FOREIGN KEY (id) REFERENCES auth.users (id) ON UPDATE CASCADE ON DELETE CASCADE"
            )
        except Exception as e:
            if "already exists" not in str(e):
                raise

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
