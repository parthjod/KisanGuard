"""Script: Pre-load all 3 ML models and run verification sanity checks."""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from app.lifespan import _find_models_dir, _warmup_models
from app.ml.model1_wbgt.loader import load_wbgt_model
from app.ml.model2_cdhi_csyr.loader import load_cdhi_model
from app.ml.model3_irrigation.loader import load_irrigation_models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("warm_models")


class MockAppState:
    pass


async def main():
    logger.info("Initializing model pre-load sanity check...")
    models_dir = _find_models_dir()
    logger.info(f"Using models directory: {models_dir}")

    state = MockAppState()

    # Model 1
    m1_dir = models_dir / "model1_wbgt" / "artifacts"
    state.model1 = await load_wbgt_model(
        xgb_path=str(m1_dir / "xgbt_xgb.json"),
        lstm_path=str(m1_dir / "wbgt_lstm.keras"),
        preprocessor_path=str(m1_dir / "wbgt_preprocessor.pkl"),
        feature_cols_path=str(m1_dir / "wbgt_feature_cols.json"),
    )
    logger.info("Model 1 (WBGT) successfully initialized.")

    # Model 2
    m2_dir = models_dir / "model2_cdhi_csyr" / "artifacts"
    state.model2 = await load_cdhi_model(
        clf_path=str(m2_dir / "kisanguard_clf_calibrated.pkl"),
        reg_path=str(m2_dir / "kisanguard_reg_xgb.json"),
        encoders_path=str(m2_dir / "label_encoders.pkl"),
        feature_cols_path=str(m2_dir / "feature_cols.json"),
    )
    logger.info("Model 2 (CDHI) successfully initialized.")

    # Model 3
    m3_dir = models_dir / "model3_irrigation" / "artifacts"
    state.model3 = await load_irrigation_models(
        artifacts_dir=m3_dir,
        manifest_path=str(m3_dir / "model3_manifest.json"),
        config_path=str(m3_dir / "training_config.json"),
    )
    logger.info("Model 3 (Irrigation) successfully initialized.")

    await _warmup_models(state)
    logger.info("ALL 3 ML MODELS VERIFIED AND WARMED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(main())
