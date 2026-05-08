import { TOUCH_JOYSTICK_RADIUS, TOUCH_JOYSTICK_TOUCH_RADIUS, TOUCH_DASH_BUTTON_RADIUS } from "../config/touch.js";
import { BUTTON_ASSET_PATHS } from "../config/assets.manifest.js";

const JOYSTICK_MODE_KEY = "forgeduel_joystick_mode";

export class InputController {
  constructor(scene) {
    this.scene = scene;
    this.keys = {};
    this.touchControlsEnabled = false;
    this.touchMovePointerId = null;
    this.touchMoveVector = new Phaser.Math.Vector2(0, 0);
    this.touchDashQueued = false;
    this.touchJoystickCenter = new Phaser.Math.Vector2(0, 0);
    this.touchJoystickBase = null;
    this.touchJoystickThumb = null;
    this.touchDashButton = null;
    this.touchDashLabel = null;
    this.joystickMode = this._loadJoystickMode();
  }

  _loadJoystickMode() {
    try {
      const stored = typeof window !== "undefined" && window.localStorage
        ? window.localStorage.getItem(JOYSTICK_MODE_KEY) : null;
      if (stored === "fixed" || stored === "dynamic") return stored;
    } catch (_) {}
    return "dynamic";
  }

  setJoystickMode(mode) {
    this.joystickMode = mode;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(JOYSTICK_MODE_KEY, mode);
      }
    } catch (_) {}
    // Apply visual changes
    if (this._domJoystickOuter) {
      if (mode === "fixed") {
        const fixedX = 120;
        const fixedY = window.innerHeight - 160;
        this._domJoystickOuter.style.display = "block";
        this._domJoystickOuter.style.left = fixedX + "px";
        this._domJoystickOuter.style.top = fixedY + "px";
        this.touchJoystickCenter.set(fixedX, fixedY);
      } else {
        if (this._domJoystickTouchId === null) {
          this._domJoystickOuter.style.display = "none";
        }
      }
    }
  }

  setupKeyboard() {
    this.keys = this.scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      dash: Phaser.Input.Keyboard.KeyCodes.SPACE,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
      debugToggle: Phaser.Input.Keyboard.KeyCodes.F2,
      pacingPreset: Phaser.Input.Keyboard.KeyCodes.F3,
      cameraToggle: Phaser.Input.Keyboard.KeyCodes.F4,
      meta1: Phaser.Input.Keyboard.KeyCodes.ONE,
      meta2: Phaser.Input.Keyboard.KeyCodes.TWO,
      meta3: Phaser.Input.Keyboard.KeyCodes.THREE,
      meta4: Phaser.Input.Keyboard.KeyCodes.FOUR,
      pause: Phaser.Input.Keyboard.KeyCodes.ESC,
      pauseAlt: Phaser.Input.Keyboard.KeyCodes.P
    });
  }

  setupTouch(pxFromBottom) {
    if (typeof document === "undefined") return;
    const hasTouch = Boolean(this.scene.sys.game.device?.input?.touch)
      || ("ontouchstart" in window)
      || (navigator.maxTouchPoints > 0);
    this.touchControlsEnabled = hasTouch;
    if (!hasTouch) return;

    const appRoot = document.getElementById("game-root") ?? document.getElementById("app") ?? document.body;
    const zIdx = "100";
    const joystickSize = TOUCH_JOYSTICK_RADIUS * 2;
    const thumbSize = 56;

    // ── Dynamic Joystick (hidden by default, shown on left-half touch) ──
    this._domJoystickOuter = document.createElement("div");
    Object.assign(this._domJoystickOuter.style, {
      position: "fixed", display: "none",
      width: joystickSize + "px", height: joystickSize + "px",
      borderRadius: "50%",
      background: "rgba(255,255,255,0.08)",
      border: "2px solid rgba(196,160,64,0.7)",
      boxShadow: "0 0 24px rgba(0,0,0,0.4)",
      zIndex: zIdx,
      touchAction: "none",
      transform: "translate(-50%, -50%)"
    });
    this._domJoystickThumb = document.createElement("div");
    Object.assign(this._domJoystickThumb.style, {
      position: "absolute", top: "50%", left: "50%",
      width: thumbSize + "px", height: thumbSize + "px",
      marginTop: -(thumbSize / 2) + "px", marginLeft: -(thumbSize / 2) + "px",
      borderRadius: "50%",
      background: "rgba(196,160,64,0.55)",
      border: "2px solid rgba(254,240,138,0.8)",
      boxShadow: "0 0 12px rgba(0,0,0,0.3)",
      pointerEvents: "none"
    });
    this._domJoystickOuter.appendChild(this._domJoystickThumb);
    appRoot.appendChild(this._domJoystickOuter);

    // Fixed-mode: position joystick at bottom-left, always visible
    if (this.joystickMode === "fixed") {
      const fixedX = 120;
      const fixedY = window.innerHeight - 160;
      this._domJoystickOuter.style.display = "block";
      this._domJoystickOuter.style.left = fixedX + "px";
      this._domJoystickOuter.style.top = fixedY + "px";
      this.touchJoystickCenter.set(fixedX, fixedY);
    }

    // ── Dash Button (bottom-right, fixed) ──
    const dashSize = TOUCH_DASH_BUTTON_RADIUS * 2;
    this._domDashBtn = document.createElement("div");
    Object.assign(this._domDashBtn.style, {
      position: "fixed", bottom: "80px", right: "80px",
      width: dashSize + "px", height: dashSize + "px",
      borderRadius: "50%",
      background: "rgba(59,89,152,0.85)",
      backgroundImage: "url('assets/sprites/player/dash/dash.png')",
      backgroundSize: "60%",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      border: "2px solid rgba(254,240,138,0.6)",
      boxShadow: "0 0 16px rgba(0,0,0,0.4)",
      zIndex: zIdx,
      touchAction: "none"
    });
    appRoot.appendChild(this._domDashBtn);
    this._domDashBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.touchDashQueued = true;
    });
    this._domDashBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.touchDashQueued = true;
    });

    // ── Pause Button (top-right) ──
    this._domPauseBtn = document.createElement("div");
    Object.assign(this._domPauseBtn.style, {
      position: "fixed", top: "98px", right: "8px",
      width: "80px", height: "36px",
      backgroundImage: `url('${BUTTON_ASSET_PATHS.btn_blue_option}')`,
      backgroundSize: "contain",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      zIndex: zIdx,
      touchAction: "none"
    });
    appRoot.appendChild(this._domPauseBtn);
    this._domPauseBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.scene.openPauseMenu();
    });
    this._domPauseBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.scene.openPauseMenu();
    });

    // ── Touch handlers: left-half = joystick, right-half = ignored ──
    this._domJoystickTouchId = null;

    const showJoystickAt = (clientX, clientY) => {
      this._domJoystickOuter.style.display = "block";
      if (this.joystickMode === "dynamic") {
        this._domJoystickOuter.style.left = clientX + "px";
        this._domJoystickOuter.style.top = clientY + "px";
        this.touchJoystickCenter.set(clientX, clientY);
      }
    };
    const hideJoystick = () => {
      if (this.joystickMode === "dynamic") {
        this._domJoystickOuter.style.display = "none";
      } else {
        this._setJoystickThumbPos(0, 0);
      }
      this._domJoystickTouchId = null;
      this.touchMoveVector.set(0, 0);
    };
    const updateThumb = (clientX, clientY) => {
      const cx = this.touchJoystickCenter.x;
      const cy = this.touchJoystickCenter.y;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, TOUCH_JOYSTICK_RADIUS);
      const nx = dist > 0.001 ? dx / dist : 0;
      const ny = dist > 0.001 ? dy / dist : 0;
      this.touchMoveVector.set(nx, ny);
      this._setJoystickThumbPos(nx * clamped, ny * clamped);
    };

    const onTouchStart = (e) => {
      if (this._domJoystickTouchId !== null) return;
      const touch = e.changedTouches[0];
      const isLeftHalf = touch.clientX < window.innerWidth / 2;
      const isDashArea = touch.clientY > window.innerHeight - 160 && touch.clientX > window.innerWidth - 180;
      // Dash button area: skip joystick
      if (isDashArea) return;
      // Right half: reserved for skills, don't create joystick
      if (!isLeftHalf) return;
      e.preventDefault();
      this._domJoystickTouchId = touch.identifier;
      showJoystickAt(touch.clientX, touch.clientY);
      updateThumb(touch.clientX, touch.clientY);
    };
    const onTouchMove = (e) => {
      if (this._domJoystickTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this._domJoystickTouchId) {
          e.preventDefault();
          updateThumb(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
          break;
        }
      }
    };
    const onTouchEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this._domJoystickTouchId) {
          hideJoystick();
          break;
        }
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);

    this._domJoystickHandlers = { onTouchStart, onTouchMove, onTouchEnd };
  }

  _setJoystickThumbPos(offsetX, offsetY) {
    if (!this._domJoystickThumb) return;
    this._domJoystickThumb.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  }

  teardownTouch() {
    // Remove document-level touch listeners
    if (this._domJoystickHandlers) {
      const h = this._domJoystickHandlers;
      document.removeEventListener("touchstart", h.onTouchStart);
      document.removeEventListener("touchmove", h.onTouchMove);
      document.removeEventListener("touchend", h.onTouchEnd);
      document.removeEventListener("touchcancel", h.onTouchEnd);
      this._domJoystickHandlers = null;
    }
    // Remove DOM joystick
    if (this._domJoystickOuter) {
      if (this._domJoystickOuter.parentNode) this._domJoystickOuter.parentNode.removeChild(this._domJoystickOuter);
      this._domJoystickOuter = null;
      this._domJoystickThumb = null;
    }
    // Remove DOM dash button
    if (this._domDashBtn) {
      if (this._domDashBtn.parentNode) this._domDashBtn.parentNode.removeChild(this._domDashBtn);
      this._domDashBtn = null;
    }
    // Remove DOM pause button
    if (this._domPauseBtn) {
      if (this._domPauseBtn.parentNode) this._domPauseBtn.parentNode.removeChild(this._domPauseBtn);
      this._domPauseBtn = null;
    }

    this._domJoystickTouchId = null;
    this.touchDashQueued = false;
    this.touchMoveVector.set(0, 0);
    this.touchMovePointerId = null;
  }

  consumeDash() {
    if (!this.touchDashQueued) {
      return false;
    }
    this.touchDashQueued = false;
    return true;
  }

  isDown(key) {
    return Phaser.Input.Keyboard.JustDown(this.keys[key]);
  }

  getMovementVector() {
    if (!this.touchControlsEnabled) {
      return null;
    }
    return this.touchMoveVector;
  }
}
