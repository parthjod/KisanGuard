"""Application Lifespan: Load all 3 ML models into memory and warm up caches at startup."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI

from app.config import settings
from app.ml.model1_wbgt.loader import load_wbgt_model
from app.ml.model2_cdhi_csyr.loader import load_cdhi_model
from app.ml.model3_irrigation.loader import load_irrigation_models
from app.services.irrigation_service import IrrigationService
from app.utils.geo import load_ward_data

logger = logging.getLogger(__name__)


def _find_models_dir() -> Path:
    """Finds the models directory across local dev, tests, and Docker container."""
    candidates = [
        Path("models"),
        Path("../models"),
        Path("/app/models"),
        Path(__file__).resolve().parent.parent.parent / "models",
    ]
    for c in candidates:
        if c.exists() and (c / "model1_wbgt").exists():
            return c
    return candidates[-1]


async def _warmup_models(state: Any) -> None:
    """Runs a single sanity forward pass per model during startup to ensure no runtime errors."""
    logger.info("warming_up_models_started")

    # Warmup Model 1
    try:
        if hasattr(state, "model1") and state.model1:
            from app.ml.model1_wbgt.ensemble import ensemble_predict
            dummy_feats = {col: 25.0 for col in state.model1.feature_cols}
            wbgt, conf = ensemble_predict(state.model1, dummy_feats)
            logger.info("model1_warmup_ok", wbgt=wbgt, conf=conf)
    except Exception as e:
        logger.warning("model1_warmup_failed", error=str(e))

    # Warmup Model 2
    try:
        if hasattr(state, "model2") and state.model2:
            import numpy as np
            from app.ml.model2_cdhi_csyr.postprocess import run_classifier, run_regressor
            dummy_vec = np.zeros((1, len(state.model2.feature_cols)))
            prob = run_classifier(state.model2.classifier, dummy_vec)
            loss = run_regressor(state.model2.regressor, dummy_vec)
            logger.info("model2_warmup_ok", prob=prob, loss=loss)
    except Exception as e:
        logger.warning("model2_warmup_failed", error=str(e))

    # Warmup Model 3
    try:
        if hasattr(state, "model3") and state.model3:
            import numpy as np
            from app.ml.model3_irrigation.inference import run_ppo_inference
            default_m = state.model3.models.get("default")
            dummy_obs = np.zeros(state.model3.obs_dim)
            act_idx, act_mm = run_ppo_inference(default_m, dummy_obs, state.model3.action_depths_mm)
            logger.info("model3_warmup_ok", act_idx=act_idx, act_mm=act_mm)
    except Exception as e:
        logger.warning("model3_warmup_failed", error=str(e))

    logger.info("warming_up_models_complete")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan manager.
    Preloads all 3 models and static geographic data at startup.
    """
    logger.info("kisanguard_startup_commencing", version=settings.APP_VERSION)
    models_dir = _find_models_dir()
    logger.info("models_directory_located", path=str(models_dir))

    # 1. Load Ward Geodata into in-memory LRU
    try:
        load_ward_data()
        logger.info("ward_geodata_loaded")
    except Exception as e:
        logger.warning("ward_geodata_load_failed", error=str(e))

    # 2. Model 1: WBGT (XGBoost + LSTM)
    try:
        m1_dir = models_dir / "model1_wbgt" / "artifacts"
        app.state.model1 = await load_wbgt_model(
            xgb_path=str(m1_dir / "xgbt_xgb.json"),
            lstm_path=str(m1_dir / "wbgt_lstm.keras"),
            preprocessor_path=str(m1_dir / "wbgt_preprocessor.pkl"),
            feature_cols_path=str(m1_dir / "wbgt_feature_cols.json"),
        )
        logger.info("model1_wbgt_loaded")
    except Exception as e:
        logger.error("model1_wbgt_load_failed", error=str(e))
        app.state.model1 = None

    # 3. Model 2: CDHI / CSYR (Calibrated Classifier + Regressor)
    try:
        m2_dir = models_dir / "model2_cdhi_csyr" / "artifacts"
        app.state.model2 = await load_cdhi_model(
            clf_path=str(m2_dir / "kisanguard_clf_calibrated.pkl"),
            reg_path=str(m2_dir / "kisanguard_reg_xgb.json"),
            encoders_path=str(m2_dir / "label_encoders.pkl"),
            feature_cols_path=str(m2_dir / "feature_cols.json"),
        )
        logger.info("model2_cdhi_loaded")
    except Exception as e:
        logger.error("model2_cdhi_load_failed", error=str(e))
        app.state.model2 = None

    # 4. Model 3: PPO Irrigation Variants
    try:
        m3_dir = models_dir / "model3_irrigation" / "artifacts"
        app.state.model3 = await load_irrigation_models(
            artifacts_dir=m3_dir,
            manifest_path=str(m3_dir / "model3_manifest.json"),
            config_path=str(m3_dir / "training_config.json"),
        )
        # Set on service singleton as well
        IrrigationService._bundle = app.state.model3
        logger.info("model3_irrigation_loaded")
    except Exception as e:
        logger.error("model3_irrigation_load_failed", error=str(e))
        app.state.model3 = None

    # 5. Sanity Warmup
    await _warmup_models(app.state)

    logger.info("kisanguard_startup_complete")

    yield

    # Clean-up on shutdown
    logger.info("kisanguard_shutdown_complete")
