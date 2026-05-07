import { COLORS, FONT_FAMILY } from "./theme.js";

export const HUD_PANEL_PADDING = 12;
export const HUD_PANEL_X = 16;
export const HUD_PANEL_Y = 16;
export const HUD_PANEL_WIDTH = 324;
export const HUD_PANEL_HEIGHT = 108;
export const HUD_EXP_BAR_WIDTH = 200;
export const HUD_EXP_BAR_BASE_HEIGHT = 8;
export const HUD_EXP_BAR_START_COLOR = COLORS.XP_BAR_START;
export const HUD_EXP_BAR_END_COLOR = COLORS.XP_BAR_END;
export const HUD_EXP_PULSE_SCALE = 1.3;
export const HUD_EXP_PULSE_DURATION_MS = 120;
export const HUD_ALERT_POOL_SIZE = 3;
export const DEBUG_HUD_X = 16;
export const DEBUG_HUD_Y = 116;

export const HUD_ALERT_STYLE = Object.freeze({
  fontFamily: FONT_FAMILY,
  fontSize: "34px",
  color: COLORS.ALERT_TEXT,
  stroke: COLORS.ALERT_STROKE,
  strokeThickness: 6
});

export const HUD_COMBO_STYLE = Object.freeze({
  fontFamily: FONT_FAMILY,
  fontSize: "18px",
  color: COLORS.COMBO_TEXT,
  stroke: COLORS.COMBO_STROKE,
  strokeThickness: 4
});

export const WARNING_BANNER_STYLE = Object.freeze({
  fontFamily: FONT_FAMILY,
  fontSize: "28px",
  color: COLORS.WARNING_TEXT,
  stroke: COLORS.WARNING_STROKE,
  strokeThickness: 6
});
