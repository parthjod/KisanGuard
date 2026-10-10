"""Post-processing for Model 2: classifier + regressor outputs → risk category."""

from __future__ import annotations

import logging
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


def run_classifier(clf_calibrated: Any, features: np.ndarray) -> tuple[float, int]:
    """
    Run calibrated classifier.
    Returns (probability_of_high_risk, predicted_class).
    """
    try:
        features_2d = features.reshape(1, -1)
        prob = clf_calibrated.predict_proba(features_2d)
        # Binary: prob[:, 1] is probability of high risk
        high_risk_prob = float(prob[0, 1]) if prob.shape[1] > 1 else float(prob[0, 0])
        predicted_class = int(clf_calibrated.predict(features_2d)[0])
        return round(high_risk_prob, 4), predicted_class
    except Exception as e:
        logger.error("clf_inference_failed", error=str(e))
        return 0.5, 0


def run_regressor(reg_xgb: Any, features: np.ndarray) -> float:
    """
    Run yield-loss regressor.
    Returns estimated yield loss percentage.
    """
    try:
        import xgboost as xgb
        dmatrix = xgb.DMatrix(features.reshape(1, -1))
        pred = reg_xgb.predict(dmatrix)
        loss_pct = float(pred[0])
        # Clamp to [0, 100]
        return round(max(0.0, min(100.0, loss_pct)), 2)
    except Exception as e:
        logger.error("reg_inference_failed", error=str(e))
        return 0.0


def categorize_yield_risk(high_risk_prob: float) -> str:
    """
    Categorize yield risk:
      LOW:    prob < 0.30
      MEDIUM: 0.30 – 0.59
      HIGH:   ≥ 0.60
    """
    if high_risk_prob < 0.30:
        return "LOW"
    if high_risk_prob < 0.60:
        return "MEDIUM"
    return "HIGH"


def apply_stage_multiplier(loss_prob: float, stage_multiplier: float) -> float:
    """Apply crop growth stage multiplier to loss probability."""
    return round(loss_prob * stage_multiplier, 4)
