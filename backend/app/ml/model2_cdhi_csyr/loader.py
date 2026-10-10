"""Load CDHI/CSYR model artifacts: calibrated classifier + regressor + label encoders."""

from __future__ import annotations

import json
import logging
import pickle
from pathlib import Path
from typing import Any, NamedTuple

logger = logging.getLogger(__name__)


class CDHIModelBundle(NamedTuple):
    clf_calibrated: Any       # CalibratedClassifierCV
    reg_xgb: Any              # xgboost.Booster (regressor)
    label_encoders: dict      # {"crop": LabelEncoder, "stage": LabelEncoder, ...}
    feature_cols: list[str]   # ordered feature column names
    metadata: dict            # version info, thresholds


async def load_cdhi_model(
    clf_path: str,
    reg_path: str,
    encoders_path: str,
    feature_cols_path: str,
    metadata_path: str | None = None,
) -> CDHIModelBundle:
    """
    Load all Model 2 artifacts into memory.
    Called once at app startup via lifespan.py.
    """
    # Feature columns (ground truth for column order — never reorder)
    with open(feature_cols_path, "r") as f:
        feature_cols = json.load(f)
    logger.info("cdhi_feature_cols_loaded", count=len(feature_cols))

    # Calibrated classifier (use this, not raw XGB)
    with open(clf_path, "rb") as f:
        clf_calibrated = pickle.load(f)
    logger.info("cdhi_clf_calibrated_loaded", path=clf_path)

    # Regressor (yield-loss % prediction)
    import xgboost as xgb
    reg_xgb = xgb.Booster()
    reg_xgb.load_model(reg_path)
    logger.info("cdhi_reg_xgb_loaded", path=reg_path)

    # Label encoders (crop_type, crop_stage, state)
    with open(encoders_path, "rb") as f:
        label_encoders = pickle.load(f)
    logger.info("cdhi_label_encoders_loaded", keys=list(label_encoders.keys()) if isinstance(label_encoders, dict) else "unknown")

    # Metadata
    meta_path = metadata_path or str(Path(clf_path).parent / "model_metadata.json")
    with open(meta_path, "r") as f:
        metadata = json.load(f)

    return CDHIModelBundle(
        clf_calibrated=clf_calibrated,
        reg_xgb=reg_xgb,
        label_encoders=label_encoders,
        feature_cols=feature_cols,
        metadata=metadata,
    )
