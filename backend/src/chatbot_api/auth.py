"""
Authentication module for Supabase JWT verification.

This module provides a FastAPI dependency for validating Supabase-issued JWT tokens.
It implements token extraction, verification, and user information retrieval from JWTs.
"""

import os
from typing import Annotated, TypedDict

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# Security scheme for Bearer token authentication
security = HTTPBearer()


class UserInfo(TypedDict):
    """
    Type definition for user information extracted from JWT token.

    Attributes:
        id: The user's unique identifier
        email: The user's email address
        claims: Additional user metadata from the token
    """

    id: str
    email: str
    claims: dict


class SupabaseAuth:
    """
    Class for handling Supabase authentication and JWT verification.
    """

    @staticmethod
    async def get_current_user(
        credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    ) -> UserInfo:
        """
        Verify the JWT token and extract user information.

        Args:
            credentials: HTTP Authorization credentials containing the JWT token

        Returns:
            A UserInfo dictionary containing the user's information extracted from the token

        Raises:
            HTTPException: If the token is invalid or verification fails
        """
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing authorization credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = credentials.credentials

        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )

            # Extract user information from the token
            user_id = payload.get("sub")
            email = payload.get("email")

            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid user information in token",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Return user information from the token as a TypedDict
            return UserInfo(
                id=user_id,
                email=email or "",  # Ensure email is not None
                claims=payload.get("user_metadata", {}),
            )

        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token or signature",
                headers={"WWW-Authenticate": "Bearer"},
            )


# Export the dependency for use in FastAPI routes
get_current_user = SupabaseAuth.get_current_user
