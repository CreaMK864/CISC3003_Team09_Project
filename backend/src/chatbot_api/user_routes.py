"""
User management routes for the Chatbot API.

This module contains all the endpoints related to user profile management and user operations.
"""

import datetime
from typing import Any
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlmodel.ext.asyncio.session import AsyncSession

from chatbot_api.auth import UserInfo, get_current_user
from chatbot_api.config import AVAILABLE_MODELS, is_valid_model
from chatbot_api.database import User, get_session


router = APIRouter(prefix="/users", tags=["users"])


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
    def validate_model(cls, v: Any) -> str:
        if v is not None and not is_valid_model(v):
            raise ValueError(f"Invalid model. Available models: {', '.join(AVAILABLE_MODELS)}")
        return v


@router.get("/profile")
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


@router.get("/{user_id}", response_model=User)
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


@router.patch("/{user_id}", response_model=User)
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