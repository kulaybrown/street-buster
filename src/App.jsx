import { useEffect, useRef } from "react";

const SPRITES = {
  default: {
    idle: "assets/actions/default/default-idle-position.gif",
    celebPost: "assets/actions/default/celeb-post.gif",
    meteorPunch: "assets/actions/default/meteor-punch.gif",
    impactBurst: "assets/actions/default/impact-burst.gif",
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

const BALANCED_CHARACTER_STATS = {
  strength: 5,
  agility: 5,
};

const CHARACTER_STATS = {
  default: {
    strength: 5,
    agility: 5,
  },
  "female-hulk": {
    strength: 7,
    agility: 4,
  },
};

const LOCKED_CHARACTERS = new Set(["female-hulk"]);

const MAX_EQUIPPED_SKILLS = 2;

const SKILLS_BY_ID = {
  meteorPunch: {
    id: "meteorPunch",
    name: "Meteor Punch",
    icon: "MP",
    description: "Fly up and slam the roof in 1s with 20% AOE.",
    type: "active",
    durationMs: 0,
    cooldownMs: 12000,
  },
  breaker: {
    id: "breaker",
    name: "Breaker",
    icon: "BR",
    description: "Activate +15 Strength for 7s (15s cooldown).",
    type: "active",
    strengthBonus: 15,
    durationMs: 7000,
    cooldownMs: 15000,
  },
  accelerate: {
    id: "accelerate",
    name: "Accelerate",
    icon: "AC",
    description: "Activate +30 Agility for 7s (15s cooldown).",
    type: "active",
    agilityBonus: 30,
    durationMs: 7000,
    cooldownMs: 15000,
  },
  impactBurst: {
    id: "impactBurst",
    name: "Impact Burst",
    icon: "IB",
    description: "AOE burst: near target +22%, otherwise +15%.",
    type: "active",
    cooldownMs: 10000,
    durationMs: 0,
  },
};

const CHARACTER_SKILLS = {
  default: ["meteorPunch", "breaker", "accelerate", "impactBurst"],
  "female-hulk": [],
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
      equippedSkillIds: [],
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
      impactBurstTimer: null,
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
      skillRuntime: {
        meteorPunch: {
          activeUntil: 0,
          cooldownUntil: 0,
        },
        breaker: {
          activeUntil: 0,
          cooldownUntil: 0,
        },
        accelerate: {
          activeUntil: 0,
          cooldownUntil: 0,
        },
        impactBurst: {
          activeUntil: 0,
          cooldownUntil: 0,
        },
      },
      meteorStrike: {
        active: false,
        impacted: false,
        startTime: 0,
        durationMs: 1000,
        startOffsetX: 0,
        targetOffsetX: 0,
        exitOffsetX: 0,
        rotationDir: 1,
      },
    };

    const listeners = [];
    const pressedArrows = new Set();

    const q = (selector) => root.querySelector(selector);
    const qa = (selector) => Array.from(root.querySelectorAll(selector));

    const getCharacterSkillIds = (character) => CHARACTER_SKILLS[character] || [];

    const getCharacterSkillSet = (character) => new Set(getCharacterSkillIds(character));

    const sanitizeEquippedSkills = () => {
      const allowed = getCharacterSkillSet(state.character);
      state.equippedSkillIds = state.equippedSkillIds
        .filter((skillId) => allowed.has(skillId))
        .slice(0, MAX_EQUIPPED_SKILLS);
    };

    const hasEquippedSkill = (skillId) => state.equippedSkillIds.includes(skillId);

    const isSkillEffectActive = (skillId) => {
      if (!hasEquippedSkill(skillId)) {
        return false;
      }
      const runtime = state.skillRuntime[skillId];
      if (!runtime) {
        return false;
      }
      return performance.now() <= runtime.activeUntil;
    };

    const getRuntimeSkillBonusStats = () => {
      const now = performance.now();
      const bonus = {
        strength: 0,
        agility: 0,
      };

      ["breaker", "accelerate"].forEach((skillId) => {
        if (!hasEquippedSkill(skillId)) {
          return;
        }

        const runtime = state.skillRuntime[skillId];
        if (!runtime || now > runtime.activeUntil) {
          return;
        }

        const skill = SKILLS_BY_ID[skillId];
        bonus.strength += skill?.strengthBonus || 0;
        bonus.agility += skill?.agilityBonus || 0;
      });

      return bonus;
    };

    const resetSkillRuntime = () => {
      ["meteorPunch", "breaker", "accelerate", "impactBurst"].forEach((skillId) => {
        if (state.skillRuntime[skillId]) {
          state.skillRuntime[skillId].activeUntil = 0;
          state.skillRuntime[skillId].cooldownUntil = 0;
        }
      });
    };

    const getCharacterStats = (character) => {
      const stats = CHARACTER_STATS[character] || BALANCED_CHARACTER_STATS;
      const strength = Number.isFinite(stats.strength) ? stats.strength : BALANCED_CHARACTER_STATS.strength;
      const agility = Number.isFinite(stats.agility) ? stats.agility : BALANCED_CHARACTER_STATS.agility;

      return {
        strength: Math.max(1, strength),
        agility: Math.max(1, agility),
      };
    };

    const getCurrentCharacterStats = () => {
      const base = getCharacterStats(state.character);
      const runtimeBonus = getRuntimeSkillBonusStats();

      return {
        strength: Math.max(1, base.strength + runtimeBonus.strength),
        agility: Math.max(1, base.agility + runtimeBonus.agility),
      };
    };

    const getCurrentCharacterBaseStats = () => getCharacterStats(state.character);

    const formatStatsLabel = (stats) => `STR ${stats.strength} | AGI ${stats.agility}`;

    const getAgilityMultiplier = () => getCurrentCharacterStats().agility / BALANCED_CHARACTER_STATS.agility;

    const getStrengthMultiplier = () => getCurrentCharacterStats().strength / BALANCED_CHARACTER_STATS.strength;

    const getCurrentJumpDuration = () => {
      const agilityMultiplier = getAgilityMultiplier();
      const scaledDuration = Math.round(860 / Math.max(0.5, agilityMultiplier));
      return Math.max(620, Math.min(980, scaledDuration));
    };

    const elements = {
      screens: {
        start: q("#screen-start"),
        character: q("#screen-character"),
        skill: q("#screen-skill"),
        stage: q("#screen-stage"),
        game: q("#screen-game"),
      },
      startButton: q("#start-button"),
      characterBack: q("#character-back"),
      characterNext: q("#character-next"),
      skillBack: q("#skill-back"),
      skillNext: q("#skill-next"),
      skillHint: q("#skill-selection-hint"),
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
      meteorImpactFlash: q("#meteor-impact-flash"),
      impactBurstWave: q("#impact-burst-wave"),
      characterPreviewSprite: q("#character-preview-sprite"),
      characterPreviewName: q("#character-preview-name"),
      characterPreviewStats: q("#character-preview-stats"),
      stageCharacterSprite: q("#stage-character-sprite"),
      stageCharacterName: q("#stage-character-name"),
      stageCharacterStats: q("#stage-character-stats"),
      stageCharacterLabel: q("#stage-character-label"),
      appShell: q(".app-shell"),
      skillButtons: [q("#skill-slot-1"), q("#skill-slot-2")],
      characterCards: qa("#character-grid .choice-card"),
      skillCards: qa("#skill-grid .skill-card"),
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
      sanitizeEquippedSkills();
      const stats = getCurrentCharacterBaseStats();
      const statsLabel = formatStatsLabel(stats);
      const availableSkillSet = getCharacterSkillSet(state.character);

      elements.characterCards.forEach((card) => {
        card.classList.toggle("is-selected", card.dataset.character === state.character);
        const character = card.dataset.character;
        const locked = LOCKED_CHARACTERS.has(character);
        card.classList.toggle("is-locked", locked);
        card.disabled = locked;
      });

      const reachedSkillLimit = state.equippedSkillIds.length >= MAX_EQUIPPED_SKILLS;
      elements.skillCards.forEach((card) => {
        const skillId = card.dataset.skill;
        const canUseForCharacter = availableSkillSet.has(skillId);
        const selected = state.equippedSkillIds.includes(skillId);
        const disabledForLimit = !selected && reachedSkillLimit;

        card.classList.toggle("is-selected", selected);
        card.classList.toggle("is-disabled", !canUseForCharacter || disabledForLimit);
        card.disabled = !canUseForCharacter || disabledForLimit;
      });

      if (elements.skillHint) {
        const selectedCount = state.equippedSkillIds.length;
        elements.skillHint.textContent = `${selectedCount}/${MAX_EQUIPPED_SKILLS} equipped`;
      }

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
      if (elements.characterPreviewStats) {
        elements.characterPreviewStats.textContent = statsLabel;
      }
      if (elements.stageCharacterSprite) {
        elements.stageCharacterSprite.src = SPRITES[state.character].idle;
        elements.stageCharacterSprite.alt = `${CHARACTER_LABELS[state.character]} idle preview`;
      }
      if (elements.stageCharacterName) {
        elements.stageCharacterName.textContent = CHARACTER_LABELS[state.character];
      }
      if (elements.stageCharacterStats) {
        elements.stageCharacterStats.textContent = statsLabel;
      }
      if (elements.stageCharacterLabel) {
        elements.stageCharacterLabel.textContent = `Selected Fighter: ${CHARACTER_LABELS[state.character]}`;
      }
    }

    function updateHud() {
      const stats = getCurrentCharacterStats();
      const equippedSkillNames = state.equippedSkillIds.map((skillId) => SKILLS_BY_ID[skillId]?.name).filter(Boolean);
      if (elements.hudCharacter) {
        elements.hudCharacter.textContent = `Character: ${CHARACTER_LABELS[state.character]} (${formatStatsLabel(stats)})`;
      }
      if (elements.hudStage) {
        const skillText = equippedSkillNames.length > 0 ? ` | Skills: ${equippedSkillNames.join(", ")}` : "";
        elements.hudStage.textContent = `Stage: ${STAGES[state.stage].label}${skillText}`;
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
      updateSkillButtons();
    }

    function updateSkillButtons() {
      const now = performance.now();

      if (elements.fighterWrap) {
        const breakerRuntime = state.skillRuntime.breaker;
        const accelerateRuntime = state.skillRuntime.accelerate;
        const breakerActive = hasEquippedSkill("breaker") && breakerRuntime && now <= breakerRuntime.activeUntil;
        const accelerateActive =
          hasEquippedSkill("accelerate") && accelerateRuntime && now <= accelerateRuntime.activeUntil;

        elements.fighterWrap.classList.toggle("glow-breaker", Boolean(breakerActive));
        elements.fighterWrap.classList.toggle("glow-accelerate", Boolean(accelerateActive));
      }

      elements.skillButtons.forEach((button, slotIndex) => {
        if (!button) {
          return;
        }

        const skillId = state.equippedSkillIds[slotIndex];
        const skill = skillId ? SKILLS_BY_ID[skillId] : null;
        const runtime = skillId ? state.skillRuntime[skillId] : null;
        const iconEl = button.querySelector(".skill-slot-icon");
        const nameEl = button.querySelector(".skill-slot-name");
        const cdEl = button.querySelector(".skill-slot-cd");

        if (!skill || !runtime) {
          button.disabled = true;
          button.classList.remove("is-cooling", "is-active");
          button.style.setProperty("--skill-cooldown-progress", "0%");
          if (iconEl) {
            iconEl.textContent = slotIndex === 0 ? "S1" : "S2";
          }
          if (nameEl) {
            nameEl.textContent = "Empty";
          }
          if (cdEl) {
            cdEl.textContent = "Ready";
          }
          return;
        }

        const remainingMs = Math.max(0, runtime.cooldownUntil - now);
        const cooldownMs = Math.max(1, skill.cooldownMs || 1);
        const ratio = Math.min(1, remainingMs / cooldownMs);
        const active = now <= runtime.activeUntil;

        button.disabled = false;
        button.classList.toggle("is-cooling", remainingMs > 0);
        button.classList.toggle("is-active", active);
        button.style.setProperty("--skill-cooldown-progress", `${Math.round(ratio * 100)}%`);

        if (iconEl) {
          iconEl.textContent = skill.icon || "SK";
        }
        if (nameEl) {
          nameEl.textContent = skill.name;
        }
        if (cdEl) {
          if (active && skill.durationMs > 0) {
            const activeLeft = Math.max(0, runtime.activeUntil - now);
            cdEl.textContent = `On ${Math.ceil(activeLeft / 1000)}s`;
          } else if (remainingMs > 0) {
            cdEl.textContent = `CD ${Math.ceil(remainingMs / 1000)}s`;
          } else {
            cdEl.textContent = "Ready";
          }
        }
      });
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
      if (state.impactBurstTimer) {
        window.clearTimeout(state.impactBurstTimer);
        state.impactBurstTimer = null;
      }
      if (state.frameId) {
        window.cancelAnimationFrame(state.frameId);
        state.frameId = null;
      }
      state.meteorStrike.active = false;
      state.meteorStrike.impacted = false;
      setMeteorFlightVisualState(false);
    }

    function setMeteorFlightVisualState(active) {
      if (elements.arena) {
        elements.arena.style.overflow = active ? "visible" : "";
      }
      if (elements.screens?.game) {
        elements.screens.game.style.overflow = active ? "visible" : "";
      }
      if (elements.appShell) {
        elements.appShell.style.overflow = active ? "visible" : "";
      }
      if (elements.fighterWrap) {
        elements.fighterWrap.style.zIndex = active ? "40" : "";
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

    function getAnchorForCarPart(partKey) {
      const byPart = {
        leftDoor: { x: 34, y: 62 },
        rightDoor: { x: 61, y: 62 },
        roof: { x: 50, y: 30 },
      };
      return byPart[partKey] || { x: 50, y: 50 };
    }

    function getAttackAnchorForTargetWrap() {
      const attackPoint = getAttackPoint();
      const arenaRect = elements.arena?.getBoundingClientRect();
      const targetRect = elements.targetWrap?.getBoundingClientRect();
      if (!attackPoint || !arenaRect || !targetRect || targetRect.width <= 0 || targetRect.height <= 0) {
        return { x: 50, y: 50 };
      }

      const localX = attackPoint.x - (targetRect.left - arenaRect.left);
      const localY = attackPoint.y - (targetRect.top - arenaRect.top);
      const x = Math.max(8, Math.min(92, (localX / targetRect.width) * 100));
      const y = Math.max(8, Math.min(92, (localY / targetRect.height) * 100));

      return { x, y };
    }

    function getNearBurstRatio() {
      const attackPoint = getAttackPoint();
      const arenaRect = elements.arena?.getBoundingClientRect();
      const targetRect = elements.targetWrap?.getBoundingClientRect();
      if (!attackPoint || !arenaRect || !targetRect) {
        return 0.15;
      }

      const targetCenter = {
        x: targetRect.left - arenaRect.left + targetRect.width * 0.5,
        y: targetRect.top - arenaRect.top + targetRect.height * 0.64,
      };
      const distance = Math.hypot(attackPoint.x - targetCenter.x, (attackPoint.y - targetCenter.y) * 1.15);
      return distance <= 110 ? 0.22 : 0.15;
    }

    function getImpactBurstBonusRatio(hitPart, mappedAction) {
      if (state.stage === "car") {
        const nearTarget = state.onRoof || hitPart === "roof" || mappedAction.startsWith("jump");
        return nearTarget ? 0.22 : 0.15;
      }

      return getNearBurstRatio();
    }

    function castImpactBurst() {
      if (!state.running || state.targetBroken) {
        return;
      }

      state.action = "impactBurst";
      setSprite("impactBurst");
      window.clearTimeout(state.actionTimer);
      state.actionTimer = window.setTimeout(() => {
        state.actionTimer = null;
        returnToRestingPose();
      }, 720);

      if (state.impactBurstTimer) {
        window.clearTimeout(state.impactBurstTimer);
      }

      state.impactBurstTimer = window.setTimeout(() => {
        state.impactBurstTimer = null;
        if (!state.running || state.targetBroken) {
          return;
        }

        triggerImpactBurstWave();

        const strengthMultiplier = Math.max(0.5, Math.min(2, getStrengthMultiplier()));
        const targetHealthBefore = state.targetHealth;
        const hitAnchors = [];

        if (state.stage === "car" && state.carPartHealth) {
          const nearRatio = state.onRoof ? 0.22 : getNearBurstRatio();
          const splashRatio = 0.15;
          const focusPart = state.onRoof
            ? "roof"
            : getCurrentFighterCenterX() <= getArenaMetrics().carCenterX
              ? "leftDoor"
              : "rightDoor";

          Object.entries(CAR_PARTS).forEach(([partKey, partMeta]) => {
            if (state.carPartHealth[partKey] <= 0) {
              return;
            }
            const ratio = partKey === focusPart ? nearRatio : splashRatio;
            const before = state.carPartHealth[partKey];
            const damage = Math.max(1, Math.round(partMeta.maxHealth * ratio * strengthMultiplier));
            state.carPartHealth[partKey] = Math.max(0, state.carPartHealth[partKey] - damage);
            if (state.carPartHealth[partKey] < before) {
              hitAnchors.push(getAnchorForCarPart(partKey));
            }
          });

          state.targetHealth = Object.values(state.carPartHealth).reduce((sum, health) => sum + health, 0);
        } else {
          const nearRatio = getNearBurstRatio();
          const burstDamage = Math.max(1, Math.round(state.targetMaxHealth * nearRatio * strengthMultiplier));
          state.targetHealth = Math.max(0, state.targetHealth - burstDamage);
          if (burstDamage > 0) {
            hitAnchors.push(getAttackAnchorForTargetWrap());
          }
        }

        const actualDamageDone = Math.max(0, targetHealthBefore - state.targetHealth);
        if (actualDamageDone > 0) {
          state.score += actualDamageDone * 100;
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
          spawnParticles(hitAnchors);
        }

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
      }, 400);
    }

    function castMeteorPunch() {
      if (!state.running || state.targetBroken) {
        return;
      }

      if (state.meteorStrike.active) {
        return;
      }

      const metrics = getArenaMetrics();
      const roofCenterOffset = metrics.carCenterX - metrics.baseLeft - metrics.fighterWidth * 0.5;
      const currentOffset = state.moveOffsetX;
      const targetOffsetX = state.stage === "car" ? clampRoofOffset(roofCenterOffset) : clampGroundOffset(roofCenterOffset);

      state.crouching = false;
      state.airborne = false;
      state.onRoof = false;
      state.walkVelocity = 0;
      state.keyWalkAxis = 0;
      state.buttonWalkAxis = 0;
      state.jumpFromRoof = false;
      state.jumpLandOnRoof = false;
      state.jumpAllowsAirSteer = false;

      state.action = "meteorPunch";
      setSprite("meteorPunch");

      state.meteorStrike.active = true;
      state.meteorStrike.impacted = false;
      state.meteorStrike.startTime = performance.now();
      state.meteorStrike.startOffsetX = currentOffset;
      state.meteorStrike.targetOffsetX = targetOffsetX;
      state.meteorStrike.exitOffsetX = currentOffset;
      state.meteorStrike.rotationDir = 1;
      setMeteorFlightVisualState(true);

      updateHud();
    }

    function applyMeteorImpactDamage() {
      if (!state.running || state.targetBroken) {
        return;
      }

      triggerMeteorGroundExplosion();

      const strengthMultiplier = Math.max(0.5, Math.min(2, getStrengthMultiplier()));
      const targetHealthBefore = state.targetHealth;
      const hitAnchors = [];

      if (state.stage === "car" && state.carPartHealth) {
        Object.entries(CAR_PARTS).forEach(([partKey, partMeta]) => {
          if (state.carPartHealth[partKey] <= 0) {
            return;
          }
          const before = state.carPartHealth[partKey];
          const damage = Math.max(1, Math.round(partMeta.maxHealth * 0.2 * strengthMultiplier));
          state.carPartHealth[partKey] = Math.max(0, state.carPartHealth[partKey] - damage);
          if (state.carPartHealth[partKey] < before) {
            hitAnchors.push(getAnchorForCarPart(partKey));
          }
        });

        state.targetHealth = Object.values(state.carPartHealth).reduce((sum, health) => sum + health, 0);
      } else {
        const burstDamage = Math.max(1, Math.round(state.targetMaxHealth * 0.2 * strengthMultiplier));
        state.targetHealth = Math.max(0, state.targetHealth - burstDamage);
        if (burstDamage > 0) {
          hitAnchors.push(getAttackAnchorForTargetWrap());
        }
      }

      const actualDamageDone = Math.max(0, targetHealthBefore - state.targetHealth);
      if (actualDamageDone > 0) {
        state.score += actualDamageDone * 100;
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
        spawnParticles(hitAnchors);
      }

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

    function tryUseSkillAtSlot(slotIndex) {
      const skillId = state.equippedSkillIds[slotIndex];
      if (!skillId) {
        return;
      }

      const skill = SKILLS_BY_ID[skillId];
      if (!skill || skill.type !== "active") {
        return;
      }

      const runtime = state.skillRuntime[skillId];
      if (!runtime) {
        return;
      }

      const now = performance.now();
      if (now < runtime.cooldownUntil) {
        return;
      }

      runtime.cooldownUntil = now + (skill.cooldownMs || 0);

      if (skillId === "breaker" || skillId === "accelerate") {
        runtime.activeUntil = now + (skill.durationMs || 0);
      } else if (skillId === "meteorPunch") {
        runtime.activeUntil = now + state.meteorStrike.durationMs;
        castMeteorPunch();
      } else if (skillId === "impactBurst") {
        runtime.activeUntil = now;
        castImpactBurst();
      }

      updateHud();
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

    function spawnParticles(anchors = [{ x: 50, y: 50 }]) {
      if (!elements.targetParticles) {
        return;
      }
      elements.targetParticles.innerHTML = "";

      const burstAnchors = Array.isArray(anchors) && anchors.length > 0 ? anchors : [{ x: 50, y: 50 }];

      const sparkPalette = state.stage === "car"
        ? ["#ff4e57", "#161616", "#f3b54a", "#ffd98a"]
        : ["#d03535", "#181818", "#f3b54a", "#c98a47"];
      const debrisPalette = state.stage === "car"
        ? ["#0e0e10", "#1f2024", "#7f0f0f", "#b62222", "#40465a"]
        : ["#130d0d", "#3c1212", "#8a2a22", "#7a4a24", "#5a3519"];

      burstAnchors.forEach((anchor) => {
        for (let index = 0; index < 8; index += 1) {
          const particle = document.createElement("span");
          particle.className = "particle";
          const angle = Math.random() * Math.PI * 2;
          const distance = 34 + Math.random() * 88;
          particle.style.left = `${anchor.x - 6 + Math.random() * 12}%`;
          particle.style.top = `${anchor.y - 8 + Math.random() * 16}%`;
          particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
          particle.style.setProperty("--dy", `${Math.sin(angle) * distance * -0.72 - 20}px`);
          particle.style.background = sparkPalette[index % sparkPalette.length];
          elements.targetParticles.appendChild(particle);
        }
      });

      burstAnchors.forEach((anchor) => {
        for (let index = 0; index < 10; index += 1) {
          const debris = document.createElement("span");
          debris.className = "particle debris";

          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.9;
          const distance = 78 + Math.random() * 132;
          const spinDeg = (Math.random() * 2 - 1) * 560;

          debris.style.left = `${anchor.x - 9 + Math.random() * 18}%`;
          debris.style.top = `${anchor.y - 10 + Math.random() * 20}%`;
          debris.style.width = `${8 + Math.random() * 9}px`;
          debris.style.height = `${6 + Math.random() * 8}px`;
          debris.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
          debris.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
          debris.style.setProperty("--spin", `${spinDeg}deg`);
          debris.style.background = debrisPalette[index % debrisPalette.length];
          debris.style.borderRadius = `${1 + Math.random() * 2}px`;
          debris.style.animationDelay = `${Math.random() * 80}ms`;

          elements.targetParticles.appendChild(debris);
        }
      });
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

    function triggerMeteorGroundExplosion() {
      if (elements.meteorImpactFlash) {
        elements.meteorImpactFlash.animate(
          [
            { opacity: 0, transform: "translate(-50%, -50%) scale(0.2)", filter: "blur(1px)" },
            { opacity: 0.96, transform: "translate(-50%, -50%) scale(0.88)", filter: "blur(0px)" },
            { opacity: 0.74, transform: "translate(-50%, -50%) scale(1.38)", filter: "blur(1.2px)" },
            { opacity: 0, transform: "translate(-50%, -50%) scale(2.9)", filter: "blur(2px)" },
          ],
          { duration: 560, easing: "cubic-bezier(0.12, 0.78, 0.2, 1)" },
        );
      }

      if (elements.targetWrap) {
        elements.targetWrap.animate(
          [
            { transform: "translateX(-50%) scale(1, 1)" },
            { transform: "translateX(-50%) scale(1.035, 0.95)" },
            { transform: "translateX(-50%) scale(0.985, 1.03)" },
            { transform: "translateX(-50%) scale(1, 1)" },
          ],
          { duration: 420, easing: "cubic-bezier(0.2, 0.7, 0.22, 1)" },
        );
      }

      if (elements.targetObject) {
        elements.targetObject.animate(
          [
            { filter: "brightness(1) saturate(1)", transform: "scale(1)" },
            { filter: "brightness(1.3) saturate(1.25)", transform: "scale(1.03)" },
            { filter: "brightness(0.86) saturate(1.08)", transform: "scale(0.985)" },
            { filter: "brightness(1) saturate(1)", transform: "scale(1)" },
          ],
          { duration: 460, easing: "cubic-bezier(0.17, 0.67, 0.22, 1)" },
        );
      }

      if (elements.arena) {
        elements.arena.animate(
          [
            { transform: "translateX(0px)" },
            { transform: "translateX(-10px)" },
            { transform: "translateX(9px)" },
            { transform: "translateX(-6px)" },
            { transform: "translateX(4px)" },
            { transform: "translateX(0px)" },
          ],
          { duration: 300, easing: "ease-out" },
        );
      }
    }

    function triggerImpactBurstWave() {
      if (!elements.impactBurstWave) {
        return;
      }

      const fromLeft = state.moveOffsetX <= getArenaMetrics().carCenterX;
      elements.impactBurstWave.animate(
        [
          {
            opacity: 0,
            filter: "blur(2px)",
            transform: `translateX(${fromLeft ? "-120%" : "120%"}) scaleX(0.2) scaleY(0.84)`,
          },
          {
            opacity: 0.98,
            filter: "blur(0px)",
            transform: "translateX(0%) scaleX(1.08) scaleY(1)",
          },
          {
            opacity: 0.48,
            filter: "blur(1px)",
            transform: `translateX(${fromLeft ? "70%" : "-70%"}) scaleX(1.24) scaleY(0.94)`,
          },
          {
            opacity: 0,
            filter: "blur(2px)",
            transform: `translateX(${fromLeft ? "120%" : "-120%"}) scaleX(0.86) scaleY(0.88)`,
          },
        ],
        { duration: 560, easing: "cubic-bezier(0.16, 0.74, 0.2, 1)" },
      );

      if (elements.targetWrap) {
        elements.targetWrap.animate(
          [
            { transform: "translateX(-50%) scale(1)" },
            { transform: "translateX(-50%) scale(1.02)" },
            { transform: "translateX(-50%) scale(0.992)" },
            { transform: "translateX(-50%) scale(1)" },
          ],
          { duration: 420, easing: "cubic-bezier(0.21, 0.72, 0.22, 1)" },
        );
      }

      if (elements.arena) {
        elements.arena.animate(
          [
            { filter: "brightness(1)" },
            { filter: "brightness(1.08)" },
            { filter: "brightness(1)" },
          ],
          { duration: 280, easing: "ease-out" },
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

      const strengthMultiplier = Math.max(0.5, Math.min(2, getStrengthMultiplier()));
      const baseScaledAmount = Math.max(1, Math.round(amount * strengthMultiplier));
      const targetHealthBefore = state.targetHealth;
      const hitAnchors = [];

      if (state.stage === "car") {
        const hitPart = resolveCarPartHit(mappedAction);
        if (!hitPart || !state.carPartHealth) {
          state.combo = 0;
          updateTargetVisual();
          return;
        }

        const impactBurstBonusRatio = getImpactBurstBonusRatio(hitPart, mappedAction);
        let primaryDamage = baseScaledAmount;

        if (isSkillEffectActive("impactBurst")) {
          primaryDamage += Math.max(1, Math.round(baseScaledAmount * impactBurstBonusRatio));
        }

        const primaryBefore = state.carPartHealth[hitPart];
        state.carPartHealth[hitPart] = Math.max(0, state.carPartHealth[hitPart] - primaryDamage);
        if (state.carPartHealth[hitPart] < primaryBefore) {
          hitAnchors.push(getAnchorForCarPart(hitPart));
        }

        if (isSkillEffectActive("impactBurst")) {
          const splashDamage = Math.max(1, Math.round(baseScaledAmount * 0.15));
          Object.keys(state.carPartHealth).forEach((partKey) => {
            if (partKey === hitPart) {
              return;
            }
            const before = state.carPartHealth[partKey];
            state.carPartHealth[partKey] = Math.max(0, state.carPartHealth[partKey] - splashDamage);
            if (state.carPartHealth[partKey] < before) {
              hitAnchors.push(getAnchorForCarPart(partKey));
            }
          });
        }

        state.targetHealth = Object.values(state.carPartHealth).reduce((sum, health) => sum + health, 0);
      } else {
        if (!canReachTarget(mappedAction)) {
          state.combo = 0;
          updateTargetVisual();
          return;
        }

        const impactBurstBonusRatio = isSkillEffectActive("impactBurst") ? getNearBurstRatio() : 0;
        const scaledAmount = Math.max(1, Math.round(baseScaledAmount * (1 + impactBurstBonusRatio)));
        let totalDamage = scaledAmount;

        state.targetHealth = Math.max(0, state.targetHealth - totalDamage);
        if (totalDamage > 0) {
          hitAnchors.push(getAttackAnchorForTargetWrap());
        }
      }

      const actualDamageDone = Math.max(0, targetHealthBefore - state.targetHealth);

      state.score += actualDamageDone * 100;
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
      spawnParticles(hitAnchors);
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

      if (state.running && state.meteorStrike.active) {
        const meteor = state.meteorStrike;
        const progress = Math.min(1, (now - meteor.startTime) / meteor.durationMs);
        const upEnd = 0.45;
        const rotateEnd = 0.62;
        const roofLift = state.stage === "car" ? getRoofHeight() : 0;
        const viewportHeight = window.innerHeight || 900;
        const fighterHeight = elements.fighterWrap?.getBoundingClientRect().height || 220;
        // Push the fighter fully outside the visible viewport during meteor hang time.
        const offscreenHeight = Math.max(viewportHeight + fighterHeight * 2, window.innerWidth <= 560 ? 760 : 980);
        let xOffset = meteor.startOffsetX;
        let yOffset = 0;
        let rotationDeg = 0;

        if (progress <= upEnd) {
          const upT = progress / upEnd;
          const easedUpT = 1 - (1 - upT) * (1 - upT);
          xOffset = meteor.startOffsetX;
          yOffset = -offscreenHeight * easedUpT;
          rotationDeg = 0;
        } else if (progress <= rotateEnd) {
          const spinT = (progress - upEnd) / (rotateEnd - upEnd);
          xOffset = meteor.startOffsetX + (meteor.targetOffsetX - meteor.startOffsetX) * spinT;
          yOffset = -offscreenHeight;
          rotationDeg = 180 * spinT;
        } else {
          const downT = (progress - rotateEnd) / (1 - rotateEnd);
          const easedDownT = downT * downT;
          xOffset = meteor.targetOffsetX;
          yOffset = -offscreenHeight + (offscreenHeight - roofLift) * easedDownT;
          rotationDeg = 180;
        }

        const fighterCenterX = getCurrentFighterCenterX(xOffset);
        const targetCenterX = getArenaMetrics().carCenterX;
        const facingScaleX = fighterCenterX <= targetCenterX ? 1 : -1;

        if (elements.fighterWrap) {
          elements.fighterWrap.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0) rotate(${rotationDeg}deg) scaleX(${facingScaleX})`;
        }

        if (progress >= 1 && !meteor.impacted) {
          meteor.impacted = true;
          state.moveOffsetX = state.stage === "car" ? clampRoofOffset(meteor.targetOffsetX) : clampGroundOffset(meteor.targetOffsetX);
          state.onRoof = state.stage === "car";
          applyMeteorImpactDamage();
          returnToRestingPose();
          meteor.active = false;
          setMeteorFlightVisualState(false);
        }

        updateSkillButtons();
        state.frameId = window.requestAnimationFrame(updateFighterPosition);
        return;
      }

      if (state.running && !state.airborne) {
        const agilityMultiplier = Math.max(0.7, Math.min(1.4, getAgilityMultiplier()));
        const walkAxis = getWalkAxis();
        const targetVelocity = walkAxis * (state.crouching ? 0.24 : 0.45) * agilityMultiplier;
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
      updateSkillButtons();
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
      state.meteorStrike.active = false;
      state.meteorStrike.impacted = false;
      setMeteorFlightVisualState(false);
      state.walkVelocity = 0;
      state.keyWalkAxis = 0;
      state.buttonWalkAxis = 0;
      state.lastFrameTime = 0;
      state.attackCooldownByAction.punch = 0;
      state.attackCooldownByAction.kick = 0;
      resetSkillRuntime();
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

      if (state.meteorStrike.active) {
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

      if (action === "skill1") {
        tryUseSkillAtSlot(0);
        return;
      }

      if (action === "skill2") {
        tryUseSkillAtSlot(1);
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
        state.jumpDuration = getCurrentJumpDuration();
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
        state.jumpDuration = getCurrentJumpDuration();
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
        const agilityMultiplier = Math.max(0.65, Math.min(1.5, getAgilityMultiplier()));
        const cooldownMs = Math.round(Math.max(280, 500 / agilityMultiplier));
        if (now < state.attackCooldownByAction[action]) {
          return;
        }
        state.attackCooldownByAction[action] = now + cooldownMs;
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

    function goToSkillSelection() {
      setScreen("skill");
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
        const character = card.dataset.character;
        if (LOCKED_CHARACTERS.has(character)) {
          return;
        }
        state.character = character;
        sanitizeEquippedSkills();
        updateSelectionCards();
      });
    });

    elements.skillCards.forEach((card) => {
      on(card, "click", () => {
        const skillId = card.dataset.skill;
        const available = getCharacterSkillSet(state.character);
        if (!available.has(skillId)) {
          return;
        }

        if (state.equippedSkillIds.includes(skillId)) {
          state.equippedSkillIds = state.equippedSkillIds.filter((id) => id !== skillId);
          updateSelectionCards();
          return;
        }

        if (state.equippedSkillIds.length >= MAX_EQUIPPED_SKILLS) {
          return;
        }

        state.equippedSkillIds = [...state.equippedSkillIds, skillId];
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
    on(elements.characterNext, "click", goToSkillSelection);
    on(elements.skillBack, "click", goToCharacterSelection);
    on(elements.skillNext, "click", goToStageSelection);
    on(elements.stageBack, "click", goToSkillSelection);
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

      if (event.key === "c" || event.key === "v") {
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
      if (event.key === "c") {
        performAction("skill1");
        return;
      }
      if (event.key === "v") {
        performAction("skill2");
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
    sanitizeEquippedSkills();
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
              <p id="character-preview-stats" className="selection-subtitle">STR 5 | AGI 5</p>
            </div>
            <div className="selection-grid character-selection-grid" id="character-grid">
              <button className="choice-card character-choice-card is-selected" data-character="default" type="button">
                <img className="character-choice-image" src="assets/selection/select-default.gif" alt="Default selection preview" />
              </button>
              <button className="choice-card character-choice-card is-locked" data-character="female-hulk" type="button" disabled>
                <img className="character-choice-image" src="assets/selection/select-female-hulk.gif" alt="Female Hulk selection preview" />
                <span className="lock-badge">Locked</span>
              </button>
            </div>
          </div>
          <div className="screen-actions">
            <button className="secondary-button" id="character-back" type="button">Back</button>
            <button className="primary-button" id="character-next" type="button">Next: Skills</button>
          </div>
        </section>

        <section className="screen selection-screen" id="screen-skill">
          <div className="panel-head panel-head-centered">
            <h2 className="selection-title">Equip Skills</h2>
            <p className="selection-subtitle">Choose up to 2 skills</p>
          </div>
          <p className="selection-subtitle" id="skill-selection-hint">0/2 equipped</p>
          <div className="selection-grid skill-selection-grid" id="skill-grid">
            <button className="choice-card skill-card" data-skill="meteorPunch" type="button">
              <strong>MP Meteor Punch</strong>
              <span>Fly up and slam the roof.</span>
              <small>AOE 20% damage to all. 12s cooldown.</small>
            </button>
            <button className="choice-card skill-card" data-skill="breaker" type="button">
              <strong>BR Breaker</strong>
              <span>+15 Strength for 7s.</span>
              <small>15s cooldown.</small>
            </button>
            <button className="choice-card skill-card" data-skill="accelerate" type="button">
              <strong>AC Accelerate</strong>
              <span>+30 Agility for 7s.</span>
              <small>15s cooldown.</small>
            </button>
            <button className="choice-card skill-card" data-skill="impactBurst" type="button">
              <strong>IB Impact Burst</strong>
              <span>AOE burst: near +22%.</span>
              <small>Other hits +15%. 10s cooldown.</small>
            </button>
          </div>
          <div className="screen-actions">
            <button className="secondary-button" id="skill-back" type="button">Back</button>
            <button className="primary-button" id="skill-next" type="button">Next: Stage</button>
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
                <p id="stage-character-stats" className="selection-subtitle">STR 5 | AGI 5</p>
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
                <div className="meteor-impact-flash" id="meteor-impact-flash"></div>
              </div>

              <div className="impact-burst-wave" id="impact-burst-wave" aria-hidden="true"></div>

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
                  <button className="control-button action-skill" data-action="skill1" id="skill-slot-1" type="button">
                    <span className="skill-slot-icon">S1</span>
                    <span className="skill-slot-name">Empty</span>
                    <span className="skill-slot-cd">Ready</span>
                  </button>
                  <button className="control-button action-skill" data-action="skill2" id="skill-slot-2" type="button">
                    <span className="skill-slot-icon">S2</span>
                    <span className="skill-slot-name">Empty</span>
                    <span className="skill-slot-cd">Ready</span>
                  </button>
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
