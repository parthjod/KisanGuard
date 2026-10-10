"""KisanGuard error hierarchy — structured errors for all failure modes."""

from __future__ import annotations


class KisanGuardError(Exception):
    """Base error for all KisanGuard backend exceptions."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 500,
        extra: dict | None = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.extra = extra or {}
        super().__init__(message)


class WardNotFoundError(KisanGuardError):
    def __init__(self, ward_id: str):
        super().__init__("WARD_NOT_FOUND", f"Ward {ward_id} not found", 404)


class PlotNotFoundError(KisanGuardError):
    def __init__(self, plot_id: str):
        super().__init__("PLOT_NOT_FOUND", f"Plot {plot_id} not found", 404)


class UserNotFoundError(KisanGuardError):
    def __init__(self, user_id: str):
        super().__init__("USER_NOT_FOUND", f"User {user_id} not found", 404)


class DataStaleError(KisanGuardError):
    def __init__(self, last_data_at: str):
        super().__init__(
            "DATA_STALE",
            "Latest data is stale. Using cached forecast.",
            206,
            {"last_data_at": last_data_at},
        )


class ModelUnavailableError(KisanGuardError):
    def __init__(self, model: str):
        super().__init__(
            "MODEL_UNAVAILABLE",
            f"Inference failed for {model}. Retrying.",
            503,
        )


class AlertFatigueLimitError(KisanGuardError):
    def __init__(self, severity: str):
        super().__init__(
            "ALERT_FATIGUE_LIMIT",
            f"Daily {severity} alert cap reached for this user.",
            429,
        )


class ConsentRequiredError(KisanGuardError):
    def __init__(self):
        super().__init__(
            "CONSENT_REQUIRED",
            "User consent required before alerts can be sent.",
            403,
        )


class CropNotSupportedError(KisanGuardError):
    def __init__(self, crop: str):
        super().__init__(
            "CROP_NOT_SUPPORTED",
            f"Crop '{crop}' is not supported. Supported: wheat, rice, maize, sorghum, millet.",
            400,
        )


class InvalidParameterError(KisanGuardError):
    def __init__(self, param: str, detail: str):
        super().__init__(
            "INVALID_PARAMETER",
            f"Invalid parameter '{param}': {detail}",
            400,
        )
