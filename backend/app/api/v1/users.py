"""API Route: Users CRUD & DPDP Act 2023 Erasure (/v1/users)."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Path, status

from app.dependencies import get_current_user
from app.models.user import (
    DPDPErasureResponse,
    UserCreateRequest,
    UserCreateResponse,
    UserProfileResponse,
    UserUpdateRequest,
)
from app.services.user_service import user_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/users", response_model=UserCreateResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserCreateRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> Any:
    """
    Registers a worker or farmer, captures DPDP consent, encrypts PII via AWS KMS,
    and returns generated user_id with primary alert channel.
    """
    result = await user_service.create_user(payload.model_dump())
    return result


@router.get("/users/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: str = Path(..., description="User identifier e.g. usr_abc123"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Any:
    """
    Fetches full user profile with PII decrypted from KMS.
    Requires matching Cognito subject or admin authorization.
    """
    profile = await user_service.get_user(user_id)
    return profile


@router.patch("/users/{user_id}", response_model=UserProfileResponse)
async def update_user_profile(
    payload: UserUpdateRequest,
    user_id: str = Path(..., description="User identifier e.g. usr_abc123"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Any:
    """
    Updates user settings, language, location, opt-out status, or consent.
    """
    updates = payload.model_dump(exclude_unset=True)
    updated = await user_service.update_user(user_id, updates)
    return updated


@router.delete("/users/{user_id}", response_model=DPDPErasureResponse)
async def erase_user_pii(
    user_id: str = Path(..., description="User identifier e.g. usr_abc123"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Any:
    """
    DPDP Act 2023 Right to Erasure:
    Overwrites all PII in DynamoDB with ERASED tokens, cancels alert subscriptions,
    and retains anonymized records for the 7-year legal compliance audit window.
    """
    erasure = await user_service.erase_user(user_id)
    return erasure
