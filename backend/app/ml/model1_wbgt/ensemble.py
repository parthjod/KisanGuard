"""XGBoost + LSTM ensemble inference for WBGT prediction."""

from __future__ import annotations

import logging
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


def run_xgb_inference(xgb_model: Any, features: np.ndarray) -> float:
    """Run XGBoost prediction on a single feature vector."""
    import xgboost as xgb

    dmatrix = xgb.DMatrix(features.reshape(1, -1))
    pred = xgb_model.predict(dmatrix)
    return float(pred[0])


def run_lstm_inference(
    lstm_model: Any,
    features_sequence: np.ndarray,
    sequence_length: int = 24,
) -> float:
    """
    Run LSTM prediction.
    features_sequence: shape (sequence_length, n_features)
    """
    if lstm_model is None:
        return 0.0

    try:
        # LSTM expects (batch, sequence_length, features)
        x = features_sequence.reshape(1, sequence_length, -1)
        pred = lstm_model.predict(x, verbose=0)
        return float(pred[0][0]) if pred.ndim > 1 else float(pred[0])
    except Exception as e:
        logger.warning("lstm_inference_failed", error=str(e))
        return 0.0


def ensemble_predict(
    xgb_model: Any,
    lstm_model: Any,
    features: np.ndarray,
    features_sequence: np.ndarray | None,
    preprocessor: Any,
    xgb_weight: float = 0.7,
    lstm_weight: float = 0.3,
    sequence_length: int = 24,
) -> tuple[float, float]:
    """
    Weighted ensemble of XGBoost + LSTM.
    Returns (wbgt_predicted, confidence).

    Confidence is estimated from prediction variance between models.
    """
    # Apply preprocessor transform
    features_scaled = preprocessor.transform(features.reshape(1, -1))

    # XGBoost prediction
    xgb_pred = run_xgb_inference(xgb_model, features_scaled[0])

    # LSTM prediction
    if lstm_model is not None and features_sequence is not None:
        # Scale the sequence
        seq_scaled = preprocessor.transform(features_sequence)
        lstm_pred = run_lstm_inference(lstm_model, seq_scaled, sequence_length)
    else:
        # Fallback: XGBoost only
        lstm_pred = xgb_pred
        xgb_weight = 1.0
        lstm_weight = 0.0

    # Weighted ensemble
    ensemble_pred = xgb_weight * xgb_pred + lstm_weight * lstm_pred

    # Inverse-transform to get actual WBGT value
    # The preprocessor was fit on the feature space, not the target.
    # The ensemble output is already in the target space.
    wbgt = float(ensemble_pred)

    # Confidence estimation: based on agreement between models
    if lstm_model is not None and features_sequence is not None:
        disagreement = abs(xgb_pred - lstm_pred)
        # Higher agreement → higher confidence
        # Scale: 0 disagreement → 0.98 confidence, 5°C disagreement → 0.50
        confidence = max(0.50, min(0.98, 1.0 - disagreement / 10.0))
    else:
        # Single model, lower base confidence
        confidence = 0.85

    return round(wbgt, 2), round(confidence, 4)
