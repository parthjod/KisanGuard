"""KisanGuard Backend — All settings via pydantic-settings. Zero hardcoded secrets."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    # ── App ──────────────────────────────────────────────────────────────
    APP_VERSION: str = "2.0.0"
    AWS_REGION: str = "ap-south-1"
    LOG_LEVEL: str = "INFO"

    # ── S3 ───────────────────────────────────────────────────────────────
    S3_BUCKET: str = "kisanguard-data-ap-south-1"
    S3_FEATURE_CACHE_TTL_MINUTES: int = 60

    # ── DynamoDB ─────────────────────────────────────────────────────────
    DYNAMO_USERS_TABLE: str = "kisanguard-users"
    DYNAMO_FEATURES_TABLE: str = "kisanguard-features"
    DYNAMO_AUDIT_TABLE: str = "kisanguard-audit"
    DYNAMO_ALERTS_TABLE: str = "kisanguard-alerts"
    DYNAMO_PIPELINE_TABLE: str = "kisanguard-pipeline-status"
    DYNAMO_CALENDARS_TABLE: str = "kisanguard-crop-calendars"

    # ── Timestream ───────────────────────────────────────────────────────
    TIMESTREAM_DB: str = "kisanguard"
    TIMESTREAM_TABLE: str = "wbgt-forecasts"

    # ── Cognito ──────────────────────────────────────────────────────────
    COGNITO_USER_POOL_ID: str = "ap-south-1_XXXXXXXXX"
    COGNITO_CLIENT_ID: str = "xxxxxxxxxxxxxxxxxxxxxxxxxx"
    COGNITO_JWKS_URL: str = (
        "https://cognito-idp.ap-south-1.amazonaws.com/"
        "ap-south-1_XXXXXXXXX/.well-known/jwks.json"
    )

    # ── SageMaker (fallback endpoints) ───────────────────────────────────
    SAGEMAKER_WBGT_ENDPOINT: str = "kisanguard-wbgt-v1"
    SAGEMAKER_CDHI_ENDPOINT: str = "kisanguard-cdhi-csyr-v2"

    # ── Bedrock ──────────────────────────────────────────────────────────
    BEDROCK_MODEL_ID: str = "meta.llama3-8b-instruct-v1:0"
    BEDROCK_MAX_TOKENS: int = 150
    BEDROCK_TEMPERATURE: float = 0.3

    # ── Trust layer ──────────────────────────────────────────────────────
    CONFIDENCE_THRESHOLD: float = 0.85
    MISSING_DATA_THRESHOLD: float = 0.10
    WBGT_MIN_C: float = 5.0
    WBGT_MAX_C: float = 50.0

    # ── A2I ──────────────────────────────────────────────────────────────
    A2I_FLOW_ARN: str = "arn:aws:sagemaker:ap-south-1:000000000000:flow-definition/kisanguard-review"
    A2I_OUTPUT_S3_PREFIX: str = "a2i/"
    A2I_RED_SLA_MINUTES: int = 15
    A2I_OTHER_SLA_MINUTES: int = 120

    # ── Step Functions ───────────────────────────────────────────────────
    STEP_FUNCTIONS_ALERT_PIPELINE_ARN: str = (
        "arn:aws:states:ap-south-1:000000000000:stateMachine:kisanguard-alert-pipeline"
    )
    STEP_FUNCTIONS_RETRAIN_PIPELINE_ARN: str = (
        "arn:aws:states:ap-south-1:000000000000:stateMachine:kisanguard-retrain-pipeline"
    )

    # ── Alert delivery ───────────────────────────────────────────────────
    SNS_ORIGINATION_NUMBER: str = "+910000000000"
    PINPOINT_APP_ID: str = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    SNS_OPS_TOPIC_ARN: str = "arn:aws:sns:ap-south-1:000000000000:kisanguard-ops"

    # ── Alert fatigue ────────────────────────────────────────────────────
    MAX_RED_ALERTS_PER_DAY: int = 1
    MAX_CAUTION_ALERTS_PER_DAY: int = 3

    # ── KMS ──────────────────────────────────────────────────────────────
    KMS_CMK_ARN: str = "arn:aws:kms:ap-south-1:000000000000:key/00000000-0000-0000-0000-000000000000"

    # ── Partner webhooks ─────────────────────────────────────────────────
    PARTNER_KEY_SECRET_NAME: str = "kisanguard/partner-keys"

    # ── MLOps ────────────────────────────────────────────────────────────
    SAGEMAKER_MODEL_REGISTRY_GROUP: str = "kisanguard-models"

    # ── Local dev ────────────────────────────────────────────────────────
    USE_LOCAL_MODELS: bool = True
    LOCALSTACK_ENDPOINT: str | None = None


settings = Settings()
