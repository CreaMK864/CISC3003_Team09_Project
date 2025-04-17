"""
Tests for the authentication module of the chatbot API.
"""

import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from jose import jwt

from chatbot_api.auth import UserInfo, get_current_user


@pytest.fixture
def valid_token():
    """Create a valid JWT token for testing."""
    test_secret = "test_secret"
    payload = {
        "sub": "user123",
        "email": "test@example.com",
        "user_metadata": {"name": "Test User"},
        "aud": "authenticated",
    }
    return jwt.encode(payload, test_secret, algorithm="HS256")


@pytest.fixture
def invalid_token():
    """Create an invalid JWT token for testing."""
    return "invalid.token.string"


@pytest.mark.asyncio
async def test_valid_token_authentication(valid_token):
    """Test authentication with a valid token."""
    with patch("chatbot_api.auth.SUPABASE_JWT_SECRET", "test_secret"):
        mock_credentials = MagicMock()
        mock_credentials.credentials = valid_token

        user_info = await get_current_user(mock_credentials)

        assert user_info["id"] == "user123"
        assert user_info["email"] == "test@example.com"
        assert user_info["claims"] == {"name": "Test User"}


@pytest.mark.asyncio
async def test_invalid_token_authentication(invalid_token):
    """Test authentication with an invalid token."""
    with patch("chatbot_api.auth.SUPABASE_JWT_SECRET", "test_secret"):
        mock_credentials = MagicMock()
        mock_credentials.credentials = invalid_token

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(mock_credentials)

        assert exc_info.value.status_code == 401
        assert "Invalid token or signature" in exc_info.value.detail


@pytest.mark.asyncio
async def test_missing_credentials():
    """Test authentication with missing credentials."""
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(None)

    assert exc_info.value.status_code == 401
    assert "Missing authorization credentials" in exc_info.value.detail
