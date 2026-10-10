"""Load WBGT model artifacts: XGBoost + LSTM + preprocessor."""

from __future__ import annotations

import json
import logging
import pickle
from pathlib import Path
from typing import Any, NamedTuple

import numpy as np

logger = logging.getLogger(__name__)


class WBGTModelBundle(NamedTuple):
    xgb_model: Any          # xgboost.Booster
    lstm_model: Any          # keras Model
    preprocessor: Any        # sklearn scaler
    feature_cols: list[str]  # ordered feature column names
    metadata: dict           # version info, ensemble weights
    xgb_weight: float        # ensemble weight for XGBoost
    lstm_weight: float       # ensemble weight for LSTM
    sequence_length: int     # LSTM sequence length


async def load_wbgt_model(
    xgb_path: str,
    lstm_path: str,
    preprocessor_path: str,
    feature_cols_path: str,
    metadata_path: str | None = None,
) -> WBGTModelBundle:
    """
    Load all Model 1 artifacts into memory.
    Called once at app startup via lifespan.py.
    """
    base = Path(xgb_path).parent.parent.parent  # navigate up to KisanGuard root

    # Feature columns (ground truth for column order)
    fc_path = Path(feature_cols_path) if Path(feature_cols_path).is_absolute() else Path(feature_cols_path)
    with open(fc_path, "r") as f:
        feature_cols = json.load(f)
    logger.info("wbgt_feature_cols_loaded", count=len(feature_cols))

    # Metadata
    meta_path = metadata_path or str(Path(xgb_path).parent / "wbgt_metadata.json")
    with open(meta_path, "r") as f:
        metadata = json.load(f)

    # Parse ensemble weights from metadata
    ensemble_str = metadata.get("ensemble", "0.7 XGBoost + 0.3 LSTM")
    parts = ensemble_str.split("+")
    xgb_weight = float(parts[0].strip().split()[0])
    lstm_weight = float(parts[1].strip().split()[0])
    sequence_length = metadata.get("sequence_length", 24)

    # XGBoost model
    import xgboost as xgb
    xgb_model = xgb.Booster()
    xgb_model.load_model(xgb_path)
    logger.info("wbgt_xgb_loaded", path=xgb_path)

    # LSTM model (TensorFlow/Keras)
    try:
        import tensorflow as tf
        lstm_model = tf.keras.models.load_model(lstm_path, compile=False)
        logger.info("wbgt_lstm_loaded", path=lstm_path)
    except Exception as e:
        logger.warning("wbgt_lstm_load_failed", error=str(e))
        lstm_model = None

    # Preprocessor (sklearn scaler)
    with open(preprocessor_path, "rb") as f:
        preprocessor = pickle.load(f)
    logger.info("wbgt_preprocessor_loaded", path=preprocessor_path)

    return WBGTModelBundle(
        xgb_model=xgb_model,
        lstm_model=lstm_model,
        preprocessor=preprocessor,
        feature_cols=feature_cols,
        metadata=metadata,
        xgb_weight=xgb_weight,
        lstm_weight=lstm_weight,
        sequence_length=sequence_length,
    )
