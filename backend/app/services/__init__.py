"""Services package for KisanGuard backend."""

from app.services.alert_service import AlertService, alert_service
from app.services.audit_service import AuditService, audit_service
from app.services.bedrock_service import BedrockService, bedrock_service
from app.services.cdhi_service import CDHIService
from app.services.crop_calendar_service import CropCalendarService, crop_calendar_service
from app.services.delivery_service import DeliveryService, delivery_service
from app.services.fatigue_service import FatigueService, fatigue_service
from app.services.irrigation_service import IrrigationService, irrigation_service
from app.services.org_service import OrgService, org_service
from app.services.translate_service import TranslateService, translate_service
from app.services.trust_service import TrustService, trust_service
from app.services.user_service import UserService, user_service
from app.services.wbgt_service import WBGTService

__all__ = [
    "AlertService",
    "alert_service",
    "AuditService",
    "audit_service",
    "BedrockService",
    "bedrock_service",
    "CDHIService",
    "CropCalendarService",
    "crop_calendar_service",
    "DeliveryService",
    "delivery_service",
    "FatigueService",
    "fatigue_service",
    "IrrigationService",
    "irrigation_service",
    "OrgService",
    "org_service",
    "TranslateService",
    "translate_service",
    "TrustService",
    "trust_service",
    "UserService",
    "user_service",
    "WBGTService",
]
