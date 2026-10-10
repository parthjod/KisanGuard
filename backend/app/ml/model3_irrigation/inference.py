"""Run PPO policy, decode action (IRRIGATE/WAIT + litres)."""

from __future__ import annotations

import logging
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


def select_ppo_model(
    cdhi_score: float,
    spi_3: float,
    tmax_c: float,
    manifest: dict,
) -> str:
    """
    Select which PPO model variant to use based on current conditions.
    Returns scenario key (e.g., 'compound', 'drought', 'heatwave', 'mixed', 'default').
    """
    is_heat = tmax_c > 35.0
    is_drought = spi_3 < -1.0

    if is_heat and is_drought:
        return "compound"
    if is_drought and not is_heat:
        return "drought"
    if is_heat and not is_drought:
        return "heatwave"
    if cdhi_score > 40:
        return "mixed"
    return "default"


def run_ppo_inference(
    model: Any,
    state: np.ndarray,
    action_depths_mm: list[float],
) -> tuple[int, float]:
    """
    Run PPO policy forward pass.
    Returns (action_index, raw_action_mm).

    action_index: 0=WAIT (0mm), 1-7=IRRIGATE with increasing depth
    """
    try:
        if model is not None:
            obs = state.reshape(1, -1) if state.ndim == 1 else state
            action, _ = model.predict(obs, deterministic=True)
            action_idx = int(action[0]) if hasattr(action, '__len__') else int(action)
            action_mm = action_depths_mm[action_idx] if action_idx < len(action_depths_mm) else 0.0
            return action_idx, action_mm
        else:
            # Fallback: heuristic based on state
            return _heuristic_action(state, action_depths_mm)
    except Exception as e:
        logger.error("ppo_inference_failed", error=str(e))
        return _heuristic_action(state, action_depths_mm)


def _heuristic_action(state: np.ndarray, action_depths_mm: list[float]) -> tuple[int, float]:
    """Fallback heuristic when PPO model is unavailable."""
    soil_moisture = state[0] * 100  # denormalize
    cdhi = state[2] * 100  # denormalize

    if soil_moisture < 30 or cdhi > 60:
        # Irrigate with medium depth
        idx = min(4, len(action_depths_mm) - 1)
        return idx, action_depths_mm[idx]
    elif soil_moisture < 45:
        idx = min(2, len(action_depths_mm) - 1)
        return idx, action_depths_mm[idx]
    return 0, 0.0


def decode_action(
    action_idx: int,
    action_mm: float,
    plot_area_ha: float,
) -> tuple[str, int]:
    """
    Decode PPO action:
      action_idx 0 → WAIT
      action_idx 1-7 → IRRIGATE with litres = action_mm × plot_area_ha × 10

    Returns (action_str, litres).
    Conversion: 1mm over 1ha = 10,000 litres = 10 m³
    """
    if action_idx == 0 or action_mm <= 0:
        return "WAIT", 0

    # Convert mm to litres for given plot area
    litres = int(action_mm * plot_area_ha * 10000 / 1000)  # mm × ha → m³ → litres (×1000)
    # Actually: 1mm on 1ha = 10m³ = 10,000 litres
    litres = int(action_mm * plot_area_ha * 10)  # m³
    litres_actual = litres * 1000  # convert to litres

    # Reasonable clamp
    litres_actual = max(100, min(50000, litres_actual))

    return "IRRIGATE", litres_actual
