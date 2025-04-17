"""
Tests for the verify_conversation_access function.
"""

import uuid
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from chatbot_api.auth import UserInfo
from chatbot_api.config import DEFAULT_MODEL
from chatbot_api.database import Conversation
from chatbot_api.main import verify_conversation_access


@pytest.fixture
def test_user():
    return UserInfo(id=str(uuid.uuid4()), email="test@example.com", claims={"name": "Test User"})


@pytest.fixture
def test_session():
    return AsyncMock(spec=AsyncSession)


@pytest.mark.asyncio
async def test_verify_access_with_valid_conversation(test_user, test_session):
    # Create a test conversation that belongs to the user
    user_id = uuid.UUID(test_user["id"])
    test_conversation = Conversation(id=1, user_id=user_id, title="Test Conversation", model=DEFAULT_MODEL)

    test_session.get.return_value = test_conversation

    result = await verify_conversation_access(1, test_user, test_session)

    assert result == test_conversation
    test_session.get.assert_called_once_with(Conversation, 1)


@pytest.mark.asyncio
async def test_verify_access_with_nonexistent_conversation(test_user, test_session):
    test_session.get.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        await verify_conversation_access(999, test_user, test_session)

    assert exc_info.value.status_code == 404
    assert "Conversation not found" in exc_info.value.detail
    test_session.get.assert_called_once_with(Conversation, 999)


@pytest.mark.asyncio
async def test_verify_access_with_unauthorized_conversation(test_user, test_session):
    # Create a test conversation that belongs to another user
    other_user_id = uuid.uuid4()
    test_conversation = Conversation(
        id=1, user_id=other_user_id, title="Other User's Conversation", model=DEFAULT_MODEL
    )

    test_session.get.return_value = test_conversation

    with pytest.raises(HTTPException) as exc_info:
        await verify_conversation_access(1, test_user, test_session)

    assert exc_info.value.status_code == 404
    assert "Conversation not found" in exc_info.value.detail
    test_session.get.assert_called_once_with(Conversation, 1)
