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

import os
import datetime
from enum import Enum

from dotenv import load_dotenv
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

load_dotenv()
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost/chatbot"
)
engine = create_async_engine(DATABASE_URL, echo=True, future=True)


class Role(str, Enum):
    """Enum representing the possible roles in a conversation."""
    USER = "user"
    BOT = "bot"


class User(SQLModel, table=True):
    """
    SQLModel representing a user in the system.
    
    Attributes:
        id: Primary key identifier for the user
        email: User's email address (unique, indexed)
        display_name: User's display name
        profile_picture_url: URL to the user's profile picture
        password_hash: Hashed version of the user's password
        last_selected_model: The model the user last selected
        created_at: Timestamp when the user was created
        updated_at: Timestamp when the user was last updated
        conversations: Relationship to the user's conversations
    """
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    display_name: str
    profile_picture_url: str | None = None
    password_hash: str | None = None
    last_selected_model: str = "gpt-4.1-nano"
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.now(datetime.UTC))
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.now(datetime.UTC))

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
    user_id: int = Field(foreign_key="user.id")
    title: str = "New Conversation"
    model: str = "gpt-4.1-nano"
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.now(datetime.UTC))
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.now(datetime.UTC))

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
    conversation_id: int = Field(foreign_key="conversation.id")
    role: Role  # Enum for message sender role
    content: str
    timestamp: datetime.datetime = Field(default_factory=datetime.datetime.now(datetime.UTC))

    conversation: Conversation = Relationship(back_populates="messages")


async def delete_all_tables():
    """
    Delete all tables in the database.
    """
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


async def create_db_and_tables():
    """
    Create all database tables if they don't exist.
    
    This function should be called when the application starts.
    """
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def get_session():
    """
    Create and yield a database session.
    
    This function is used as a FastAPI dependency for database access.
    
    Yields:
        A SQLModel Session object that is automatically closed when done
    """
    async with AsyncSession(engine) as session:
        yield session
