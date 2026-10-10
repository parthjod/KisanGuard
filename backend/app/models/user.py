"""Pydantic v2 schemas for user entities."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class UserRole(str, Enum):
    WORKER = "WORKER"
    FARMER = "FARMER"
    FPO_MANAGER = "FPO_MANAGER"
    EMPLOYER = "EMPLOYER"
    ADMIN = "ADMIN"


class WorkIntensity(str, Enum):
    LIGHT = "LIGHT"
    MODERATE = "MODERATE"
    HEAVY = "HEAVY"


class SubscriptionTier(str, Enum):
    FREE = "FREE"
    PRO = "PRO"
    ENTERPRISE = "ENTERPRISE"
    COOPERATIVE = "COOPERATIVE"


class UserStatus(str, Enum):
    ACTIVE = "ACTIVE"
    ERASED = "ERASED"


class UserCreate(BaseModel):
    cognito_sub: str
    name: str
    role: UserRole
    phone: str = Field(..., pattern=r"^\+91\d{10}$")
    language: str = "hi"
    ward_id: str | None = None
    plot_id: str | None = None
    employer_id: str | None = None
    org_id: str
    crops: list[str] = Field(default_factory=list)
    work_intensity: WorkIntensity = WorkIntensity.MODERATE
    subscription_tier: SubscriptionTier = SubscriptionTier.FREE
    consent_given: bool = True
    consent_timestamp: datetime
    opt_out_until: datetime | None = None


class UserUpdate(BaseModel):
    language: str | None = None
    ward_id: str | None = None
    plot_id: str | None = None
    crops: list[str] | None = None
    work_intensity: WorkIntensity | None = None
    subscription_tier: SubscriptionTier | None = None
    opt_out_until: datetime | None = None
    consent_given: bool | None = None
    consent_timestamp: datetime | None = None


class UserResponse(BaseModel):
    user_id: str
    status: UserStatus
    alert_channel: str | None = None


class UserProfile(BaseModel):
    user_id: str
    cognito_sub: str | None = None
    name: str | None = None
    role: UserRole
    phone: str | None = None
    language: str
    ward_id: str | None = None
    plot_id: str | None = None
    employer_id: str | None = None
    org_id: str
    crops: list[str] = Field(default_factory=list)
    work_intensity: WorkIntensity
    subscription_tier: SubscriptionTier
    alert_counts_today: dict[str, int] = Field(default_factory=lambda: {"RED": 0, "CAUTION": 0})
    opt_out_until: datetime | None = None
    pinpoint_endpoint_arn: str | None = None
    consent_given: bool
    consent_timestamp: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    status: UserStatus = UserStatus.ACTIVE


class UserErasureResponse(BaseModel):
    user_id: str
    status: str = "ERASED"
    erased_at: datetime
    audit_retained: bool = True
