import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";

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
  default: "Hero",
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
    iconSrc: "assets/skill-icons/meteor-punch.jpg",
    description: "Fly up and slam the roof in 1s with 20% AOE.",
    type: "active",
    durationMs: 0,
    cooldownMs: 12000,
    unlockGold: 1500,
  },
  breaker: {
    id: "breaker",
    name: "Breaker",
    icon: "BR",
    iconSrc: "assets/skill-icons/breaker.jpg",
    description: "Activate +15 Strength for 7s (15s cooldown).",
    type: "active",
    strengthBonus: 15,
    durationMs: 7000,
    cooldownMs: 15000,
    unlockGold: 0,
  },
  accelerate: {
    id: "accelerate",
    name: "Accelerate",
    icon: "AC",
    iconSrc: "assets/skill-icons/accelerate.jpg",
    description: "Activate +30 Agility for 7s (15s cooldown).",
    type: "active",
    agilityBonus: 30,
    durationMs: 7000,
    cooldownMs: 15000,
    unlockGold: 500,
  },
  impactBurst: {
    id: "impactBurst",
    name: "Impact Burst",
    icon: "IB",
    iconSrc: "assets/skill-icons/impact-burst.jpg",
    description: "AOE burst: near target +22%, otherwise +15%.",
    type: "active",
    cooldownMs: 10000,
    durationMs: 0,
    unlockGold: 1000,
  },
};

const CHARACTER_SKILLS = {
  default: ["breaker", "accelerate", "impactBurst", "meteorPunch"],
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

const END_ROUND_DELAY_MS = 3000;
const INFINITE_TIMER_MODE = true;
const ARENA_ENTITY_SCALE = 0.6;
const CAR_TARGET_SIZE_MULTIPLIER = 1.4;
const ROOF_STAND_DROP_PX = 35;
const TEMPORARILY_UNLOCK_ALL_SKILLS = true;
const METEOR_EFFECT_SIZE_MULTIPLIER = 2;
const STORAGE_KEYS = {
  highScore: "streetBuster.highScore",
  gold: "streetBuster.gold",
  unlockedSkills: "streetBuster.unlockedSkills",
};

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
      gold: 0,
      unlockedSkillIds: new Set(["breaker"]),
      stage: "car",
      score: 0,
      highScore: 0,
      combo: 0,
      timeLeft: 0,
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
      specialSkillSwapLockUntil: 0,
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
      postDestroyFilter: {
        applied: false,
        token: 0,
        until: 0,
      },
    };


    const listeners = [];
    const pressedArrows = new Set();

    const meteorExplosion = {
      initToken: 0,
      app: null,
      container: null,
      textures: null,
      particles: [],
      impactParticles: [],
      impactWaves: [],
      burstEffects: [],
      normalHitRings: [],
      impactWaveTimers: [],
      auraParticles: [],
      auraSpawnCarryBySkill: {
        breaker: 0,
        accelerate: 0,
      },
    };

    const victoryCelebration = {
      initToken: 0,
      app: null,
      fireworkContainer: null,
      confettiContainer: null,
      confettiParticles: [],
      fireworkRockets: [],
      fireworkShards: [],
      fireworkTimer: 0,
    };

    const q = (selector) => root.querySelector(selector);
    const qa = (selector) => Array.from(root.querySelectorAll(selector));

    const getCharacterSkillIds = (character) => CHARACTER_SKILLS[character] || [];

    const getCharacterSkillSet = (character) => new Set(getCharacterSkillIds(character));

    const getSkillUnlockCost = (skillId) => {
      const unlockCost = SKILLS_BY_ID[skillId]?.unlockGold;
      return Number.isFinite(unlockCost) && unlockCost > 0 ? Math.floor(unlockCost) : 0;
    };

    const isSkillUnlocked = (skillId) =>
      TEMPORARILY_UNLOCK_ALL_SKILLS || getSkillUnlockCost(skillId) === 0 || state.unlockedSkillIds.has(skillId);

    const saveProgress = () => {
      try {
        window.localStorage.setItem(STORAGE_KEYS.gold, String(Math.max(0, Math.floor(state.gold))));
        window.localStorage.setItem(STORAGE_KEYS.unlockedSkills, JSON.stringify(Array.from(state.unlockedSkillIds)));
      } catch {
        // Ignore storage failures.
      }
    };

    const sanitizeEquippedSkills = () => {
      const allowed = getCharacterSkillSet(state.character);
      state.equippedSkillIds = state.equippedSkillIds
        .filter((skillId) => allowed.has(skillId) && isSkillUnlocked(skillId))
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

    const isSpecialSkillSwapLocked = () => performance.now() < state.specialSkillSwapLockUntil;

    const setSpecialSkillSwapLock = (delayMs = 500) => {
      state.specialSkillSwapLockUntil = performance.now() + delayMs;
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
      hudGold: q("#hud-gold"),
      hudGoldValue: q("#hud-gold-value"),
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

    function createMeteorParticleTexture(color, size = 32) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return PIXI.Texture.WHITE;
      }

      const center = size / 2;
      const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.2, color);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      return PIXI.Texture.from(canvas);
    }

    function ensureMeteorExplosionTextures() {
      if (meteorExplosion.textures) {
        return meteorExplosion.textures;
      }

      meteorExplosion.textures = {
        core: createMeteorParticleTexture("rgba(255, 255, 230, 1)", 64),
        fire: createMeteorParticleTexture("rgba(255, 90, 0, 1)", 32),
        yellow: createMeteorParticleTexture("rgba(255, 210, 0, 1)", 24),
        spark: createMeteorParticleTexture("rgba(255, 255, 150, 1)", 8),
        smoke: createMeteorParticleTexture("rgba(40, 35, 35, 0.4)", 64),
        impactCrimson: createMeteorParticleTexture("rgba(255, 0, 51, 1)", 16),
        impactDarkRed: createMeteorParticleTexture("rgba(139, 0, 0, 0.95)", 16),
        impactWhite: createMeteorParticleTexture("rgba(255, 255, 255, 1)", 10),
        breakerRed: createMeteorParticleTexture("rgba(255, 56, 46, 0.46)", 50),
        breakerCore: createMeteorParticleTexture("rgba(255, 18, 18, 0.32)", 40),
        accelerateYellow: createMeteorParticleTexture("rgba(255, 234, 60, 0.52)", 50),
        accelerateGold: createMeteorParticleTexture("rgba(255, 185, 0, 0.38)", 40),
        auraSpark: createMeteorParticleTexture("rgba(255, 250, 215, 0.72)", 10),
      };

      return meteorExplosion.textures;
    }

    function updateImpactBurstParticles(delta) {
      const { impactParticles, impactWaves, burstEffects, normalHitRings, container } = meteorExplosion;
      if (!container) {
        return;
      }

      for (let index = impactWaves.length - 1; index >= 0; index -= 1) {
        const wave = impactWaves[index];
        wave.graphics.clear();

        wave.graphics.arc(0, 0, wave.radius, wave.startAngle, wave.endAngle);
        wave.graphics.stroke({
          color: 0x8b0000,
          width: Math.max(4, wave.width * wave.life),
          alpha: Math.max(0, wave.life),
          cap: "round",
        });

        wave.radius += 18 * delta;
        wave.life -= wave.decay * delta;

        if (wave.radius >= wave.maxRadius || wave.life <= 0) {
          container.removeChild(wave.graphics);
          wave.graphics.destroy();
          impactWaves.splice(index, 1);
        }
      }

      for (let index = burstEffects.length - 1; index >= 0; index -= 1) {
        const effect = burstEffects[index];
        effect.age += delta;
        const progress = effect.age / effect.lifespan;

        if (progress >= 1) {
          container.removeChild(effect.container);
          effect.container.destroy({ children: true });
          burstEffects.splice(index, 1);
          continue;
        }

        effect.flash.scale.set(Math.max(0.1, 1 - progress));
        effect.flash.alpha = Math.max(0, 1 - progress);

        const waveScale = 1 + progress * 11;
        effect.wave.scale.set(waveScale, waveScale * 0.9);
        effect.wave.alpha = Math.max(0, Math.sin(progress * Math.PI));

        effect.sparks.forEach((spark) => {
          const travel = spark.speed * effect.age;
          spark.element.x = Math.cos(spark.angle) * travel;
          spark.element.y = Math.sin(spark.angle) * travel;
          spark.element.alpha = Math.max(0, 1 - progress);
          spark.element.scale.x = 1 + progress * 2.5;
        });
      }

      for (let index = impactParticles.length - 1; index >= 0; index -= 1) {
        const particle = impactParticles[index];
        particle.sprite.x += particle.vx * delta;
        particle.sprite.y += particle.vy * delta;

        particle.vx *= 0.93;
        particle.vy *= 0.93;

        particle.life -= particle.decay * delta;
        particle.sprite.alpha = Math.max(0, particle.life);

        if (particle.isStreak) {
          particle.sprite.scale.x = Math.max(0.1, particle.life * 6);
        } else {
          const scale = Math.max(0.1, particle.baseScale * particle.life * 1.5);
          particle.sprite.scale.set(scale);
        }

        if (particle.life <= 0) {
          container.removeChild(particle.sprite);
          particle.sprite.destroy();
          impactParticles.splice(index, 1);
        }
      }

      for (let index = normalHitRings.length - 1; index >= 0; index -= 1) {
        const ring = normalHitRings[index];
        ring.age += delta;
        const progress = ring.age / ring.lifespan;

        if (progress >= 1) {
          container.removeChild(ring.graphics);
          ring.graphics.destroy();
          normalHitRings.splice(index, 1);
          continue;
        }

        const alpha = Math.max(0, 1 - progress);
        const radius = ring.baseRadius + progress * ring.expandDistance;
        ring.graphics.clear();
        ring.graphics.circle(0, 0, radius);
        ring.graphics.stroke({
          color: 0xffffff,
          width: Math.max(1.5, ring.strokeWidth * alpha),
          alpha,
        });
      }
    }

    function getAuraAnchorPoint() {
      const arenaRect = elements.arena?.getBoundingClientRect();
      const fighterRect = elements.fighterWrap?.getBoundingClientRect();
      if (!arenaRect || !fighterRect) {
        return {
          x: (elements.arena?.clientWidth || 0) * 0.3,
          y: (elements.arena?.clientHeight || 0) * 0.62,
          bodyWidth: 88,
          bodyHeight: 138,
        };
      }

      return {
        x: fighterRect.left - arenaRect.left + fighterRect.width * 0.5,
        y: fighterRect.top - arenaRect.top + fighterRect.height * 0.56,
        bodyWidth: fighterRect.width * 0.7,
        bodyHeight: fighterRect.height * 0.76,
      };
    }

    function spawnSkillAuraParticle(skillId, textures, anchor) {
      const container = meteorExplosion.container;
      if (!container) {
        return;
      }

      const roll = Math.random();
      let texture;
      let particleType = "flame";

      if (roll > 0.88) {
        texture = textures.auraSpark;
        particleType = "spark";
      } else if (skillId === "breaker") {
        texture = roll > 0.48 ? textures.breakerRed : textures.breakerCore;
      } else {
        texture = roll > 0.44 ? textures.accelerateYellow : textures.accelerateGold;
      }

      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      const orbitAngle = Math.random() * Math.PI * 2;
      const sideBias = Math.random() > 0.5 ? 1 : -1;
      const orbitRadiusX = anchor.bodyWidth * (0.2 + Math.random() * 0.24);
      const orbitRadiusY = anchor.bodyHeight * (0.08 + Math.random() * 0.2);

      // Bias particles toward the side silhouette so the aura hugs around the body.
      sprite.x = anchor.x + Math.cos(orbitAngle) * orbitRadiusX + sideBias * (anchor.bodyWidth * 0.14);
      sprite.y = anchor.y + Math.sin(orbitAngle) * orbitRadiusY + anchor.bodyHeight * 0.12;
      sprite.blendMode = "add";
      const baseAlpha = particleType === "spark" ? 0.45 : 0.34;
      sprite.alpha = baseAlpha;

      meteorExplosion.auraParticles.push({
        sprite,
        skillId,
        type: particleType,
        vy: Math.random() * 2 + 2,
        waveSpeed: Math.random() * 0.05 + 0.02,
        waveFrequency: Math.random() * 10 + 5,
        time: Math.random() * 100,
        life: 1,
        decay: Math.random() * 0.015 + 0.01,
        baseAlpha,
      });

      container.addChild(sprite);
    }

    function updateSkillAuraParticles(delta) {
      const { auraParticles, auraSpawnCarryBySkill, container } = meteorExplosion;
      if (!container) {
        return;
      }

      const textures = ensureMeteorExplosionTextures();
      const maxAuraParticles = 180;
      const activeBreaker = state.running && isSkillEffectActive("breaker");
      const activeAccelerate = state.running && isSkillEffectActive("accelerate");

      if (activeBreaker || activeAccelerate) {
        const anchor = getAuraAnchorPoint();

        if (activeBreaker) {
          auraSpawnCarryBySkill.breaker += 2.6 * delta;
          const spawnCount = Math.min(4, Math.floor(auraSpawnCarryBySkill.breaker));
          if (spawnCount > 0) {
            auraSpawnCarryBySkill.breaker -= spawnCount;
            for (let index = 0; index < spawnCount; index += 1) {
              if (auraParticles.length >= maxAuraParticles) {
                break;
              }
              spawnSkillAuraParticle("breaker", textures, anchor);
            }
          }
        }

        if (activeAccelerate) {
          auraSpawnCarryBySkill.accelerate += 2.2 * delta;
          const spawnCount = Math.min(3, Math.floor(auraSpawnCarryBySkill.accelerate));
          if (spawnCount > 0) {
            auraSpawnCarryBySkill.accelerate -= spawnCount;
            for (let index = 0; index < spawnCount; index += 1) {
              if (auraParticles.length >= maxAuraParticles) {
                break;
              }
              spawnSkillAuraParticle("accelerate", textures, anchor);
            }
          }
        }
      } else {
        auraSpawnCarryBySkill.breaker = 0;
        auraSpawnCarryBySkill.accelerate = 0;
      }

      for (let index = auraParticles.length - 1; index >= 0; index -= 1) {
        const particle = auraParticles[index];
        particle.time += particle.waveSpeed * delta;
        particle.sprite.y -= particle.vy * delta;

        if (particle.type === "flame") {
          particle.sprite.x += Math.sin(particle.time) * (particle.waveFrequency * 0.1) * delta;
          particle.sprite.y += Math.cos(particle.time * 0.6) * 0.14 * delta;
          if (particle.skillId === "breaker") {
            particle.sprite.scale.x = Math.max(0.08, particle.life * 1.85);
            particle.sprite.scale.y = Math.max(0.08, particle.life * 2.9);
          } else {
            particle.sprite.scale.x = Math.max(0.08, particle.life * 1.65);
            particle.sprite.scale.y = Math.max(0.08, particle.life * 2.5);
          }
        } else {
          particle.sprite.x += (Math.random() - 0.5) * 4 * delta;
          const sparkScale = Math.max(0.08, particle.life * 1.05);
          particle.sprite.scale.set(sparkScale);
        }

        const sourceStillActive = particle.skillId === "breaker" ? activeBreaker : activeAccelerate;
        const fadeMultiplier = sourceStillActive ? 1 : 1.8;
        particle.life -= particle.decay * delta * fadeMultiplier;
        particle.sprite.alpha = Math.max(0, (particle.baseAlpha || 0.35) * particle.life);

        if (particle.life <= 0) {
          container.removeChild(particle.sprite);
          particle.sprite.destroy();
          auraParticles.splice(index, 1);
        }
      }
    }

    function updateMeteorExplosionParticles(ticker) {
      const delta = ticker?.deltaTime ?? 1;
      const { particles, container } = meteorExplosion;
      if (!container) {
        return;
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        const scaleMultiplier = particle.scaleMultiplier || 1;
        particle.sprite.x += particle.vx * delta;
        particle.sprite.y += particle.vy * delta;
        particle.life -= particle.decay * delta;

        if (particle.type === "flash") {
          particle.sprite.scale.set((1 - particle.life) * 8 * scaleMultiplier);
          particle.sprite.alpha = particle.life;
        } else if (particle.type === "fire" || particle.type === "yellow") {
          particle.vx *= 0.93;
          particle.vy *= 0.93;
          particle.vy -= 0.05 * delta;
          particle.sprite.scale.set(particle.life * 4 * scaleMultiplier);
          particle.sprite.alpha = particle.life;
        } else if (particle.type === "spark") {
          particle.vx *= 0.96;
          particle.vy *= 0.96;
          particle.vy += 0.02 * delta;
          particle.sprite.scale.set(particle.life * 1.5 * scaleMultiplier);
          particle.sprite.alpha = particle.life;
        } else if (particle.type === "smoke") {
          particle.vx *= 0.9;
          particle.vy *= 0.9;
          particle.vy -= 0.08 * delta;
          particle.sprite.scale.set(((1 - particle.life) * 5 + 1.5) * scaleMultiplier);
          particle.sprite.alpha = particle.life * 0.4;
        }

        if (particle.life <= 0) {
          container.removeChild(particle.sprite);
          particle.sprite.destroy();
          particles.splice(index, 1);
        }
      }

      updateImpactBurstParticles(delta);
      updateSkillAuraParticles(delta);
    }

    async function initMeteorExplosionLayer() {
      if (!elements.arena || meteorExplosion.app) {
        return;
      }

      const token = meteorExplosion.initToken + 1;
      meteorExplosion.initToken = token;

      const app = new PIXI.Application();
      await app.init({
        width: Math.max(1, Math.floor(elements.arena.clientWidth || 1)),
        height: Math.max(1, Math.floor(elements.arena.clientHeight || 1)),
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        resizeTo: elements.arena,
      });

      if (meteorExplosion.initToken !== token) {
        app.destroy(true);
        return;
      }

      const canvas = app.canvas || app.view;
      if (!canvas) {
        app.destroy(true);
        return;
      }

      canvas.classList.add("meteor-pixi-layer");
      canvas.style.background = "transparent";
      canvas.style.pointerEvents = "none";
      elements.arena.appendChild(canvas);

      const container = new PIXI.Container();
      app.stage.addChild(container);

      meteorExplosion.app = app;
      meteorExplosion.container = container;
      meteorExplosion.particles = [];
      meteorExplosion.impactParticles = [];
      meteorExplosion.impactWaves = [];
      meteorExplosion.burstEffects = [];
      meteorExplosion.normalHitRings = [];
      meteorExplosion.auraParticles = [];
      meteorExplosion.auraSpawnCarryBySkill.breaker = 0;
      meteorExplosion.auraSpawnCarryBySkill.accelerate = 0;
      ensureMeteorExplosionTextures();

      app.ticker.add(updateMeteorExplosionParticles);
      syncMeteorExplosionLayerSize();
    }

    function syncMeteorExplosionLayerSize() {
      if (!meteorExplosion.app || !elements.arena) {
        return;
      }

      const width = Math.max(1, Math.floor(elements.arena.clientWidth || 0));
      const height = Math.max(1, Math.floor(elements.arena.clientHeight || 0));
      if (width <= 1 || height <= 1) {
        return;
      }

      if (meteorExplosion.app.renderer.width !== width || meteorExplosion.app.renderer.height !== height) {
        meteorExplosion.app.renderer.resize(width, height);
      }
    }

    function destroyMeteorExplosionLayer() {
      meteorExplosion.initToken += 1;

      if (meteorExplosion.impactWaveTimers.length > 0) {
        meteorExplosion.impactWaveTimers.forEach((timerId) => {
          window.clearTimeout(timerId);
        });
        meteorExplosion.impactWaveTimers = [];
      }

      if (meteorExplosion.app) {
        meteorExplosion.app.ticker.remove(updateMeteorExplosionParticles);
        meteorExplosion.app.destroy(true);
      }

      meteorExplosion.particles = [];
      meteorExplosion.impactParticles = [];
      meteorExplosion.impactWaves = [];
      meteorExplosion.burstEffects = [];
      meteorExplosion.normalHitRings = [];
      meteorExplosion.auraParticles = [];
      meteorExplosion.auraSpawnCarryBySkill.breaker = 0;
      meteorExplosion.auraSpawnCarryBySkill.accelerate = 0;

      if (meteorExplosion.textures) {
        Object.values(meteorExplosion.textures).forEach((texture) => {
          if (texture && texture !== PIXI.Texture.WHITE) {
            texture.destroy(true);
          }
        });
      }

      meteorExplosion.app = null;
      meteorExplosion.container = null;
      meteorExplosion.textures = null;
    }

    function spawnMeteorParticle(x, y, texture, type, speedConfig) {
      const container = meteorExplosion.container;
      if (!container) {
        return;
      }

      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.x = x;
      sprite.y = y;

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * speedConfig.max + speedConfig.min;

      if (type !== "smoke") {
        sprite.blendMode = "add";
      }

      meteorExplosion.particles.push({
        sprite,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: Math.random() * (speedConfig.maxDecay - speedConfig.minDecay) + speedConfig.minDecay,
        type,
        scaleMultiplier: METEOR_EFFECT_SIZE_MULTIPLIER,
      });

      container.addChild(sprite);
    }

    function spawnMeteorFlash(x, y) {
      const textures = ensureMeteorExplosionTextures();
      const container = meteorExplosion.container;
      if (!container) {
        return;
      }

      const sprite = new PIXI.Sprite(textures.core);
      sprite.anchor.set(0.5);
      sprite.x = x;
      sprite.y = y;
      sprite.scale.set(0.1);
      sprite.blendMode = "add";

      meteorExplosion.particles.push({
        sprite,
        vx: 0,
        vy: 0,
        life: 1,
        decay: 0.08,
        type: "flash",
        scaleMultiplier: METEOR_EFFECT_SIZE_MULTIPLIER,
      });

      container.addChild(sprite);
    }

    function spawnImpactWave(startX, startY, targetX, targetY, direction) {
      const container = meteorExplosion.container;
      if (!container) {
        return;
      }

      const graphics = new PIXI.Graphics();
      graphics.x = startX;
      graphics.y = startY;
      const startAngle = direction === "left" ? Math.PI * 0.6 : -Math.PI * 0.4;
      const endAngle = direction === "left" ? Math.PI * 1.4 : Math.PI * 0.4;

      meteorExplosion.impactWaves.push({
        graphics,
        radius: 40,
        width: 32,
        startAngle,
        endAngle,
        maxRadius: 320,
        life: 1,
        decay: 0.045,
      });

      container.addChild(graphics);
    }

    function spawnImpactParticle(startX, startY, targetX, targetY, texture, isStreak = false) {
      const container = meteorExplosion.container;
      if (!container) {
        return;
      }

      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.x = startX;
      sprite.y = startY;
      sprite.blendMode = "add";

      const baseAngle = Math.atan2(targetY - startY, targetX - startX);
      const conicalSpread = (Math.random() - 0.5) * (Math.PI / 3);
      const finalAngle = baseAngle + conicalSpread;
      const speed = Math.random() * 15 + 8;
      const baseScale = Math.random() * 1.5 + 0.5;

      if (isStreak) {
        sprite.scale.x = Math.random() * 4 + 2;
        sprite.scale.y = 0.5;
        sprite.rotation = finalAngle;
      } else {
        sprite.scale.set(baseScale);
      }

      meteorExplosion.impactParticles.push({
        sprite,
        vx: Math.cos(finalAngle) * speed,
        vy: Math.sin(finalAngle) * speed,
        life: 1,
        decay: Math.random() * 0.04 + 0.02,
        baseScale,
        isStreak,
      });

      container.addChild(sprite);
    }

    function getNormalHitEffectPoint(actionKey) {
      const arenaRect = elements.arena?.getBoundingClientRect();
      const fighterRect = elements.fighterWrap?.getBoundingClientRect();
      const targetRect = elements.targetWrap?.getBoundingClientRect();
      if (!arenaRect || !fighterRect) {
        return null;
      }

      const fighterCenterX = getCurrentFighterCenterX();
      const targetCenterX = targetRect
        ? targetRect.left - arenaRect.left + targetRect.width * 0.5
        : fighterCenterX;
      const facingRight = fighterCenterX <= targetCenterX;
      const isKick = actionKey === "kick";

      // Place VFX near the active limb contact zone, not at body center.
      const xRatio = isKick
        ? facingRight
          ? 0.9
          : 0.1
        : facingRight
          ? 0.8
          : 0.2;
      const yRatio = isKick ? 0.66 : 0.56;
      const reachBoostPx = isKick ? fighterRect.width * 0.06 : fighterRect.width * 0.035;
      const direction = facingRight ? 1 : -1;

      return {
        x: fighterRect.left - arenaRect.left + fighterRect.width * xRatio + reachBoostPx * direction,
        y: fighterRect.top - arenaRect.top + fighterRect.height * yRatio,
      };
    }

    function triggerNormalHitPixiEffect(actionKey) {
      if (!meteorExplosion.container) {
        initMeteorExplosionLayer()
          .then(() => {
            syncMeteorExplosionLayerSize();
            triggerNormalHitPixiEffect(actionKey);
          })
          .catch(() => {
            // Ignore renderer initialization failures.
          });
        return;
      }

      const hitPoint = getNormalHitEffectPoint(actionKey) || getAttackPoint(actionKey) || {
        x: (elements.arena?.clientWidth || 0) * 0.52,
        y: (elements.arena?.clientHeight || 0) * 0.56,
      };

      const ring = new PIXI.Graphics();
      ring.x = hitPoint.x;
      ring.y = hitPoint.y;
      meteorExplosion.normalHitRings.push({
        graphics: ring,
        age: 0,
        lifespan: 18,
        baseRadius: 16,
        expandDistance: 64,
        strokeWidth: 8,
      });
      meteorExplosion.container.addChild(ring);

      if (elements.arena) {
        elements.arena.animate(
          [
            { transform: "translateX(0px) translateY(0px) scale(1)" },
            { transform: "translateX(-7px) translateY(4px) scale(1.06)" },
            { transform: "translateX(6px) translateY(-4px) scale(1.03)" },
            { transform: "translateX(-3px) translateY(2px) scale(1.015)" },
            { transform: "translateX(0px) translateY(0px) scale(1)" },
          ],
          { duration: 210, easing: "cubic-bezier(0.16, 0.74, 0.2, 1)" },
        );
      }
    }

    function triggerImpactBurstCoreEffect(x, y, direction) {
      const container = meteorExplosion.container;
      if (!container) {
        return;
      }

      const effectContainer = new PIXI.Container();
      effectContainer.position.set(x, y);
      container.addChild(effectContainer);

      const flash = new PIXI.Graphics();
      flash.circle(0, 0, 50);
      flash.fill({ color: 0xffffff });
      effectContainer.addChild(flash);

      const wave = new PIXI.Graphics();
      const startAngle = direction === "left" ? Math.PI * 0.6 : -Math.PI * 0.4;
      const endAngle = direction === "left" ? Math.PI * 1.4 : Math.PI * 0.4;
      wave.arc(0, 0, 40, startAngle, endAngle);
      wave.stroke({ color: 0x8b0000, width: 32, cap: "round" });
      effectContainer.addChild(wave);

      const sparks = [];
      for (let index = 0; index < 16; index += 1) {
        const sparkGraphic = new PIXI.Graphics();
        let angle = (Math.random() - 0.5) * (Math.PI * 0.7);
        if (direction === "left") {
          angle += Math.PI;
        }

        const speed = Math.random() * 12 + 8;
        const length = Math.random() * 40 + 20;
        const sparkColor = Math.random() > 0.3 ? 0xff0033 : 0xffffff;
        sparkGraphic.moveTo(0, 0);
        sparkGraphic.lineTo(length, 0);
        sparkGraphic.stroke({ color: sparkColor, width: 3.5 });
        sparkGraphic.rotation = angle;
        effectContainer.addChild(sparkGraphic);
        sparks.push({ element: sparkGraphic, speed, angle });
      }

      meteorExplosion.burstEffects.push({
        container: effectContainer,
        flash,
        wave,
        sparks,
        age: 0,
        lifespan: 25,
      });
    }

    function getImpactBurstTargetPoint() {
      const arenaRect = elements.arena?.getBoundingClientRect();
      const targetRect = elements.targetWrap?.getBoundingClientRect();
      if (!arenaRect || !targetRect) {
        const fallback = getAttackPoint();
        if (fallback) {
          return fallback;
        }
        return {
          x: (arenaRect?.width || 0) * 0.62,
          y: (arenaRect?.height || 0) * 0.56,
        };
      }

      return {
        x: targetRect.left - arenaRect.left + targetRect.width * 0.5,
        y: targetRect.top - arenaRect.top + targetRect.height * 0.56,
      };
    }

    function triggerImpactBurstPixiEffect() {
      if (!meteorExplosion.container) {
        initMeteorExplosionLayer()
          .then(() => {
            syncMeteorExplosionLayerSize();
            triggerImpactBurstPixiEffect();
          })
          .catch(() => {
            // Ignore renderer initialization failures.
          });
        return;
      }

      const textures = ensureMeteorExplosionTextures();
      const startPoint = getAttackPoint() || {
        x: (elements.arena?.clientWidth || 0) * 0.25,
        y: (elements.arena?.clientHeight || 0) * 0.58,
      };
      const targetPoint = getImpactBurstTargetPoint();
      const direction = startPoint.x <= targetPoint.x ? "right" : "left";

      triggerImpactBurstCoreEffect(targetPoint.x, targetPoint.y, direction);

      if (meteorExplosion.impactWaveTimers.length > 0) {
        meteorExplosion.impactWaveTimers.forEach((timerId) => {
          window.clearTimeout(timerId);
        });
        meteorExplosion.impactWaveTimers = [];
      }

      for (let index = 0; index < 3; index += 1) {
        const timerId = window.setTimeout(() => {
          meteorExplosion.impactWaveTimers = meteorExplosion.impactWaveTimers.filter((id) => id !== timerId);
          spawnImpactWave(targetPoint.x, targetPoint.y, startPoint.x, startPoint.y, direction);
        }, index * 80);
        meteorExplosion.impactWaveTimers.push(timerId);
      }

      for (let index = 0; index < 32; index += 1) {
        spawnImpactParticle(targetPoint.x, targetPoint.y, startPoint.x, startPoint.y, textures.impactDarkRed, true);
      }

      for (let index = 0; index < 24; index += 1) {
        spawnImpactParticle(targetPoint.x, targetPoint.y, startPoint.x, startPoint.y, textures.impactCrimson, false);
      }

      for (let index = 0; index < 18; index += 1) {
        spawnImpactParticle(targetPoint.x, targetPoint.y, startPoint.x, startPoint.y, textures.impactWhite, false);
      }
    }

    function triggerMeteorPixiExplosion(x, y) {
      if (!meteorExplosion.container) {
        return;
      }

      const textures = ensureMeteorExplosionTextures();
      spawnMeteorFlash(x, y);

      for (let index = 0; index < 80; index += 1) {
        spawnMeteorParticle(x, y, textures.fire, "fire", { min: 1, max: 6, minDecay: 0.015, maxDecay: 0.03 });
      }

      for (let index = 0; index < 50; index += 1) {
        spawnMeteorParticle(x, y, textures.yellow, "yellow", { min: 2, max: 8, minDecay: 0.02, maxDecay: 0.04 });
      }

      for (let index = 0; index < 60; index += 1) {
        spawnMeteorParticle(x, y, textures.spark, "spark", { min: 8, max: 16, minDecay: 0.01, maxDecay: 0.025 });
      }

      for (let index = 0; index < 40; index += 1) {
        spawnMeteorParticle(x, y, textures.smoke, "smoke", { min: 0.5, max: 4, minDecay: 0.008, maxDecay: 0.015 });
      }
    }

    function setScreen(name) {
      state.screen = name;
      root.dataset.screen = name;
      Object.entries(elements.screens).forEach(([screenName, element]) => {
        if (element) {
          element.classList.toggle("is-active", screenName === name);
        }
      });
      if (name === "game") {
        initMeteorExplosionLayer()
          .then(() => {
            syncMeteorExplosionLayerSize();
          })
          .catch(() => {
            // Ignore renderer initialization failures.
          });
      }
      if (name !== "game") {
        destroyVictoryCelebrationLayer();
      }
      if (name !== "game" && elements.resultOverlay) {
        elements.resultOverlay.hidden = true;
      }
    }

    function updateSelectionCards() {
      sanitizeEquippedSkills();
      const stats = getCurrentCharacterBaseStats();
      const statsLabel = formatStatsLabel(stats);
      const availableSkillSet = getCharacterSkillSet(state.character);
      const selectedCount = state.equippedSkillIds.length;

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
        const unlocked = isSkillUnlocked(skillId);
        const disabledForLimit = !selected && reachedSkillLimit;
        const disabledForGold = canUseForCharacter && !unlocked;
        const unlockCost = getSkillUnlockCost(skillId);
        const costLabel = card.querySelector("[data-skill-cost]");
        const buyButton = card.querySelector(".skill-buy-button");

        card.classList.toggle("is-selected", selected);
        card.classList.toggle("is-locked", disabledForGold);
        card.classList.toggle("is-disabled", !canUseForCharacter || disabledForLimit);

        if (costLabel) {
          if (!canUseForCharacter) {
            costLabel.hidden = false;
            costLabel.textContent = "Unavailable for this fighter";
          } else if (unlocked) {
            costLabel.hidden = true;
            costLabel.textContent = "";
          } else {
            costLabel.hidden = false;
            costLabel.textContent = `Need ${unlockCost} gold`;
          }
        }

        if (buyButton) {
          const showBuy = canUseForCharacter && !unlocked;
          const canAfford = state.gold >= unlockCost;
          buyButton.hidden = !showBuy;
          buyButton.disabled = !showBuy || !canAfford;
          buyButton.textContent = canAfford ? `Buy ${unlockCost}` : "Not enough gold";
        }
      });

      if (elements.skillHint) {
        elements.skillHint.innerHTML = `${selectedCount}/${MAX_EQUIPPED_SKILLS} equipped · <span class="skill-hint-gold">Gold ${state.gold}</span>`;
      }

      if (elements.skillNext) {
        const canAdvanceToStage = selectedCount >= 1;
        elements.skillNext.disabled = !canAdvanceToStage;
        elements.skillNext.title = canAdvanceToStage ? "" : "Equip at least 1 skill";
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
      if (elements.hudGoldValue) {
        elements.hudGoldValue.textContent = `${state.gold}`;
      }
      if (elements.hudTime) {
        elements.hudTime.textContent = INFINITE_TIMER_MODE
          ? `∞ ${Math.max(0, state.timeLeft)}s`
          : `${Math.max(0, state.timeLeft)}`;
      }
      updateSkillButtons();
    }

    function updateSkillButtons() {
      const now = performance.now();
      const hasSecondSkill = Boolean(state.equippedSkillIds[1]);

      elements.skillButtons.forEach((button, slotIndex) => {
        if (!button) {
          return;
        }

        const hideSecondSlot = slotIndex === 1 && !hasSecondSkill;
        button.hidden = hideSecondSlot;
        button.style.display = hideSecondSlot ? "none" : "";
        button.setAttribute("aria-hidden", hideSecondSlot ? "true" : "false");

        const skillId = state.equippedSkillIds[slotIndex];
        const skill = skillId ? SKILLS_BY_ID[skillId] : null;
        const runtime = skillId ? state.skillRuntime[skillId] : null;
        const iconEl = button.querySelector(".skill-slot-icon");
        const nameEl = button.querySelector(".skill-slot-name");
        const cdEl = button.querySelector(".skill-slot-cd");

        if (!skill || !runtime) {
          button.disabled = true;
          button.classList.remove("is-cooling", "is-active");
          button.style.setProperty("--skill-cooldown-ratio", "0");
          if (iconEl) {
            iconEl.classList.remove("has-icon");
            iconEl.style.backgroundImage = "";
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
        button.style.setProperty("--skill-cooldown-ratio", `${ratio.toFixed(4)}`);

        if (iconEl) {
          if (skill.iconSrc) {
            iconEl.classList.add("has-icon");
            iconEl.style.backgroundImage = `url("${skill.iconSrc}")`;
            iconEl.textContent = "";
          } else {
            iconEl.classList.remove("has-icon");
            iconEl.style.backgroundImage = "";
            iconEl.textContent = skill.icon || "SK";
          }
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
      destroyVictoryCelebrationLayer();
      state.specialSkillSwapLockUntil = 0;
      state.meteorStrike.active = false;
      state.meteorStrike.impacted = false;
      setMeteorFlightVisualState(false);
    }

    async function initVictoryCelebrationLayer() {
      if (!elements.appShell || victoryCelebration.app) {
        return;
      }

      const token = victoryCelebration.initToken + 1;
      victoryCelebration.initToken = token;

      const app = new PIXI.Application();
      await app.init({
        width: Math.max(1, window.innerWidth || 1),
        height: Math.max(1, window.innerHeight || 1),
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        resizeTo: window,
      });

      if (victoryCelebration.initToken !== token) {
        app.destroy(true);
        return;
      }

      const canvas = app.canvas || app.view;
      if (!canvas) {
        app.destroy(true);
        return;
      }

      if (elements.appShell) {
        const appShellStyle = window.getComputedStyle(elements.appShell);
        if (appShellStyle.position === "static") {
          elements.appShell.style.position = "relative";
        }
      }

      canvas.classList.add("victory-pixi-layer");
      canvas.style.position = "absolute";
      canvas.style.inset = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "24";
      elements.appShell.appendChild(canvas);

      const fireworkContainer = new PIXI.Container();
      const confettiContainer = new PIXI.Container();
      app.stage.addChild(fireworkContainer, confettiContainer);

      victoryCelebration.app = app;
      victoryCelebration.fireworkContainer = fireworkContainer;
      victoryCelebration.confettiContainer = confettiContainer;
      victoryCelebration.confettiParticles = [];
      victoryCelebration.fireworkRockets = [];
      victoryCelebration.fireworkShards = [];
      victoryCelebration.fireworkTimer = 0;

      app.ticker.add((ticker) => {
        const delta = ticker.deltaTime;
        const colors = [0xff0055, 0x00ffcc, 0xffcc00, 0xff6600, 0x99ff00, 0xcc00ff, 0xffffff];

        if (Math.random() < 0.15 * delta) {
          const confetti = new PIXI.Graphics();
          const width = Math.random() * 6 + 6;
          const height = Math.random() * 10 + 6;
          confetti.rect(-width / 2, -height / 2, width, height);
          confetti.fill({ color: colors[Math.floor(Math.random() * colors.length)] });
          confetti.position.set(Math.random() * app.screen.width, -20);
          confetti.vx = (Math.random() - 0.5) * 4;
          confetti.vy = Math.random() * 3 + 2;
          confetti.rotationSpeed = (Math.random() - 0.5) * 0.2;
          confetti.wobbleSpeed = Math.random() * 0.05 + 0.02;
          confettiContainer.addChild(confetti);
          victoryCelebration.confettiParticles.push(confetti);
        }

        victoryCelebration.fireworkTimer += delta;
        if (victoryCelebration.fireworkTimer > 40) {
          const rocket = new PIXI.Graphics();
          rocket.circle(0, 0, 3);
          rocket.fill({ color: 0xffffff });
          const startX = Math.random() * (app.screen.width * 0.6) + app.screen.width * 0.2;
          rocket.position.set(startX, app.screen.height);
          rocket.targetY = Math.random() * (app.screen.height * 0.4) + app.screen.height * 0.1;
          const distanceY = rocket.targetY - app.screen.height;
          rocket.vy = -Math.sqrt(2 * 0.15 * Math.abs(distanceY));
          rocket.gravity = 0.15;
          fireworkContainer.addChild(rocket);
          victoryCelebration.fireworkRockets.push(rocket);
          victoryCelebration.fireworkTimer = 0;
        }

        for (let index = victoryCelebration.confettiParticles.length - 1; index >= 0; index -= 1) {
          const confetti = victoryCelebration.confettiParticles[index];
          confetti.position.x += confetti.vx * delta;
          confetti.position.y += confetti.vy * delta;
          confetti.rotation += confetti.rotationSpeed * delta;
          confetti.scale.x = Math.cos(app.ticker.lastTime * confetti.wobbleSpeed);

          if (confetti.position.y > app.screen.height + 20) {
            confettiContainer.removeChild(confetti);
            confetti.destroy();
            victoryCelebration.confettiParticles.splice(index, 1);
          }
        }

        for (let index = victoryCelebration.fireworkRockets.length - 1; index >= 0; index -= 1) {
          const rocket = victoryCelebration.fireworkRockets[index];
          rocket.vy += rocket.gravity * delta;
          rocket.position.y += rocket.vy * delta;

          if (rocket.vy >= -0.5) {
            const shardCount = 60;
            const baseColor = colors[Math.floor(Math.random() * colors.length)];
            for (let shardIndex = 0; shardIndex < shardCount; shardIndex += 1) {
              const shard = new PIXI.Graphics();
              shard.circle(0, 0, Math.random() * 2 + 1.5);
              shard.fill({ color: baseColor });
              shard.position.set(rocket.position.x, rocket.position.y);
              const angle = Math.random() * Math.PI * 2;
              const speed = Math.random() * 6 + 2;
              shard.vx = Math.cos(angle) * speed;
              shard.vy = Math.sin(angle) * speed;
              shard.gravity = 0.08;
              shard.alpha = 1;
              shard.fade = Math.random() * 0.015 + 0.01;
              fireworkContainer.addChild(shard);
              victoryCelebration.fireworkShards.push(shard);
            }
            fireworkContainer.removeChild(rocket);
            rocket.destroy();
            victoryCelebration.fireworkRockets.splice(index, 1);
          }
        }

        for (let index = victoryCelebration.fireworkShards.length - 1; index >= 0; index -= 1) {
          const shard = victoryCelebration.fireworkShards[index];
          shard.vy += shard.gravity * delta;
          shard.position.x += shard.vx * delta;
          shard.position.y += shard.vy * delta;
          shard.alpha -= shard.fade * delta;

          if (shard.alpha <= 0) {
            fireworkContainer.removeChild(shard);
            shard.destroy();
            victoryCelebration.fireworkShards.splice(index, 1);
          }
        }

      });
    }

    function destroyVictoryCelebrationLayer() {
      victoryCelebration.initToken += 1;

      if (victoryCelebration.app) {
        victoryCelebration.app.destroy(true);
      }

      victoryCelebration.app = null;
      victoryCelebration.fireworkContainer = null;
      victoryCelebration.confettiContainer = null;
      victoryCelebration.confettiParticles = [];
      victoryCelebration.fireworkRockets = [];
      victoryCelebration.fireworkShards = [];
      victoryCelebration.fireworkTimer = 0;
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
      const fighterWidth = fighterRect?.width || (window.innerWidth <= 560 ? 150 * ARENA_ENTITY_SCALE : 210 * ARENA_ENTITY_SCALE);
      const baseLeft = 0;
      const minOffset = 8;
      const maxOffset = arenaWidth - fighterWidth - 8;
      const carCenterX = arenaWidth * 0.5;
      const carHalfWidth = targetRect ? targetRect.width * 0.44 : Math.min(180 * ARENA_ENTITY_SCALE, arenaWidth * (0.17 * ARENA_ENTITY_SCALE));

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

    function getRoofStandLift() {
      return Math.max(0, getRoofHeight() - ROOF_STAND_DROP_PX);
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
        Math.max(
          262 * ARENA_ENTITY_SCALE * CAR_TARGET_SIZE_MULTIPLIER,
          Math.min(
            metrics.arenaWidth * (0.57 * ARENA_ENTITY_SCALE) * CAR_TARGET_SIZE_MULTIPLIER,
            metrics.fighterWidth * (2.02 * ARENA_ENTITY_SCALE) * characterScale * CAR_TARGET_SIZE_MULTIPLIER,
          ),
        ),
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

    function getAttackPoint(actionOverride = null) {
      const arenaRect = elements.arena?.getBoundingClientRect();
      const fighterRect = elements.fighterWrap?.getBoundingClientRect();
      const targetRect = elements.targetWrap?.getBoundingClientRect();
      if (!arenaRect || !fighterRect) {
        return null;
      }

      const actionForPoint = actionOverride || state.action;
      const fighterCenterX = getCurrentFighterCenterX();
      const targetCenterX = targetRect
        ? targetRect.left - arenaRect.left + targetRect.width * 0.5
        : fighterCenterX;
      const isCrouchPunch = actionForPoint === "crouchPunch";
      const attackXRatio = isCrouchPunch
        ? fighterCenterX <= targetCenterX
          ? 0.68
          : 0.32
        : fighterCenterX <= targetCenterX
          ? 0.62
          : 0.38;
      const attackYRatio = state.airborne ? 0.35 : isCrouchPunch ? 0.7 : state.crouching ? 0.78 : 0.62;
      const forwardDirection = fighterCenterX <= targetCenterX ? 1 : -1;
      const isPunchAction = actionForPoint === "punch" || actionForPoint === "jumpPunch" || actionForPoint === "crouchPunch";
      const isKickAction = actionForPoint === "kick" || actionForPoint === "jumpKick" || actionForPoint === "crouchKick";
      const forwardLungePx = isKickAction ? 8 : isPunchAction ? 4 : 0;
      const baseX = fighterRect.left - arenaRect.left + fighterRect.width * attackXRatio;

      return {
        x: baseX + forwardLungePx * forwardDirection,
        y: fighterRect.top - arenaRect.top + fighterRect.height * attackYRatio,
      };
    }

    function getMeteorImpactPoint() {
      const arenaRect = elements.arena?.getBoundingClientRect();
      const fighterRect = elements.fighterWrap?.getBoundingClientRect();
      const targetRect = elements.targetWrap?.getBoundingClientRect();

      if (arenaRect && fighterRect) {
        const footX = fighterRect.left - arenaRect.left + fighterRect.width * 0.5;
        const footY = fighterRect.bottom - arenaRect.top - 8;

        return {
          x: Math.max(0, Math.min(arenaRect.width, footX)),
          y: Math.max(0, Math.min(arenaRect.height, footY)),
        };
      }

      if (arenaRect && targetRect) {
        return {
          x: targetRect.left - arenaRect.left + targetRect.width * 0.5,
          y: targetRect.top - arenaRect.top + targetRect.height * 0.34,
        };
      }

      const attackPoint = getAttackPoint();
      if (attackPoint) {
        return attackPoint;
      }

      return {
        x: (arenaRect?.width || 0) * 0.5,
        y: (arenaRect?.height || 0) * 0.6,
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

    function calculateHitScoreGain(actualDamageDone, actionId) {
      const actionBonusById = {
        punch: 17,
        kick: 31,
        jumpPunch: 23,
        jumpKick: 37,
        crouchPunch: 19,
        crouchKick: 29,
        impactBurst: 47,
        meteorPunch: 53,
      };

      const base = actualDamageDone * 82;
      const actionBonus = actionBonusById[actionId] || 13;
      const comboBonus = Math.min(180, state.combo * 11);
      const stageBonus = state.stage === "car" ? 13 : 7;
      const statBonus = Math.round(getStrengthMultiplier() * 9 + getAgilityMultiplier() * 6);

      return Math.max(1, Math.round(base + actionBonus + comboBonus + stageBonus + statBonus));
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
        triggerImpactBurstPixiEffect();

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
          state.score += calculateHitScoreGain(actualDamageDone, "impactBurst");
          if (state.score > state.highScore) {
            state.highScore = state.score;
            try {
              window.localStorage.setItem(STORAGE_KEYS.highScore, String(state.highScore));
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
          // Ensure post-destruction “lingering dark” effect runs.
          applyPostDestroyLingeringDarkFilters();
          if (elements.targetObject) {
            elements.targetObject.classList.add("broken");
          }

          if (elements.stageBonusLabel) {
            elements.stageBonusLabel.textContent = "Broken";
          }
          window.setTimeout(() => finishGame(true), 650);
        }

        setSpecialSkillSwapLock(500);
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
        state.score += calculateHitScoreGain(actualDamageDone, "meteorPunch");
        if (state.score > state.highScore) {
          state.highScore = state.score;
          try {
            window.localStorage.setItem(STORAGE_KEYS.highScore, String(state.highScore));
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

      setSpecialSkillSwapLock(500);

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

      if (skillId === "meteorPunch") {
        if (isSpecialSkillSwapLocked() || state.meteorStrike.active || state.action === "impactBurst" || state.impactBurstTimer) {
          return;
        }
      }

      if (skillId === "impactBurst") {
        if (isSpecialSkillSwapLocked() || state.meteorStrike.active || state.action === "meteorPunch") {
          return;
        }
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

    function applyPostDestroyLingeringDarkFilters() {
      if (!elements.targetObject) {
        return;
      }
      const now = performance.now();
      if (state.postDestroyFilter.applied && now <= state.postDestroyFilter.until) {
        return;
      }

      state.postDestroyFilter.token += 1;
      const token = state.postDestroyFilter.token;
      state.postDestroyFilter.applied = true;
      // Start immediately, linger briefly, then fade back.
      state.postDestroyFilter.until = now + 950;

      // Dark / ominous look.
      elements.targetObject.style.filter = "brightness(0.55) contrast(1.25) saturate(0.8)";
      elements.targetObject.style.opacity = "0.95";
      elements.targetObject.style.transition = "filter 280ms ease, opacity 280ms ease";

      // Add a short extra “afterimage” bump.
      elements.targetObject.animate(
        [
          { filter: "brightness(0.55) contrast(1.25) saturate(0.8)" },
          { filter: "brightness(0.42) contrast(1.35) saturate(0.7)" },
          { filter: "brightness(0.55) contrast(1.25) saturate(0.8)" },
        ],
        { duration: 520, easing: "cubic-bezier(0.16, 0.74, 0.2, 1)" },
      );

      window.setTimeout(() => {
        // Only revert if nothing newer has been applied.
        if (!state.postDestroyFilter || state.postDestroyFilter.token !== token) {
          return;
        }
        if (elements.targetObject) {
          elements.targetObject.style.filter = "";
          elements.targetObject.style.opacity = "";
          elements.targetObject.style.transition = "";
        }
        state.postDestroyFilter.applied = false;
      }, 980);
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
        // Keep target fully opaque; HP low should not make the target fade.
        elements.targetObject.style.transform = `scale(${0.92 + ratio * 0.12})`;

        // When completely destroyed, remove the darker/damaged visual state.
        // This prevents lingering dark filters after the target is finished.
        const isDestroyed = state.targetHealth <= 0;

        // These "damage-*" classes are used for the car stage styling.
        // Keep the filter tiers applied even when the target is completely destroyed.
        elements.targetObject.classList.toggle("damage-1", ratio <= 0.85);
        elements.targetObject.classList.toggle("damage-2", ratio <= 0.55);
        elements.targetObject.classList.toggle("damage-3", ratio <= 0.25);

        if (state.stage === "car") {
          applyCarVariantToTarget(elements.targetObject, state.carPartHealth);

          const leftDoorHealth = state.carPartHealth?.leftDoor ?? CAR_PARTS.leftDoor.maxHealth;
          const rightDoorHealth = state.carPartHealth?.rightDoor ?? CAR_PARTS.rightDoor.maxHealth;
          const roofHealth = state.carPartHealth?.roof ?? CAR_PARTS.roof.maxHealth;

          elements.targetObject.classList.toggle(
            "left-door-damaged",
            !isDestroyed && leftDoorHealth <= CAR_PARTS.leftDoor.maxHealth * 0.5,
          );
          elements.targetObject.classList.toggle(
            "right-door-damaged",
            !isDestroyed && rightDoorHealth <= CAR_PARTS.rightDoor.maxHealth * 0.5,
          );
          elements.targetObject.classList.toggle(
            "roof-damaged",
            !isDestroyed && roofHealth <= CAR_PARTS.roof.maxHealth * 0.5,
          );

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
      if (!meteorExplosion.container) {
        initMeteorExplosionLayer()
          .then(() => {
            syncMeteorExplosionLayerSize();
            const delayedImpactPoint = getMeteorImpactPoint();
            triggerMeteorPixiExplosion(delayedImpactPoint.x, delayedImpactPoint.y);
          })
          .catch(() => {
            // Ignore renderer initialization failures.
          });
      }

      syncMeteorExplosionLayerSize();
      const impactPoint = getMeteorImpactPoint();
      triggerMeteorPixiExplosion(impactPoint.x, impactPoint.y);

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
      const remainingTimeBonus = INFINITE_TIMER_MODE ? 0 : Math.max(0, Math.floor(state.timeLeft));
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
        const victoryGoldBase = Math.max(40, Math.floor(finalScore / 25)) + 60;
        const earnedGold = won ? Math.max(1, Math.floor(victoryGoldBase * 0.25)) : 0;
        if (earnedGold > 0) {
          state.gold += earnedGold;
          saveProgress();
        }
        if (elements.stageBonusLabel) {
          elements.stageBonusLabel.textContent = "Complete";
        }
        if (state.score > state.highScore) {
          state.highScore = state.score;
          try {
            window.localStorage.setItem(STORAGE_KEYS.highScore, String(state.highScore));
          } catch {
            // Ignore storage failures.
          }
        }
        updateHud();

        if (won) {
          initVictoryCelebrationLayer().catch(() => {
            // Ignore renderer initialization failures.
          });
        } else {
          destroyVictoryCelebrationLayer();
        }

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
          const goldBreakdown = won
            ? ` Gold earned: ${earnedGold}.`
            : " No gold earned. Complete the target to gain gold.";
          elements.resultCopy.textContent = won
            ? `You smashed the ${STAGES[state.stage].label.toLowerCase()}. ${scoreBreakdown}${goldBreakdown}`
            : `The ${STAGES[state.stage].label.toLowerCase()} survived. ${scoreBreakdown}${goldBreakdown}`;
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

      state.score += calculateHitScoreGain(actualDamageDone, mappedAction);
      if (state.score > state.highScore) {
        state.highScore = state.score;
        try {
          window.localStorage.setItem(STORAGE_KEYS.highScore, String(state.highScore));
        } catch {
          // Ignore storage failures.
        }
      }
      state.combo += 1;
      updateHud();
      updateTargetVisual();
      if ((mappedAction === "punch" || mappedAction === "kick") && actualDamageDone > 0) {
        triggerNormalHitPixiEffect(mappedAction);
      }
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
        const roofLift = state.stage === "car" ? getRoofStandLift() : 0;
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
      const roofStandLift = getRoofStandLift();
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

        const startLift = state.jumpFromRoof ? roofStandLift : 0;
        const endLift = state.jumpLandOnRoof ? roofStandLift : 0;
        const lift = startLift + (endLift - startLift) * progress;
        yOffset = -lift - arcY;
      } else if (state.onRoof) {
        yOffset = -roofStandLift;
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
      state.timeLeft = 0;
      state.crouching = false;
      state.airborne = false;
      state.action = "idle";
      state.targetBroken = false;
      state.specialSkillSwapLockUntil = 0;
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
        state.timeLeft += 1;
        updateHud();
        if (!INFINITE_TIMER_MODE && state.timeLeft <= 0) {
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
      if (state.equippedSkillIds.length < 1) {
        setScreen("skill");
        updateSelectionCards();
        return;
      }
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
      const storedHighScore = Number(window.localStorage.getItem(STORAGE_KEYS.highScore) || 0);
      state.highScore = Number.isFinite(storedHighScore) && storedHighScore > 0 ? Math.floor(storedHighScore) : 0;
    } catch {
      state.highScore = 0;
    }

    try {
      const storedGold = Number(window.localStorage.getItem(STORAGE_KEYS.gold) || 0);
      state.gold = Number.isFinite(storedGold) && storedGold > 0 ? Math.floor(storedGold) : 0;
    } catch {
      state.gold = 0;
    }

    try {
      const rawUnlocked = window.localStorage.getItem(STORAGE_KEYS.unlockedSkills);
      const parsed = rawUnlocked ? JSON.parse(rawUnlocked) : [];
      const unlockedIds = Array.isArray(parsed)
        ? parsed.filter((skillId) => typeof skillId === "string" && getCharacterSkillIds("default").includes(skillId))
        : [];
      state.unlockedSkillIds = new Set(["breaker", ...unlockedIds]);
    } catch {
      state.unlockedSkillIds = new Set(["breaker"]);
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
      on(card, "click", (event) => {
        if (card.classList.contains("is-disabled")) {
          return;
        }

        const buyButton = event.target.closest(".skill-buy-button");
        const skillId = card.dataset.skill;
        const available = getCharacterSkillSet(state.character);
        if (!available.has(skillId)) {
          return;
        }

        if (buyButton) {
          const unlockCost = getSkillUnlockCost(skillId);
          if (state.gold < unlockCost) {
            return;
          }

          state.gold = Math.max(0, state.gold - unlockCost);
          state.unlockedSkillIds.add(skillId);
          saveProgress();
          updateSelectionCards();
          return;
        }

        if (!isSkillUnlocked(skillId)) {
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
      syncMeteorExplosionLayerSize();
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
      destroyMeteorExplosionLayer();
      listeners.forEach((off) => off());
    };
  }, []);

  return (
    <div ref={rootRef}>
      <div className="backdrop"></div>
      <main className="app-shell">
        <section className="top-bar">
          <div className="score-row">
            <div className="score-stack-left">
              <div className="score-pill" id="hud-score">Score 0</div>
              <div className="score-pill" id="hud-high-score">High 0</div>
            </div>
            <div className="timer-pill" id="hud-time">60</div>
            <div className="score-pill gold-pill" id="hud-gold">
              <span className="gold-icon" aria-hidden="true">$</span>
              <span>Gold</span>
              <strong id="hud-gold-value">0</strong>
            </div>
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
            <button className="start-button-text" id="start-button" type="button">
              TAP TO START
            </button>
          </div>
        </section>

        <section className="screen selection-screen screen-character" id="screen-character">
          <div className="selection-frame">
            <div className="panel-head panel-head-centered">
              <h2 className="selection-title">Character Selection</h2>
              <p className="selection-subtitle">Choose your fighter</p>
            </div>
            <div className="character-selection-layout">
              <div className="character-preview-panel">
                <img id="character-preview-sprite" className="character-preview-sprite" src="assets/actions/default/default-idle-position.gif" alt="Hero idle preview" />
                <p className="character-preview-kicker">Selected Fighter</p>
                <h3 id="character-preview-name" className="character-preview-name">Hero</h3>
                <p id="character-preview-stats" className="selection-subtitle">STR 5 | AGI 5</p>
              </div>
              <div className="selection-grid character-selection-grid" id="character-grid">
                <button className="choice-card character-choice-card is-selected" data-character="default" type="button">
                  <img className="character-choice-image" src="assets/selection/select-default.gif" alt="Hero selection preview" />
                </button>
                <button className="choice-card character-choice-card is-locked" data-character="female-hulk" type="button" disabled>
                  <img className="character-choice-image" src="assets/selection/select-female-hulk.gif" alt="Female Hulk selection preview" />
                  <span className="lock-badge">Locked</span>
                </button>
              </div>
            </div>
          </div>
          <div className="screen-actions">
            <button className="secondary-button nav-back-button" id="character-back" type="button">Back</button>
            <button className="primary-button nav-next-button" id="character-next" type="button">Next: Skills</button>
          </div>
        </section>

        <section className="screen selection-screen" id="screen-skill">
          <div className="selection-frame">
            <div className="panel-head panel-head-centered">
              <h2 className="selection-title">Equip Skills</h2>
              <p className="selection-subtitle">Choose up to 2 skills</p>
            </div>
            <p className="selection-subtitle" id="skill-selection-hint">0/2 equipped</p>
            <div className="selection-grid skill-selection-grid" id="skill-grid">
              <div className="choice-card skill-card" data-skill="breaker" role="button" tabIndex={0}>
                <img className="skill-card-icon" src="assets/skill-icons/breaker.jpg" alt="Breaker icon" />
                <div className="skill-card-info">
                  <strong>Breaker</strong>
                  <span>+15 Strength for 7s.</span>
                  <small>15s cooldown.</small>
                  <small className="skill-price" data-skill-cost="breaker" hidden></small>
                  <button className="skill-buy-button" type="button" hidden>Buy 0</button>
                </div>
              </div>
              <div className="choice-card skill-card" data-skill="accelerate" role="button" tabIndex={0}>
                <img className="skill-card-icon" src="assets/skill-icons/accelerate.jpg" alt="Accelerate icon" />
                <div className="skill-card-info">
                  <strong>Accelerate</strong>
                  <span>+30 Agility for 7s.</span>
                  <small>15s cooldown.</small>
                  <small className="skill-price" data-skill-cost="accelerate">Need 500 gold</small>
                  <button className="skill-buy-button" type="button">Buy 500</button>
                </div>
              </div>
              <div className="choice-card skill-card" data-skill="impactBurst" role="button" tabIndex={0}>
                <img className="skill-card-icon" src="assets/skill-icons/impact-burst.jpg" alt="Impact Burst icon" />
                <div className="skill-card-info">
                  <strong>Impact Burst</strong>
                  <span>AOE burst: near +22%.</span>
                  <small>Other hits +15%. 10s cooldown.</small>
                  <small className="skill-price" data-skill-cost="impactBurst">Need 1000 gold</small>
                  <button className="skill-buy-button" type="button">Buy 1000</button>
                </div>
              </div>
              <div className="choice-card skill-card" data-skill="meteorPunch" role="button" tabIndex={0}>
                <img className="skill-card-icon" src="assets/skill-icons/meteor-punch.jpg" alt="Meteor Punch icon" />
                <div className="skill-card-info">
                  <strong>Meteor Punch</strong>
                  <span>Fly up and slam the roof.</span>
                  <small>AOE 20% damage to all. 12s cooldown.</small>
                  <small className="skill-price" data-skill-cost="meteorPunch">Need 1500 gold</small>
                  <button className="skill-buy-button" type="button">Buy 1500</button>
                </div>
              </div>
            </div>
          </div>
          <div className="screen-actions">
            <button className="secondary-button nav-back-button" id="skill-back" type="button">Back</button>
            <button className="primary-button nav-next-button" id="skill-next" type="button">Next: Stage</button>
          </div>
        </section>

        <section className="screen selection-screen" id="screen-stage">
          <div className="selection-frame">
            <div className="panel-head panel-head-centered">
              <h2 className="selection-title">Stage Selection</h2>
              <p className="selection-subtitle" id="stage-character-label">Selected Fighter: Hero</p>
            </div>
            <div className="character-selection-layout stage-selection-layout">
              <div className="character-preview-panel stage-selected-character">
                <img id="stage-character-sprite" className="stage-character-sprite" src="assets/actions/default/default-idle-position.gif" alt="Hero idle preview" />
                <div>
                  <p className="character-preview-kicker">Current Fighter</p>
                  <h3 id="stage-character-name" className="character-preview-name">Hero</h3>
                  <p id="stage-character-stats" className="selection-subtitle">STR 5 | AGI 5</p>
                </div>
              </div>
              <div className="selection-grid stage-grid stage-selection-grid" id="stage-grid">
                <button className="choice-card is-selected" data-stage="car" type="button">
                  <div className="stage-preview stage-preview-image-wrap">
                    <img className="stage-preview-image" src="assets/stages/stage-car-img.png" alt="Car stage preview" />
                  </div>
                  <span>Car</span>
                </button>
                <button className="choice-card" data-stage="wooden-box" type="button">
                  <div className="stage-preview stage-preview-image-wrap">
                    <img className="stage-preview-image" src="assets/stages/stage-woodbox-img.png" alt="Wooden box stage preview" />
                  </div>
                  <span>Wooden Box</span>
                </button>
              </div>
            </div>
          </div>
          <div className="screen-actions">
            <button className="secondary-button nav-back-button" id="stage-back" type="button">Back</button>
            <button className="primary-button" id="stage-start" type="button">DESTROY!!!</button>
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
            </div>

            <div className="controls-overlay">
              <div className="left-controls">
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
              </div>

              <div className="right-controls">
                <div className="skill-stack" aria-label="Skill controls">
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
                <div className="action-pad" aria-label="Action controls">
                  <button className="control-button action-punch" data-action="punch" type="button" aria-label="Punch (P)">
                    <span className="action-label">P</span>
                  </button>
                  <button className="control-button action-kick" data-action="kick" type="button" aria-label="Kick (K)">
                    <span className="action-label">K</span>
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
          <h2>Vertical Ready</h2>
          <p>Street Buster is tuned to run in portrait mode on phones.</p>
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
