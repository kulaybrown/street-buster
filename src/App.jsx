import { useEffect, useRef } from "react";

const SPRITES = {
  default: {
    idle: "assets/actions/default/default-idle-position.gif",
    celebPost: "assets/actions/default/celeb-post.gif",
    punch: "assets/actions/default/default-punch-post.gif",
    kick: "assets/actions/default/default-kick-post.gif",
    jump: "assets/actions/default/default-jump-post.gif",
    jumpPunch: "assets/actions/default/default-jump-punch-post.gif",
    jumpKick: "assets/actions/default/default-jump-kick-post.gif",
    crouch: "assets/actions/default/default-crouch.gif",
    crouchPunch: "assets/actions/default/default-crouch-punch.gif",
    crouchKick: "assets/actions/default/default-crouch-kick.gif",
  },
  "female-hulk": {
    idle: "assets/actions/female-hulk/female-hulk-idle-position.gif",
    celebPost: "assets/actions/female-hulk/female-hulk-idle-position.gif",
    punch: "assets/actions/female-hulk/female-hulk-punch-post.gif",
    kick: "assets/actions/female-hulk/female-hulk-kick-post.gif",
    jump: "assets/actions/female-hulk/female-hulk-jump-post.gif",
    jumpPunch: "assets/actions/female-hulk/female-hulk-jump-punch-post.gif",
    jumpKick: "assets/actions/female-hulk/female-hulk-jump-kick-post.gif",
    crouch: "assets/actions/female-hulk/female-hulk-crouch.gif",
    crouchPunch: "assets/actions/female-hulk/female-hulk-crouch-punch.gif",
    crouchKick: "assets/actions/female-hulk/female-hulk-crouch-kick.gif",
  },
};

const CHARACTER_LABELS = {
  default: "Default",
  "female-hulk": "Female Hulk",
};

const STAGES = {
  car: {
    label: "Car",
    maxHealth: 24,
    stageClass: "stage-car",
  },
  "wooden-box": {
    label: "Wooden Box",
    maxHealth: 14,
    stageClass: "stage-box",
  },
};

const CAR_VARIANTS = import.meta.glob("../assets/cars/*.gif", {
  eager: true,
  import: "default",
});

const CAR_VARIANT_URL_BY_CODE = Object.entries(CAR_VARIANTS).reduce((map, [filePath, asset]) => {
  const match = filePath.match(/(\d{3})\.gif$/);
  if (!match) {
    return map;
  }

  const code = match[1];
  const src = typeof asset === "string" ? asset : "";
  if (src) {
    map[code] = src;
  }

  return map;
}, {});

const damageMap = {
  punch: 1,
  kick: 2,
  jumpPunch: 1,
  jumpKick: 2,
  crouchPunch: 1,
  crouchKick: 2,
};

const CAR_PARTS = {
  leftDoor: { label: "Left Door", maxHealth: 17 },
  rightDoor: { label: "Right Hood", maxHealth: 19 },
  roof: { label: "Roof", maxHealth: 12 },
};

const CHARACTER_TARGET_SCALE = {
  default: 1,
  "female-hulk": 1.08,
};

const END_ROUND_DELAY_MS = 5000;

function getDamageTier(health, maxHealth) {
  if (health <= 0) {
    return 3;
  }
  if (health <= maxHealth * 0.5) {
    return 2;
  }
  return 1;
}

function getCarVariantCode(carPartHealth) {
  if (!carPartHealth) {
    return "111";
  }

  const doorTier = getDamageTier(carPartHealth.leftDoor ?? CAR_PARTS.leftDoor.maxHealth, CAR_PARTS.leftDoor.maxHealth);
  const roofTier = getDamageTier(carPartHealth.roof ?? CAR_PARTS.roof.maxHealth, CAR_PARTS.roof.maxHealth);
  const hoodTier = getDamageTier(carPartHealth.rightDoor ?? CAR_PARTS.rightDoor.maxHealth, CAR_PARTS.rightDoor.maxHealth);

  return `${doorTier}${roofTier}${hoodTier}`;
}

function getCarVariantArt(carPartHealth) {
  const variantCode = getCarVariantCode(carPartHealth);
  const directVariantUrl = `/assets/cars/${variantCode}.gif`;
  const directFallbackUrl = "/assets/cars/111.gif";

  return {
    variantCode,
    src:
      CAR_VARIANT_URL_BY_CODE[variantCode] ||
      CAR_VARIANT_URL_BY_CODE["111"] ||
      directVariantUrl ||
      directFallbackUrl,
  };
}

function applyCarVariantToTarget(targetObject, carPartHealth) {
  if (!targetObject) {
    return;
  }

  const { variantCode, src } = getCarVariantArt(carPartHealth);
  targetObject.dataset.carVariant = variantCode;
  targetObject.classList.toggle("has-car-gif", Boolean(src));

  const carArt = targetObject.querySelector(".target-car-art");
  if (carArt && src) {
    carArt.src = src;
    carArt.alt = `Car target ${variantCode}`;
  }

  if (src) {
    targetObject.style.setProperty("--car-combo-art", `url("${src}")`);
  } else {
    targetObject.style.removeProperty("--car-combo-art");
  }
}

export default function App() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    const state = {
      screen: "start",
      character: "default",
      stage: "car",
      score: 0,
      highScore: 0,
      combo: 0,
      timeLeft: 60,
      running: false,
      crouching: false,
      airborne: false,
      action: "idle",
      targetHealth: 0,
      targetMaxHealth: 0,
      targetBroken: false,
      actionTimer: null,
      jumpTimer: null,
      gameTimer: null,
      bonusTimer: null,
      finishTimer: null,
      frameId: null,
      jumpStart: 0,
      jumpDuration: 860,
      moveOffsetX: 0,
      jumpStartOffsetX: 0,
      jumpTargetOffsetX: 0,
      jumpFromRoof: false,
      jumpLandOnRoof: false,
      jumpAllowsAirSteer: false,
      onRoof: false,
      keyWalkAxis: 0,
      buttonWalkAxis: 0,
      walkVelocity: 0,
      lastFrameTime: 0,
      carPartHealth: null,
      attackCooldownByAction: {
        punch: 0,
        kick: 0,
      },
    };

    const listeners = [];
    const pressedArrows = new Set();

    const q = (selector) => root.querySelector(selector);
    const qa = (selector) => Array.from(root.querySelectorAll(selector));

    const elements = {
      screens: {
        start: q("#screen-start"),
        character: q("#screen-character"),
        stage: q("#screen-stage"),
        game: q("#screen-game"),
      },
      startButton: q("#start-button"),
      characterBack: q("#character-back"),
      characterNext: q("#character-next"),
      stageBack: q("#stage-back"),
      stageStart: q("#stage-start"),
      resultOverlay: q("#result-overlay"),
      resultLabel: q("#result-label"),
      resultTitle: q("#result-title"),
      resultCopy: q("#result-copy"),
      resultChooseAgain: q("#result-choose-again"),
      resultPlayAgain: q("#result-play-again"),
      fighterSprite: q("#fighter-sprite"),
      fighterWrap: q("#fighter-wrap"),
      arena: q("#arena"),
      targetWrap: q("#target-wrap"),
      targetObject: q("#target-object"),
      targetHealthLabel: q("#target-health-label"),
      targetHealthBar: q("#target-health-bar"),
      comboLabel: q("#combo-label"),
      stageBonusLabel: q("#stage-bonus-label"),
      hudCharacter: q("#hud-character"),
      hudStage: q("#hud-stage"),
      hudScore: q("#hud-score"),
      hudHighScore: q("#hud-high-score"),
      hudTime: q("#hud-time"),
      targetHitFlash: q("#target-hit-flash"),
      targetParticles: q("#target-particles"),
      characterPreviewSprite: q("#character-preview-sprite"),
      characterPreviewName: q("#character-preview-name"),
      stageCharacterSprite: q("#stage-character-sprite"),
      stageCharacterName: q("#stage-character-name"),
      stageCharacterLabel: q("#stage-character-label"),
      characterCards: qa("#character-grid .choice-card"),
      stageCards: qa("#stage-grid .choice-card"),
      controlButtons: qa(".control-button[data-action]"),
    };

    const on = (element, event, handler) => {
      if (!element) {
        return;
      }
      element.addEventListener(event, handler);
      listeners.push(() => element.removeEventListener(event, handler));
    };

    function setScreen(name) {
      state.screen = name;
      root.dataset.screen = name;
      Object.entries(elements.screens).forEach(([screenName, element]) => {
        if (element) {
          element.classList.toggle("is-active", screenName === name);
        }
      });
      if (name !== "game" && elements.resultOverlay) {
        elements.resultOverlay.hidden = true;
      }
    }

    function updateSelectionCards() {
      elements.characterCards.forEach((card) => {
        card.classList.toggle("is-selected", card.dataset.character === state.character);
      });
      elements.stageCards.forEach((card) => {
        card.classList.toggle("is-selected", card.dataset.stage === state.stage);
      });
      if (elements.characterPreviewSprite) {
        elements.characterPreviewSprite.src = SPRITES[state.character].idle;
        elements.characterPreviewSprite.alt = `${CHARACTER_LABELS[state.character]} idle preview`;
      }
      if (elements.characterPreviewName) {
        elements.characterPreviewName.textContent = CHARACTER_LABELS[state.character];
      }
      if (elements.stageCharacterSprite) {
        elements.stageCharacterSprite.src = SPRITES[state.character].idle;
        elements.stageCharacterSprite.alt = `${CHARACTER_LABELS[state.character]} idle preview`;
      }
      if (elements.stageCharacterName) {
        elements.stageCharacterName.textContent = CHARACTER_LABELS[state.character];
      }
      if (elements.stageCharacterLabel) {
        elements.stageCharacterLabel.textContent = `Selected Fighter: ${CHARACTER_LABELS[state.character]}`;
      }
    }

    function updateHud() {
      if (elements.hudCharacter) {
        elements.hudCharacter.textContent = `Character: ${CHARACTER_LABELS[state.character]}`;
      }
      if (elements.hudStage) {
        elements.hudStage.textContent = `Stage: ${STAGES[state.stage].label}`;
      }
      if (elements.hudScore) {
        elements.hudScore.textContent = `Score: ${state.score}`;
      }
      if (elements.hudHighScore) {
        elements.hudHighScore.textContent = `High ${state.highScore}`;
      }
      if (elements.hudTime) {
        elements.hudTime.textContent = `${Math.max(0, state.timeLeft)}`;
      }
    }

    function clearTimers() {
      if (state.actionTimer) {
        window.clearTimeout(state.actionTimer);
        state.actionTimer = null;
      }
      if (state.jumpTimer) {
        window.clearTimeout(state.jumpTimer);
        state.jumpTimer = null;
      }
      if (state.gameTimer) {
        window.clearInterval(state.gameTimer);
        state.gameTimer = null;
      }
      if (state.bonusTimer) {
        window.clearInterval(state.bonusTimer);
        state.bonusTimer = null;
      }
      if (state.finishTimer) {
        window.clearTimeout(state.finishTimer);
        state.finishTimer = null;
      }
      if (state.frameId) {
        window.cancelAnimationFrame(state.frameId);
        state.frameId = null;
      }
    }

    function setSprite(key) {
      const sprite = SPRITES[state.character][key] || SPRITES[state.character].idle;
      if (elements.fighterSprite) {
        elements.fighterSprite.src = sprite;
        elements.fighterSprite.alt = `${CHARACTER_LABELS[state.character]} ${key}`;
      }
    }

    function setTargetStage() {
      if (!elements.targetObject) {
        return;
      }
      elements.targetObject.className = `target ${STAGES[state.stage].stageClass}`;
      if (state.stage === "car") {
        elements.targetObject.innerHTML =
          '<img class="target-car-art" src="" alt="Car target" draggable="false" />' +
          '<div class="target-car-slot target-car-slot-left"><div class="target-car-part target-car-box left-box door-box"></div></div>' +
          '<div class="target-car-slot target-car-slot-right"><div class="target-car-part target-car-box right-box hood-box"></div></div>' +
          '<div class="target-car-slot target-car-slot-roof"><div class="target-car-part target-car-box roof-box"></div></div>';

        applyCarVariantToTarget(elements.targetObject, state.carPartHealth);
      } else {
        elements.targetObject.innerHTML = '<div class="crate-face"></div>';
        elements.targetObject.style.removeProperty("--car-combo-art");
        elements.targetObject.classList.remove("has-car-gif");
        delete elements.targetObject.dataset.carVariant;
      }
    }

    function getArenaMetrics() {
      const arenaRect = elements.arena?.getBoundingClientRect();
      const fighterRect = elements.fighterWrap?.getBoundingClientRect();
      const targetRect = elements.targetWrap?.getBoundingClientRect();
      const arenaWidth = arenaRect?.width || 900;
      const fighterWidth = fighterRect?.width || (window.innerWidth <= 560 ? 150 : 210);
      const baseLeft = 0;
      const minOffset = 8;
      const maxOffset = arenaWidth - fighterWidth - 8;
      const carCenterX = arenaWidth * 0.5;
      const carHalfWidth = targetRect ? targetRect.width * 0.44 : Math.min(180, arenaWidth * 0.17);

      return {
        arenaWidth,
        fighterWidth,
        baseLeft,
        minOffset,
        maxOffset,
        carCenterX,
        carHalfWidth,
      };
    }

    function getRoofHeight() {
      return window.innerWidth <= 560 ? 74 : 98;
    }

    function getWalkAxis() {
      if (state.buttonWalkAxis !== 0) {
        return state.buttonWalkAxis;
      }
      return state.keyWalkAxis;
    }

    function getRoofOffsetBounds() {
      const metrics = getArenaMetrics();
      const centerOffset = metrics.carCenterX - metrics.baseLeft - metrics.fighterWidth * 0.5;
      const roofHalfSpan = Math.max(72, metrics.carHalfWidth - metrics.fighterWidth * 0.12);
      const roofLeftReachRatio = 0.9;
      const leftRoofSpan = roofHalfSpan * roofLeftReachRatio;
      const roofMinOffset = centerOffset - leftRoofSpan;
      const blockBounds = getCarBlockBounds(metrics);
      const alignedLeftGroundOffset = blockBounds.left - metrics.baseLeft - metrics.fighterWidth * 0.5;
      const rightRoofOffsetAllowance = metrics.fighterWidth * 0.12;
      const minOffset = Math.max(metrics.minOffset, roofMinOffset, alignedLeftGroundOffset);
      const maxOffset = Math.min(metrics.maxOffset, centerOffset + roofHalfSpan + rightRoofOffsetAllowance);
      return {
        minOffset,
        maxOffset,
      };
    }

    function clampRoofOffset(nextOffset) {
      const { minOffset, maxOffset } = getRoofOffsetBounds();
      return Math.max(minOffset, Math.min(maxOffset, nextOffset));
    }

    function resolveRoofOrGroundWalkOffset(nextOffset) {
      if (!state.onRoof || state.stage !== "car") {
        return clampGroundOffset(nextOffset, state.moveOffsetX);
      }

      const { minOffset, maxOffset } = getRoofOffsetBounds();
      if (nextOffset < minOffset || nextOffset > maxOffset) {
        state.onRoof = false;
        state.jumpFromRoof = false;
        state.jumpLandOnRoof = false;
        return clampGroundOffset(nextOffset, state.moveOffsetX);
      }

      return clampRoofOffset(nextOffset);
    }

    function getCarBlockBounds(metrics) {
      const arenaRect = elements.arena?.getBoundingClientRect();
      const targetRect = elements.targetWrap?.getBoundingClientRect();
      const fighterHalf = metrics.fighterWidth * 0.5;
      const leftWalkthroughRatio = 0.3;

      if (!arenaRect || !targetRect) {
        const fallbackHalf = Math.max(56, metrics.carHalfWidth + metrics.fighterWidth * 0.08);
        const fallbackLeft = metrics.carCenterX - fallbackHalf;
        const fallbackRight = metrics.carCenterX + fallbackHalf;
        const shiftedFallbackLeft = fallbackLeft + (fallbackRight - fallbackLeft) * leftWalkthroughRatio;
        return {
          left: shiftedFallbackLeft,
          right: fallbackRight,
        };
      }

      const targetLeft = targetRect.left - arenaRect.left;
      const targetRight = targetLeft + targetRect.width;
      const inset = targetRect.width * 0.12;
      const blockLeft = targetLeft + inset - fighterHalf * 0.56;
      const blockRight = targetRight - inset + fighterHalf * 0.56;
      const shiftedLeft = blockLeft + (blockRight - blockLeft) * leftWalkthroughRatio;

      return {
        left: shiftedLeft,
        right: blockRight,
      };
    }

    function getDistanceToCarBlockEdge(centerX, metrics) {
      const block = getCarBlockBounds(metrics);
      if (centerX < block.left) {
        return block.left - centerX;
      }
      if (centerX > block.right) {
        return centerX - block.right;
      }
      return 0;
    }

    function clampGroundOffset(nextOffset, previousOffset = state.moveOffsetX) {
      const metrics = getArenaMetrics();
      let offset = Math.max(metrics.minOffset, Math.min(metrics.maxOffset, nextOffset));

      if (state.stage !== "car" || state.airborne) {
        return offset;
      }

      const centerX = metrics.baseLeft + offset + metrics.fighterWidth * 0.5;
      const prevCenterX = metrics.baseLeft + previousOffset + metrics.fighterWidth * 0.5;
      const block = getCarBlockBounds(metrics);

      if (centerX > block.left && centerX < block.right) {
        let snappedCenterX;
        if (prevCenterX <= block.left) {
          snappedCenterX = block.left;
        } else if (prevCenterX >= block.right) {
          snappedCenterX = block.right;
        } else {
          snappedCenterX = centerX < metrics.carCenterX ? block.left : block.right;
        }
        offset = snappedCenterX - metrics.baseLeft - metrics.fighterWidth * 0.5;
      }

      return Math.max(metrics.minOffset, Math.min(metrics.maxOffset, offset));
    }

    function syncTargetScaleWithCharacter() {
      if (!elements.targetWrap) {
        return;
      }

      if (state.stage !== "car") {
        elements.targetWrap.style.width = "";
        elements.targetWrap.style.height = "";
        return;
      }

      const metrics = getArenaMetrics();
      const characterScale = CHARACTER_TARGET_SCALE[state.character] ?? 1;
      const targetSize = Math.round(
        Math.max(262, Math.min(metrics.arenaWidth * 0.57, metrics.fighterWidth * 2.02 * characterScale)),
      );

      elements.targetWrap.style.width = `${targetSize}px`;
      elements.targetWrap.style.height = `${targetSize}px`;
    }

    function getCurrentFighterCenterX(offset = state.moveOffsetX) {
      const metrics = getArenaMetrics();
      return metrics.baseLeft + offset + metrics.fighterWidth * 0.5;
    }

    function resolveJumpTargetOffset(action) {
      const metrics = getArenaMetrics();
      const directionalStep = action === "jumpLeft" ? -170 : action === "jumpRight" ? 170 : 0;
      let desiredOffset = clampGroundOffset(state.moveOffsetX + directionalStep);

      if (state.stage !== "car") {
        return desiredOffset;
      }

      const fighterCenterX = getCurrentFighterCenterX();
      const side = fighterCenterX < metrics.carCenterX ? -1 : 1;
      const nearCar = getDistanceToCarBlockEdge(fighterCenterX, metrics) <= 112;
      const tryingToCross =
        (side < 0 && action === "jumpRight") ||
        (side > 0 && action === "jumpLeft");

      if (!nearCar || !tryingToCross) {
        return desiredOffset;
      }

      const clearance = metrics.carHalfWidth + metrics.fighterWidth * 0.24 + 16;
      const landingCenterX = metrics.carCenterX + (side < 0 ? clearance : -clearance);
      desiredOffset = landingCenterX - metrics.baseLeft - metrics.fighterWidth * 0.5;
      return clampGroundOffset(desiredOffset);
    }

    function resolveJumpLanding(action) {
      if (state.stage !== "car") {
        return {
          offset: clampGroundOffset(resolveJumpTargetOffset(action)),
          onRoof: false,
        };
      }

      const metrics = getArenaMetrics();

      if (state.onRoof) {
        if (action === "jumpLeft" || action === "jumpRight") {
          const jumpSide = action === "jumpLeft" ? -1 : 1;
          const clearance = metrics.carHalfWidth + metrics.fighterWidth * 0.24 + 16;
          const landingCenterX = metrics.carCenterX + jumpSide * clearance;
          const desiredOffset = landingCenterX - metrics.baseLeft - metrics.fighterWidth * 0.5;
          return {
            offset: clampGroundOffset(desiredOffset),
            onRoof: false,
          };
        }
        return {
          offset: clampRoofOffset(state.moveOffsetX),
          onRoof: true,
        };
      }

      const fighterCenterX = getCurrentFighterCenterX();
      const nearCar = getDistanceToCarBlockEdge(fighterCenterX, metrics) <= 94;
      const walkAxis = getWalkAxis();
      const towardCar = fighterCenterX <= metrics.carCenterX ? walkAxis > 0 : walkAxis < 0;

      if (nearCar && action === "jump" && towardCar) {
        const roofCenterOffset = metrics.carCenterX - metrics.baseLeft - metrics.fighterWidth * 0.5;
        return {
          offset: clampRoofOffset(roofCenterOffset),
          onRoof: true,
        };
      }

      return {
        offset: clampGroundOffset(resolveJumpTargetOffset(action)),
        onRoof: false,
      };
    }

    function resolveRoofJumpIntent() {
      const walkAxis = getWalkAxis();
      if (walkAxis < 0) {
        return "jumpLeft";
      }
      if (walkAxis > 0) {
        return "jumpRight";
      }

      return "jump";
    }

    function getAttackPoint() {
      const arenaRect = elements.arena?.getBoundingClientRect();
      const fighterRect = elements.fighterWrap?.getBoundingClientRect();
      const targetRect = elements.targetWrap?.getBoundingClientRect();
      if (!arenaRect || !fighterRect) {
        return null;
      }

      const fighterCenterX = fighterRect.left - arenaRect.left + fighterRect.width * 0.5;
      const targetCenterX = targetRect
        ? targetRect.left - arenaRect.left + targetRect.width * 0.5
        : fighterCenterX;
      const isCrouchPunch = state.action === "crouchPunch";
      const attackXRatio = isCrouchPunch
        ? fighterCenterX <= targetCenterX
          ? 0.68
          : 0.32
        : fighterCenterX <= targetCenterX
          ? 0.62
          : 0.38;
      const attackYRatio = state.airborne ? 0.35 : isCrouchPunch ? 0.7 : state.crouching ? 0.78 : 0.62;

      return {
        x: fighterRect.left - arenaRect.left + fighterRect.width * attackXRatio,
        y: fighterRect.top - arenaRect.top + fighterRect.height * attackYRatio,
      };
    }

    function canReachTarget(mappedAction) {
      const attackPoint = getAttackPoint();
      const arenaRect = elements.arena?.getBoundingClientRect();
      const targetRect = elements.targetWrap?.getBoundingClientRect();
      if (!attackPoint || !arenaRect || !targetRect) {
        return false;
      }

      const targetCenter = {
        x: targetRect.left - arenaRect.left + targetRect.width * 0.5,
        y: targetRect.top - arenaRect.top + targetRect.height * 0.64,
      };
      const dx = attackPoint.x - targetCenter.x;
      const dy = attackPoint.y - targetCenter.y;
      const reach = mappedAction.includes("Kick") ? 168 : 136;
      return Math.hypot(dx, dy * 1.2) <= reach;
    }

    function resolveCarPartHit(mappedAction) {
      const attackPoint = getAttackPoint();
      const arenaRect = elements.arena?.getBoundingClientRect();
      const targetRect = elements.targetWrap?.getBoundingClientRect();
      if (!attackPoint || !arenaRect || !targetRect || !state.carPartHealth) {
        return null;
      }

      const baseReach = mappedAction.includes("Kick") ? 160 : 136;
      const targetCenterX = targetRect.left - arenaRect.left + targetRect.width * 0.5;
      const attackFromLeftSide = attackPoint.x <= targetCenterX;

      const partCenters = {
        leftDoor: {
          x: targetRect.left - arenaRect.left + targetRect.width * 0.33,
          y: targetRect.top - arenaRect.top + targetRect.height * 0.62,
        },
        rightDoor: {
          x: targetRect.left - arenaRect.left + targetRect.width * 0.6,
          y: targetRect.top - arenaRect.top + targetRect.height * 0.62,
        },
        roof: {
          x: targetRect.left - arenaRect.left + targetRect.width * 0.5,
          y: targetRect.top - arenaRect.top + targetRect.height * 0.3,
        },
      };

      const allowRoof = state.onRoof || state.airborne || mappedAction.startsWith("jump");

      if (state.onRoof) {
        if (mappedAction !== "crouchKick" || state.carPartHealth.roof <= 0) {
          return null;
        }
        const dx = attackPoint.x - partCenters.roof.x;
        const dy = attackPoint.y - partCenters.roof.y;
        const roofReach = baseReach + 24;
        return Math.hypot(dx, dy * 1.2) <= roofReach ? "roof" : null;
      }

      let nearestPart = null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      Object.entries(partCenters).forEach(([partKey, center]) => {
        if (state.carPartHealth[partKey] <= 0) {
          return;
        }
        if (partKey === "roof" && !allowRoof) {
          return;
        }
        if (partKey === "rightDoor" && attackFromLeftSide) {
          return;
        }
        if (partKey === "leftDoor" && !attackFromLeftSide) {
          return;
        }
        const reach =
          partKey === "roof" ? baseReach : partKey === "rightDoor" ? baseReach + 48 : baseReach + 28;
        const dx = attackPoint.x - center.x;
        const dy = attackPoint.y - center.y;
        const distance = Math.hypot(dx, dy * 1.25);
        if (distance < nearestDistance && distance <= reach) {
          nearestDistance = distance;
          nearestPart = partKey;
        }
      });

      return nearestPart;
    }

    function updateTargetVisual() {
      const ratio = state.targetMaxHealth === 0 ? 0 : state.targetHealth / state.targetMaxHealth;
      if (elements.targetHealthLabel) {
        elements.targetHealthLabel.textContent = `${Math.max(0, state.targetHealth)} / ${state.targetMaxHealth}`;
      }
      if (elements.targetHealthBar) {
        elements.targetHealthBar.style.width = `${Math.max(0, ratio * 100)}%`;
      }
      if (elements.targetObject) {
        elements.targetObject.style.transform = `scale(${0.92 + ratio * 0.12})`;
        elements.targetObject.style.opacity = `${0.55 + ratio * 0.45}`;
        if (state.stage === "car") {
          applyCarVariantToTarget(elements.targetObject, state.carPartHealth);

          elements.targetObject.classList.toggle("damage-1", ratio <= 0.85);
          elements.targetObject.classList.toggle("damage-2", ratio <= 0.55);
          elements.targetObject.classList.toggle("damage-3", ratio <= 0.25);
          const leftDoorHealth = state.carPartHealth?.leftDoor ?? CAR_PARTS.leftDoor.maxHealth;
          const rightDoorHealth = state.carPartHealth?.rightDoor ?? CAR_PARTS.rightDoor.maxHealth;
          const roofHealth = state.carPartHealth?.roof ?? CAR_PARTS.roof.maxHealth;
          elements.targetObject.classList.toggle("left-door-damaged", leftDoorHealth <= CAR_PARTS.leftDoor.maxHealth * 0.5);
          elements.targetObject.classList.toggle("right-door-damaged", rightDoorHealth <= CAR_PARTS.rightDoor.maxHealth * 0.5);
          elements.targetObject.classList.toggle("roof-damaged", roofHealth <= CAR_PARTS.roof.maxHealth * 0.5);
          elements.targetObject.classList.toggle("left-door-broken", leftDoorHealth <= 0);
          elements.targetObject.classList.toggle("right-door-broken", rightDoorHealth <= 0);
          elements.targetObject.classList.toggle("roof-broken", roofHealth <= 0);
        }
      }
      if (elements.stageBonusLabel) {
        if (state.stage === "car" && state.carPartHealth) {
          const brokenCount = Object.values(state.carPartHealth).filter((value) => value <= 0).length;
          elements.stageBonusLabel.textContent = state.targetBroken ? "Broken" : `${brokenCount}/3 Parts Down`;
        } else {
          elements.stageBonusLabel.textContent = state.targetBroken ? "Broken" : ratio < 0.35 ? "Cracking" : "Ready";
        }
      }
      if (elements.comboLabel) {
        elements.comboLabel.textContent = `${state.combo}x`;
      }
    }

    function spawnParticles() {
      if (!elements.targetParticles) {
        return;
      }
      elements.targetParticles.innerHTML = "";
      for (let index = 0; index < 6; index += 1) {
        const particle = document.createElement("span");
        particle.className = "particle";
        const angle = Math.random() * Math.PI * 2;
        const distance = 24 + Math.random() * 56;
        particle.style.left = `${45 + Math.random() * 12}%`;
        particle.style.top = `${40 + Math.random() * 18}%`;
        particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
        particle.style.setProperty("--dy", `${Math.sin(angle) * distance * -0.6 - 18}px`);
        particle.style.background = index % 2 === 0 ? "#f3b54a" : "#ff736d";
        elements.targetParticles.appendChild(particle);
      }
    }

    function flashHit() {
      if (elements.targetHitFlash) {
        elements.targetHitFlash.animate(
          [
            { opacity: 0, transform: "translate(-50%, 50%) scale(0.25)" },
            { opacity: 1, transform: "translate(-50%, 50%) scale(1.4)" },
            { opacity: 0, transform: "translate(-50%, 50%) scale(2.1)" },
          ],
          { duration: 240, easing: "ease-out" },
        );
      }
      if (elements.targetWrap) {
        elements.targetWrap.animate(
          [
            { transform: "translateX(-50%)" },
            { transform: "translateX(calc(-50% - 10px))" },
            { transform: "translateX(calc(-50% + 8px))" },
            { transform: "translateX(-50%)" },
          ],
          { duration: 240, easing: "ease-out" },
        );
      }
    }

    function returnToRestingPose() {
      if (state.airborne) {
        setSprite("jump");
        state.action = "jump";
      } else if (state.crouching) {
        setSprite("crouch");
        state.action = "crouch";
      } else {
        setSprite("idle");
        state.action = "idle";
      }
    }

    function finishGame(won) {
      if (!state.running) {
        return;
      }

      const baseScore = state.score;
      const remainingTimeBonus = Math.max(0, Math.floor(state.timeLeft));
      const finalScore = baseScore + remainingTimeBonus;
      let bonusLeft = remainingTimeBonus;

      state.running = false;
      clearTimers();
      state.airborne = false;
      state.crouching = false;
      state.action = "celebPost";
      setSprite("celebPost");
      if (elements.stageBonusLabel) {
        elements.stageBonusLabel.textContent = `Time Bonus ${bonusLeft}`;
      }
      updateHud();

      if (remainingTimeBonus > 0) {
        const tickMs = Math.max(16, Math.floor(END_ROUND_DELAY_MS / remainingTimeBonus));
        state.bonusTimer = window.setInterval(() => {
          if (bonusLeft <= 0) {
            if (state.bonusTimer) {
              window.clearInterval(state.bonusTimer);
              state.bonusTimer = null;
            }
            return;
          }

          bonusLeft -= 1;
          state.score += 1;
          if (state.score > state.highScore) {
            state.highScore = state.score;
          }
          if (elements.stageBonusLabel) {
            elements.stageBonusLabel.textContent = `Time Bonus ${bonusLeft}`;
          }
          updateHud();
        }, tickMs);
      }

      state.finishTimer = window.setTimeout(() => {
        state.finishTimer = null;
        if (state.bonusTimer) {
          window.clearInterval(state.bonusTimer);
          state.bonusTimer = null;
        }
        state.score = finalScore;
        if (elements.stageBonusLabel) {
          elements.stageBonusLabel.textContent = "Complete";
        }
        if (state.score > state.highScore) {
          state.highScore = state.score;
          try {
            window.localStorage.setItem("streetBuster.highScore", String(state.highScore));
          } catch {
            // Ignore storage failures.
          }
        }
        updateHud();

        if (elements.resultOverlay) {
          elements.resultOverlay.hidden = false;
        }
        if (elements.resultLabel) {
          elements.resultLabel.textContent = won ? "Victory" : "Time Up";
        }
        if (elements.resultTitle) {
          elements.resultTitle.textContent = won ? "Target destroyed" : "Round over";
        }
        if (elements.resultCopy) {
          const scoreBreakdown = `Base ${baseScore} + Time Bonus ${remainingTimeBonus} = ${finalScore}.`;
          elements.resultCopy.textContent = won
            ? `You smashed the ${STAGES[state.stage].label.toLowerCase()}. ${scoreBreakdown}`
            : `The ${STAGES[state.stage].label.toLowerCase()} survived. ${scoreBreakdown}`;
        }
      }, END_ROUND_DELAY_MS);
    }

    function applyDamage(amount, mappedAction) {
      if (state.targetBroken || amount <= 0) {
        return;
      }

      if (state.stage === "car") {
        const hitPart = resolveCarPartHit(mappedAction);
        if (!hitPart || !state.carPartHealth) {
          state.combo = 0;
          updateTargetVisual();
          return;
        }
        state.carPartHealth[hitPart] = Math.max(0, state.carPartHealth[hitPart] - amount);
        state.targetHealth = Object.values(state.carPartHealth).reduce((sum, health) => sum + health, 0);
      } else {
        if (!canReachTarget(mappedAction)) {
          state.combo = 0;
          updateTargetVisual();
          return;
        }
        state.targetHealth = Math.max(0, state.targetHealth - amount);
      }

      state.score += amount * 100;
      if (state.score > state.highScore) {
        state.highScore = state.score;
        try {
          window.localStorage.setItem("streetBuster.highScore", String(state.highScore));
        } catch {
          // Ignore storage failures.
        }
      }
      state.combo += 1;
      updateHud();
      updateTargetVisual();
      flashHit();
      spawnParticles();
      if (state.targetHealth <= 0) {
        state.targetBroken = true;
        if (elements.targetObject) {
          elements.targetObject.classList.add("broken");
        }
        if (elements.stageBonusLabel) {
          elements.stageBonusLabel.textContent = "Broken";
        }
        window.setTimeout(() => finishGame(true), 650);
      }
    }

    function updateFighterPosition(now) {
      const deltaMs = state.lastFrameTime ? Math.min(40, now - state.lastFrameTime) : 16;
      state.lastFrameTime = now;

      if (state.running && !state.airborne) {
        const walkAxis = getWalkAxis();
        const targetVelocity = walkAxis * (state.crouching ? 0.24 : 0.45);
        const blend = walkAxis !== 0 ? 0.28 : 0.22;
        state.walkVelocity += (targetVelocity - state.walkVelocity) * blend;
        if (Math.abs(state.walkVelocity) < 0.01) {
          state.walkVelocity = 0;
        }
        const movedOffset = state.moveOffsetX + state.walkVelocity * deltaMs;
        state.moveOffsetX = resolveRoofOrGroundWalkOffset(movedOffset);
      }

      const jumpHeight = window.innerWidth <= 560 ? 78 : 112;
      const roofHeight = getRoofHeight();
      let yOffset = 0;
      let xOffset = state.moveOffsetX;

      if (state.running && state.airborne && state.jumpAllowsAirSteer) {
        const walkAxis = getWalkAxis();
        if (walkAxis !== 0) {
          const airSteerStep = walkAxis * 0.22 * deltaMs;
          const nextTarget = state.jumpTargetOffsetX + airSteerStep;
          state.jumpTargetOffsetX = state.jumpLandOnRoof
            ? clampRoofOffset(nextTarget)
            : clampGroundOffset(nextTarget, state.jumpTargetOffsetX);
        }
      }

      const fighterCenterX = getCurrentFighterCenterX(xOffset);
      const targetCenterX = getArenaMetrics().carCenterX;
      const facingScaleX = fighterCenterX <= targetCenterX ? 1 : -1;
      const poseScale = state.crouching ? 0.98 : 1;

      if (state.airborne) {
        const progress = Math.min(1, (now - state.jumpStart) / state.jumpDuration);
        const travel = state.jumpTargetOffsetX - state.jumpStartOffsetX;
        xOffset = state.jumpStartOffsetX + travel * Math.sin((progress * Math.PI) / 2);

        // Gravity-like arc: shorter rise and faster fall for a more natural jump feel.
        const ascentRatio = 0.36;
        let arcY = 0;
        if (progress <= ascentRatio) {
          const ascentProgress = progress / ascentRatio;
          arcY = jumpHeight * (2 * ascentProgress - ascentProgress * ascentProgress);
        } else {
          const fallProgress = (progress - ascentRatio) / (1 - ascentRatio);
          arcY = jumpHeight * (1 - fallProgress * fallProgress);
        }

        const startLift = state.jumpFromRoof ? roofHeight : 0;
        const endLift = state.jumpLandOnRoof ? roofHeight : 0;
        const lift = startLift + (endLift - startLift) * progress;
        yOffset = -lift - arcY;
      } else if (state.onRoof) {
        yOffset = -roofHeight;
      } else if (state.crouching) {
        yOffset = 0;
      }

      if (state.action === "punch" || state.action === "jumpPunch" || state.action === "crouchPunch") {
        xOffset += 4;
      } else if (state.action === "kick" || state.action === "jumpKick" || state.action === "crouchKick") {
        xOffset += 8;
      }

      if (elements.fighterWrap) {
        elements.fighterWrap.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0) scaleX(${facingScaleX * poseScale}) scaleY(${poseScale})`;
      }
      state.frameId = window.requestAnimationFrame(updateFighterPosition);
    }

    function startGame() {
      clearTimers();
      state.running = true;
      state.score = 0;
      state.combo = 0;
      state.timeLeft = 60;
      state.crouching = false;
      state.airborne = false;
      state.action = "idle";
      state.targetBroken = false;
      if (state.stage === "car") {
        state.carPartHealth = {
          leftDoor: CAR_PARTS.leftDoor.maxHealth,
          rightDoor: CAR_PARTS.rightDoor.maxHealth,
          roof: CAR_PARTS.roof.maxHealth,
        };
        state.targetMaxHealth = Object.values(state.carPartHealth).reduce((sum, value) => sum + value, 0);
      } else {
        state.carPartHealth = null;
        state.targetMaxHealth = STAGES[state.stage].maxHealth;
      }
      state.targetHealth = state.targetMaxHealth;
      state.onRoof = false;
      state.jumpFromRoof = false;
      state.jumpLandOnRoof = false;
      state.jumpAllowsAirSteer = false;
      state.walkVelocity = 0;
      state.keyWalkAxis = 0;
      state.buttonWalkAxis = 0;
      state.lastFrameTime = 0;
      state.attackCooldownByAction.punch = 0;
      state.attackCooldownByAction.kick = 0;
      if (elements.resultOverlay) {
        elements.resultOverlay.hidden = true;
      }
      setTargetStage();
      updateSelectionCards();
      updateHud();
      setScreen("game");
      syncTargetScaleWithCharacter();
      const metrics = getArenaMetrics();
      const spawnOffset = metrics.carCenterX - metrics.carHalfWidth - metrics.fighterWidth * 0.62 - metrics.baseLeft;
      state.moveOffsetX = clampGroundOffset(state.stage === "car" ? spawnOffset : 0);
      state.jumpStartOffsetX = state.moveOffsetX;
      state.jumpTargetOffsetX = state.moveOffsetX;
      updateTargetVisual();
      setSprite("idle");
      if (elements.fighterWrap) {
        elements.fighterWrap.style.transform = `translate3d(${state.moveOffsetX}px, 0, 0) scale(1)`;
      }
      state.jumpStart = performance.now();
      state.gameTimer = window.setInterval(() => {
        state.timeLeft -= 1;
        updateHud();
        if (state.timeLeft <= 0) {
          finishGame(false);
        }
      }, 1000);
      state.frameId = window.requestAnimationFrame(updateFighterPosition);
    }

    function performAction(action) {
      if (!state.running) {
        return;
      }

      if (action === "idle") {
        state.crouching = false;
        state.airborne = false;
        state.jumpStartOffsetX = state.moveOffsetX;
        state.jumpTargetOffsetX = state.moveOffsetX;
        state.walkVelocity = 0;
        state.keyWalkAxis = 0;
        state.buttonWalkAxis = 0;
        state.jumpFromRoof = false;
        state.jumpLandOnRoof = state.onRoof;
        state.jumpAllowsAirSteer = false;
        if (state.actionTimer) {
          window.clearTimeout(state.actionTimer);
          state.actionTimer = null;
        }
        if (state.jumpTimer) {
          window.clearTimeout(state.jumpTimer);
          state.jumpTimer = null;
        }
        setSprite("idle");
        state.action = "idle";
        return;
      }

      if (action === "moveLeft" || action === "moveRight") {
        const impulse = action === "moveLeft" ? -0.28 : 0.28;
        state.walkVelocity = Math.max(-0.92, Math.min(0.92, state.walkVelocity + impulse));
        state.moveOffsetX = state.onRoof ? clampRoofOffset(state.moveOffsetX) : clampGroundOffset(state.moveOffsetX);
        if (!state.airborne && !state.crouching) {
          state.action = "idle";
          setSprite("idle");
        }
        return;
      }

      if (action === "jump") {
        if (state.airborne) {
          return;
        }
        const keepCrouchAfterJump = state.crouching || pressedArrows.has("ArrowDown");
        const jumpIntent = state.onRoof ? resolveRoofJumpIntent() : "jump";
        const landing = resolveJumpLanding(jumpIntent);
        state.airborne = true;
        state.walkVelocity = 0;
        state.jumpFromRoof = state.onRoof;
        state.jumpLandOnRoof = landing.onRoof;
        state.jumpAllowsAirSteer = jumpIntent === "jump";
        state.onRoof = false;
        state.jumpStartOffsetX = state.moveOffsetX;
        state.jumpTargetOffsetX = landing.offset;
        state.action = "jump";
        state.jumpStart = performance.now();
        window.clearTimeout(state.jumpTimer);
        setSprite("jump");
        state.jumpTimer = window.setTimeout(() => {
          state.airborne = false;
          state.jumpTimer = null;
          state.onRoof = state.jumpLandOnRoof;
          state.crouching = keepCrouchAfterJump;
          state.moveOffsetX = state.onRoof ? clampRoofOffset(state.jumpTargetOffsetX) : clampGroundOffset(state.jumpTargetOffsetX);
          state.jumpFromRoof = false;
          state.jumpLandOnRoof = state.onRoof;
          state.jumpAllowsAirSteer = false;
          state.jumpStartOffsetX = state.moveOffsetX;
          state.jumpTargetOffsetX = state.moveOffsetX;
          returnToRestingPose();
        }, state.jumpDuration);
        return;
      }

      if (action === "jumpLeft" || action === "jumpRight") {
        if (state.airborne) {
          return;
        }
        const keepCrouchAfterJump = state.crouching || pressedArrows.has("ArrowDown");
        const landing = resolveJumpLanding(action);
        state.airborne = true;
        state.walkVelocity = 0;
        state.jumpFromRoof = state.onRoof;
        state.jumpLandOnRoof = landing.onRoof;
        state.jumpAllowsAirSteer = false;
        state.onRoof = false;
        state.jumpStartOffsetX = state.moveOffsetX;
        state.jumpTargetOffsetX = landing.offset;
        state.action = "jump";
        state.jumpStart = performance.now();
        window.clearTimeout(state.jumpTimer);
        setSprite("jump");
        state.jumpTimer = window.setTimeout(() => {
          state.airborne = false;
          state.jumpTimer = null;
          state.onRoof = state.jumpLandOnRoof;
          state.crouching = keepCrouchAfterJump;
          state.moveOffsetX = state.onRoof ? clampRoofOffset(state.jumpTargetOffsetX) : clampGroundOffset(state.jumpTargetOffsetX);
          state.jumpFromRoof = false;
          state.jumpLandOnRoof = state.onRoof;
          state.jumpAllowsAirSteer = false;
          state.jumpStartOffsetX = state.moveOffsetX;
          state.jumpTargetOffsetX = state.moveOffsetX;
          returnToRestingPose();
        }, state.jumpDuration);
        return;
      }

      if (action === "crouch") {
        if (state.airborne) {
          return;
        }
        state.crouching = !state.crouching;
        state.action = state.crouching ? "crouch" : "idle";
        window.clearTimeout(state.actionTimer);
        setSprite(state.crouching ? "crouch" : "idle");
        return;
      }

      if (action === "crouchLeft" || action === "crouchRight") {
        if (state.airborne) {
          return;
        }
        if (state.onRoof) {
          return;
        }
        const step = action === "crouchLeft" ? -22 : 22;
        state.moveOffsetX = clampGroundOffset(state.moveOffsetX + step);
        state.crouching = true;
        state.action = "crouch";
        window.clearTimeout(state.actionTimer);
        setSprite("crouch");
        return;
      }

      if (action === "punch" || action === "kick") {
        const now = performance.now();
        if (now < state.attackCooldownByAction[action]) {
          return;
        }
        state.attackCooldownByAction[action] = now + 500;
      }

      const mappedAction = state.airborne
        ? action === "punch"
          ? "jumpPunch"
          : "jumpKick"
        : state.crouching
          ? action === "punch"
            ? "crouchPunch"
            : "crouchKick"
          : action;

      state.action = mappedAction;
      window.clearTimeout(state.actionTimer);
      setSprite(mappedAction);
      applyDamage(damageMap[mappedAction] || 0, mappedAction);

      state.actionTimer = window.setTimeout(() => {
        state.actionTimer = null;
        returnToRestingPose();
      }, 340);
    }

    function goToStart() {
      clearTimers();
      state.running = false;
      setScreen("start");
    }

    function goToCharacterSelection() {
      setScreen("character");
      updateSelectionCards();
    }

    function goToStageSelection() {
      setScreen("stage");
      updateSelectionCards();
    }

    function preloadSprites() {
      Object.values(SPRITES).forEach((character) => {
        Object.values(character).forEach((src) => {
          const image = new Image();
          image.src = src;
        });
      });
    }

    try {
      const storedHighScore = Number(window.localStorage.getItem("streetBuster.highScore") || 0);
      state.highScore = Number.isFinite(storedHighScore) && storedHighScore > 0 ? Math.floor(storedHighScore) : 0;
    } catch {
      state.highScore = 0;
    }

    elements.characterCards.forEach((card) => {
      on(card, "click", () => {
        state.character = card.dataset.character;
        updateSelectionCards();
      });
    });

    elements.stageCards.forEach((card) => {
      on(card, "click", () => {
        state.stage = card.dataset.stage;
        updateSelectionCards();
      });
    });

    on(elements.startButton, "click", goToCharacterSelection);
    on(elements.characterBack, "click", goToStart);
    on(elements.characterNext, "click", goToStageSelection);
    on(elements.stageBack, "click", goToCharacterSelection);
    on(elements.stageStart, "click", startGame);
    on(elements.resultChooseAgain, "click", goToCharacterSelection);
    on(elements.resultPlayAgain, "click", startGame);

    elements.controlButtons.forEach((button) => {
      const action = button.dataset.action;
      on(button, "click", () => performAction(action));

      if (action === "moveLeft" || action === "moveRight") {
        const axis = action === "moveLeft" ? -1 : 1;
        on(button, "pointerdown", (event) => {
          event.preventDefault();
          state.buttonWalkAxis = axis;
        });
        on(button, "pointerup", () => {
          if (state.buttonWalkAxis === axis) {
            state.buttonWalkAxis = 0;
          }
        });
        on(button, "pointercancel", () => {
          if (state.buttonWalkAxis === axis) {
            state.buttonWalkAxis = 0;
          }
        });
        on(button, "pointerleave", () => {
          if (state.buttonWalkAxis === axis) {
            state.buttonWalkAxis = 0;
          }
        });
      }
    });

    const updateWalkAxisFromKeys = () => {
      const left = pressedArrows.has("ArrowLeft");
      const right = pressedArrows.has("ArrowRight");
      if (left && !right) {
        state.keyWalkAxis = -1;
      } else if (right && !left) {
        state.keyWalkAxis = 1;
      } else {
        state.keyWalkAxis = 0;
      }
    };

    const handleKeydown = (event) => {
      if (event.repeat) {
        return;
      }

      if (event.key === "z" || event.key === "x" || event.key === "Escape") {
        event.preventDefault();
      }

      if (event.key === "z") {
        performAction("punch");
        return;
      }
      if (event.key === "x") {
        performAction("kick");
        return;
      }
      if (event.key === "Escape") {
        performAction("idle");
        return;
      }
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        return;
      }

      event.preventDefault();
      pressedArrows.add(event.key);
      updateWalkAxisFromKeys();

      if (event.key === "ArrowUp") {
        performAction("jump");
      } else if (event.key === "ArrowDown") {
        if (!state.airborne) {
          state.crouching = true;
          state.action = "crouch";
          window.clearTimeout(state.actionTimer);
          state.actionTimer = null;
          setSprite("crouch");
        }
      }
    };

    const handleKeyup = (event) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        return;
      }
      pressedArrows.delete(event.key);
      updateWalkAxisFromKeys();

      if (event.key === "ArrowDown" && !state.airborne && state.crouching) {
        state.crouching = false;
        window.clearTimeout(state.actionTimer);
        state.actionTimer = null;
        returnToRestingPose();
      }
    };

    const handleResize = () => {
      if (!state.running) {
        return;
      }
      syncTargetScaleWithCharacter();
      const currentCenter = getCurrentFighterCenterX();
      state.moveOffsetX = state.onRoof ? clampRoofOffset(state.moveOffsetX) : clampGroundOffset(state.moveOffsetX);
      if (state.airborne) {
        state.jumpStartOffsetX = clampGroundOffset(state.jumpStartOffsetX);
        state.jumpTargetOffsetX = clampGroundOffset(state.jumpTargetOffsetX);
      }
      // Keep fighter near the same area after viewport changes.
      if (!Number.isNaN(currentCenter)) {
        const metrics = getArenaMetrics();
        const desiredOffset = currentCenter - metrics.baseLeft - metrics.fighterWidth * 0.5;
        state.moveOffsetX = state.onRoof ? clampRoofOffset(desiredOffset) : clampGroundOffset(desiredOffset);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("keyup", handleKeyup);
    window.addEventListener("resize", handleResize);
    listeners.push(() => window.removeEventListener("keydown", handleKeydown));
    listeners.push(() => window.removeEventListener("keyup", handleKeyup));
    listeners.push(() => window.removeEventListener("resize", handleResize));

    preloadSprites();
    updateSelectionCards();
    updateHud();
    setTargetStage();
    setSprite("idle");
    setScreen("start");

    return () => {
      clearTimers();
      listeners.forEach((off) => off());
    };
  }, []);

  return (
    <div ref={rootRef}>
      <div className="backdrop"></div>
      <main className="app-shell">
        <section className="top-bar">
          <div className="score-row">
            <div className="score-pill" id="hud-score">Score 0</div>
            <div className="timer-pill" id="hud-time">60</div>
            <div className="score-pill" id="hud-high-score">High 0</div>
          </div>
          <div className="fight-row">
            <div className="life-hud enemy full-width">
              <span className="life-name">Target</span>
              <div className="life-track"><div className="life-fill enemy" id="target-health-bar"></div></div>
            </div>
          </div>
        </section>

        <section className="screen screen-start is-active" id="screen-start">
          <div className="hero-card">
            <p className="section-label">Bonus Stage</p>
            <h2>Smash the target before time runs out.</h2>
            <p className="lead">Choose your fighter, pick the stage, then punch and kick your way through the bonus round.</p>
            <button className="primary-button start-button-text" id="start-button" type="button">
              Tap to Start <span className="start-arrow">›</span>
            </button>
          </div>
        </section>

        <section className="screen selection-screen screen-character" id="screen-character">
          <div className="panel-head panel-head-centered">
            <h2 className="selection-title">Character Selection</h2>
            <p className="selection-subtitle">Choose your fighter</p>
          </div>
          <div className="character-selection-layout">
            <div className="character-preview-panel">
              <img id="character-preview-sprite" className="character-preview-sprite" src="assets/actions/default/default-idle-position.gif" alt="Default idle preview" />
              <p className="character-preview-kicker">Selected Fighter</p>
              <h3 id="character-preview-name" className="character-preview-name">Default</h3>
            </div>
            <div className="selection-grid character-selection-grid" id="character-grid">
              <button className="choice-card character-choice-card is-selected" data-character="default" type="button">
                <img className="character-choice-image" src="assets/selection/select-default.gif" alt="Default selection preview" />
              </button>
              <button className="choice-card character-choice-card" data-character="female-hulk" type="button">
                <img className="character-choice-image" src="assets/selection/select-female-hulk.gif" alt="Female Hulk selection preview" />
              </button>
            </div>
          </div>
          <div className="screen-actions">
            <button className="secondary-button" id="character-back" type="button">Back</button>
            <button className="primary-button" id="character-next" type="button">Next: Stage</button>
          </div>
        </section>

        <section className="screen selection-screen" id="screen-stage">
          <div className="panel-head panel-head-centered">
            <h2 className="selection-title">Stage Selection</h2>
            <p className="selection-subtitle" id="stage-character-label">Selected Fighter: Default</p>
          </div>
          <div className="character-selection-layout stage-selection-layout">
            <div className="character-preview-panel stage-selected-character">
              <img id="stage-character-sprite" className="stage-character-sprite" src="assets/actions/default/default-idle-position.gif" alt="Default idle preview" />
              <div>
                <p className="character-preview-kicker">Current Fighter</p>
                <h3 id="stage-character-name" className="character-preview-name">Default</h3>
              </div>
            </div>
            <div className="selection-grid stage-grid stage-selection-grid" id="stage-grid">
              <button className="choice-card is-selected" data-stage="car" type="button">
                <div className="stage-preview stage-preview-car">
                  <div className="stage-preview-car-body"></div>
                  <div className="stage-preview-car-roof"></div>
                  <div className="stage-preview-car-wheel left"></div>
                  <div className="stage-preview-car-wheel right"></div>
                </div>
                <span>Car</span>
              </button>
              <button className="choice-card" data-stage="wooden-box" type="button">
                <div className="stage-preview stage-preview-box">
                  <div className="crate-preview"></div>
                </div>
                <span>Wooden Box</span>
              </button>
            </div>
          </div>
          <div className="screen-actions">
            <button className="secondary-button" id="stage-back" type="button">Back</button>
            <button className="primary-button" id="stage-start" type="button">Start Fight</button>
          </div>
        </section>

        <section className="screen screen-game" id="screen-game">
          <div className="game-area">
            <div className="arena" id="arena">
              <div className="ground"></div>
              <div className="target-wrap" id="target-wrap">
                <div className="target-shadow"></div>
                <div className="target stage-car" id="target-object" aria-hidden="true"></div>
                <div className="target-hit-flash" id="target-hit-flash"></div>
                <div className="target-particles" id="target-particles"></div>
              </div>

              <div className="fighter-wrap" id="fighter-wrap">
                <img id="fighter-sprite" alt="Fighter sprite" />
              </div>

              <div className="controls-overlay">
                <div className="dpad" aria-label="Direction controls">
                  <span className="dpad-gap dpad-up-left" aria-hidden="true"></span>
                  <button className="control-button dpad-up" data-action="jump" type="button">↑</button>
                  <span className="dpad-gap dpad-up-right" aria-hidden="true"></span>
                  <button className="control-button dpad-left" data-action="moveLeft" type="button">←</button>
                  <div className="joystick-core" aria-hidden="true"></div>
                  <button className="control-button dpad-right" data-action="moveRight" type="button">→</button>
                  <span className="dpad-gap dpad-down-left" aria-hidden="true"></span>
                  <button className="control-button dpad-down" data-action="crouch" type="button">↓</button>
                  <span className="dpad-gap dpad-down-right" aria-hidden="true"></span>
                </div>
                <div className="action-pad" aria-label="Action controls">
                  <button className="control-button action-punch" data-action="punch" type="button">Punch</button>
                  <button className="control-button action-kick" data-action="kick" type="button">Kick</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="orientation-lock" aria-hidden="true">
        <div className="orientation-lock-card">
          <p className="orientation-lock-kicker">Mobile Layout</p>
          <h2>Rotate to Landscape</h2>
          <p>Street Buster is tuned for landscape play on phones.</p>
        </div>
      </div>

      <div className="overlay" id="result-overlay" hidden>
        <div className="result-card">
          <p className="section-label" id="result-label">Result</p>
          <h2 id="result-title">You win</h2>
          <p id="result-copy"></p>
          <div className="result-actions">
            <button className="secondary-button" id="result-choose-again" type="button">Choose Again</button>
            <button className="primary-button" id="result-play-again" type="button">Play Again</button>
          </div>
        </div>
      </div>
    </div>
  );
}
