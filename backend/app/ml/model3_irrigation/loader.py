"""Load PPO zips, parse manifest, select model at startup."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, NamedTuple

logger = logging.getLogger(__name__)


class IrrigationModelBundle(NamedTuple):
    models: dict[str, Any]          # scenario → loaded PPO model
    manifest: dict                   # model3_manifest.json
    training_config: dict            # training_config.json
    action_depths_mm: list[float]    # action space: mm of irrigation
    obs_dim: int                     # observation dimension


async def load_irrigation_models(
    artifacts_dir: Path | str,
    manifest_path: str,
    config_path: str,
) -> IrrigationModelBundle:
    """
    Load all 5 PPO model variants at startup.
    Reads manifest for scenario→zip mapping, training_config for state/action spec.
    """
    artifacts_dir = Path(artifacts_dir)

    # Load manifest
    with open(manifest_path, "r") as f:
        manifest = json.load(f)
    logger.info("irrigation_manifest_loaded")

    # Load training config
    with open(config_path, "r") as f:
        training_config = json.load(f)
    logger.info("irrigation_config_loaded")

    obs_dim = training_config.get("obs_dim", manifest.get("observation_dimension", 28))
    action_depths_mm = training_config.get("actions_mm", manifest.get("action_depths_mm_gross", [0, 10, 20, 30, 40, 50, 60, 80]))

    # Load PPO models — maps scenario name → loaded model
    models: dict[str, Any] = {}
    scenario_zip_map = {
        "default": "model3_ppo_final.zip",
        "final": "model3_ppo_final.zip",
        "compound": "model3_ppo_compound.zip",
        "drought": "model3_ppo_drought.zip",
        "heatwave": "model3_ppo_heatwave.zip",
        "mixed": "model3_ppo_mixed.zip",
    }

    try:
        from sb3_contrib import MaskablePPO
        for scenario, zip_name in scenario_zip_map.items():
            zip_path = artifacts_dir / zip_name
            if zip_path.exists():
                model = MaskablePPO.load(str(zip_path))
                models[scenario] = model
                logger.info("ppo_model_loaded", scenario=scenario, path=str(zip_path))
            else:
                logger.warning("ppo_model_missing", scenario=scenario, path=str(zip_path))
    except ImportError:
        logger.warning("sb3_contrib_not_available — PPO models will use mock inference")
    except Exception as e:
        logger.error("ppo_model_load_error", error=str(e))

    return IrrigationModelBundle(
        models=models,
        manifest=manifest,
        training_config=training_config,
        action_depths_mm=action_depths_mm,
        obs_dim=obs_dim,
    )
