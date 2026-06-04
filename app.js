const SPRITES = {
  default: {
    idle: "/assets/actions/default/default-idle-position.gif",
    punch: "/assets/actions/default/default-punch-post.gif",
    kick: "/assets/actions/default/default-kick-post.gif",
    jump: "/assets/actions/default/default-jump-post.gif",
    jumpPunch: "/assets/actions/default/default-jump-punch-post.gif",
    jumpKick: "/assets/actions/default/default-jump-kick-post.gif",
    crouch: "/assets/actions/default/default-crouch.gif",
    crouchPunch: "/assets/actions/default/default-crouch-punch.gif",
    crouchKick: "/assets/actions/default/default-crouch-kick.gif",
  },
  "female-hulk": {
    idle: "/assets/actions/female-hulk/female-hulk-idle-position.gif",
    punch: "/assets/actions/female-hulk/female-hulk-punch-post.gif",
    kick: "/assets/actions/female-hulk/female-hulk-kick-post.gif",
    jump: "/assets/actions/female-hulk/female-hulk-jump-post.gif",
    jumpPunch: "/assets/actions/female-hulk/female-hulk-jump-punch-post.gif",
    jumpKick: "/assets/actions/female-hulk/female-hulk-jump-kick-post.gif",
    crouch: "/assets/actions/female-hulk/female-hulk-crouch.gif",
    crouchPunch: "/assets/actions/female-hulk/female-hulk-crouch-punch.gif",
    crouchKick: "/assets/actions/female-hulk/female-hulk-crouch-kick.gif",
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
    targetLabel: "Car",
  },
  "wooden-box": {
    label: "Wooden Box",
    maxHealth: 14,
    stageClass: "stage-box",
    targetLabel: "Wooden Box",
  },
};

const state = {
  screen: "start",
  character: "default",
  stage: "car",
  score: 0,
  combo: 0,
  timeLeft: 30,
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
  frameId: null,
  jumpStart: 0,
  jumpDuration: 1500,
};

const elements = {
  screens: {
    start: document.getElementById("screen-start"),
    character: document.getElementById("screen-character"),
    stage: document.getElementById("screen-stage"),
    game: document.getElementById("screen-game"),
  },
  startButton: document.getElementById("start-button"),
  characterBack: document.getElementById("character-back"),
  characterNext: document.getElementById("character-next"),
  stageBack: document.getElementById("stage-back"),
  stageStart: document.getElementById("stage-start"),
  resultOverlay: document.getElementById("result-overlay"),
  resultLabel: document.getElementById("result-label"),
  resultTitle: document.getElementById("result-title"),
  resultCopy: document.getElementById("result-copy"),
  resultChooseAgain: document.getElementById("result-choose-again"),
  resultPlayAgain: document.getElementById("result-play-again"),
  fighterSprite: document.getElementById("fighter-sprite"),
  fighterWrap: document.getElementById("fighter-wrap"),
  targetWrap: document.getElementById("target-wrap"),
  targetObject: document.getElementById("target-object"),
  targetHealthLabel: document.getElementById("target-health-label"),
  targetHealthBar: document.getElementById("target-health-bar"),
  comboLabel: document.getElementById("combo-label"),
  stageBonusLabel: document.getElementById("stage-bonus-label"),
  hudCharacter: document.getElementById("hud-character"),
  hudStage: document.getElementById("hud-stage"),
  hudScore: document.getElementById("hud-score"),
  hudTime: document.getElementById("hud-time"),
  targetHitFlash: document.getElementById("target-hit-flash"),
  targetParticles: document.getElementById("target-particles"),
  characterCards: Array.from(document.querySelectorAll("#character-grid .choice-card")),
  stageCards: Array.from(document.querySelectorAll("#stage-grid .choice-card")),
  controlButtons: Array.from(document.querySelectorAll(".control-button[data-action]")),
};

const damageMap = {
  punch: 1,
  kick: 2,
  jumpPunch: 1,
  jumpKick: 2,
  crouchPunch: 1,
  crouchKick: 2,
};

function setScreen(name) {
  state.screen = name;
  Object.entries(elements.screens).forEach(([screenName, element]) => {
    element.classList.toggle("is-active", screenName === name);
  });
  if (name !== "game") {
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
}

function updateHud() {
  elements.hudCharacter.textContent = `Character: ${CHARACTER_LABELS[state.character]}`;
  elements.hudStage.textContent = `Stage: ${STAGES[state.stage].label}`;
  elements.hudScore.textContent = `Score: ${state.score}`;
  elements.hudTime.textContent = `Time: ${Math.max(0, state.timeLeft)}`;
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
  if (state.frameId) {
    window.cancelAnimationFrame(state.frameId);
    state.frameId = null;
  }
}

function setSprite(key) {
  const sprite = SPRITES[state.character][key] || SPRITES[state.character].idle;
  elements.fighterSprite.src = sprite;
  elements.fighterSprite.alt = `${CHARACTER_LABELS[state.character]} ${key}`;
}

function resetFighterPose() {
  if (state.airborne) {
    setSprite("jump");
    return;
  }
  if (state.crouching) {
    setSprite("crouch");
    return;
  }
  setSprite("idle");
}

function setTargetStage() {
  elements.targetObject.className = `target ${STAGES[state.stage].stageClass}`;
  if (state.stage === "car") {
    elements.targetObject.innerHTML = '<div class="target-car-wheel left"></div><div class="target-car-wheel right"></div>';
  } else {
    elements.targetObject.innerHTML = '<div class="crate-face"></div>';
  }
}

function updateTargetVisual() {
  const ratio = state.targetMaxHealth === 0 ? 0 : state.targetHealth / state.targetMaxHealth;
  elements.targetHealthLabel.textContent = `${Math.max(0, state.targetHealth)} / ${state.targetMaxHealth}`;
  elements.targetHealthBar.style.width = `${Math.max(0, ratio * 100)}%`;
  elements.targetObject.style.transform = `scale(${0.92 + ratio * 0.12})`;
  elements.targetObject.style.opacity = `${0.55 + ratio * 0.45}`;
  elements.stageBonusLabel.textContent = state.targetBroken ? "Broken" : ratio < 0.35 ? "Cracking" : "Ready";
  if (state.stage === "car") {
    elements.targetObject.classList.toggle("damage-1", ratio <= 0.85);
    elements.targetObject.classList.toggle("damage-2", ratio <= 0.55);
    elements.targetObject.classList.toggle("damage-3", ratio <= 0.25);
  }
}

function spawnParticles() {
  const count = 6;
  elements.targetParticles.innerHTML = "";
  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement("span");
    particle.className = "particle";
    const angle = Math.random() * Math.PI * 2;
    const distance = 24 + Math.random() * 56;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance * -0.6 - 18;
    particle.style.left = `${45 + Math.random() * 12}%`;
    particle.style.top = `${40 + Math.random() * 18}%`;
    particle.style.setProperty("--dx", `${dx}px`);
    particle.style.setProperty("--dy", `${dy}px`);
    particle.style.background = index % 2 === 0 ? "#f3b54a" : "#ff736d";
    elements.targetParticles.appendChild(particle);
  }
}

function flashHit() {
  elements.targetHitFlash.animate(
    [
      { opacity: 0, transform: "translate(-50%, 50%) scale(0.25)" },
      { opacity: 1, transform: "translate(-50%, 50%) scale(1.4)" },
      { opacity: 0, transform: "translate(-50%, 50%) scale(2.1)" },
    ],
    { duration: 240, easing: "ease-out" },
  );
  elements.targetWrap.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-10px)" },
      { transform: "translateX(8px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 240, easing: "ease-out" },
  );
}

function applyDamage(amount) {
  if (state.targetBroken || amount <= 0) {
    return;
  }
  state.targetHealth = Math.max(0, state.targetHealth - amount);
  state.score += amount * 100;
  state.combo += 1;
  updateHud();
  updateTargetVisual();
  flashHit();
  spawnParticles();
  if (state.targetHealth <= 0) {
    state.targetBroken = true;
    elements.targetObject.classList.add("broken");
    elements.stageBonusLabel.textContent = "Broken";
    window.setTimeout(() => finishGame(true), 650);
  }
}

function returnToRestingPose() {
  if (state.airborne) {
    setSprite("jump");
    state.action = "jump";
    return;
  }
  if (state.crouching) {
    setSprite("crouch");
    state.action = "crouch";
    return;
  }
  setSprite("idle");
  state.action = "idle";
}

function performAction(action) {
  if (!state.running) {
    return;
  }

  if (action === "restart") {
    startGame();
    return;
  }

  if (action === "idle") {
    state.crouching = false;
    state.airborne = false;
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

  if (action === "jump") {
    if (state.airborne) {
      return;
    }
    state.crouching = false;
    state.airborne = true;
    state.action = "jump";
    state.jumpStart = performance.now();
    clearTimeout(state.jumpTimer);
    setSprite("jump");
    state.jumpTimer = window.setTimeout(() => {
      state.airborne = false;
      state.jumpTimer = null;
      returnToRestingPose();
    }, 1500);
    return;
  }

  if (action === "crouch") {
    if (state.airborne) {
      return;
    }
    state.crouching = !state.crouching;
    state.action = state.crouching ? "crouch" : "idle";
    clearTimeout(state.actionTimer);
    setSprite(state.crouching ? "crouch" : "idle");
    return;
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

  const spriteKey =
    mappedAction === "jumpPunch" || mappedAction === "jumpKick"
      ? mappedAction
      : mappedAction === "crouchPunch" || mappedAction === "crouchKick"
        ? mappedAction
        : mappedAction;

  state.action = mappedAction;
  clearTimeout(state.actionTimer);
  setSprite(spriteKey);
  applyDamage(damageMap[mappedAction] || 0);

  state.actionTimer = window.setTimeout(() => {
    state.actionTimer = null;
    returnToRestingPose();
  }, 340);
}

function updateFighterPosition(now) {
  const height = window.innerWidth <= 560 ? 86 : 118;
  let yOffset = 0;
  let xOffset = 0;

  if (state.airborne) {
    const progress = Math.min(1, (now - state.jumpStart) / state.jumpDuration);
    yOffset = -Math.sin(progress * Math.PI) * height;
  } else if (state.crouching) {
    yOffset = 18;
  }

  if (state.action === "punch" || state.action === "jumpPunch" || state.action === "crouchPunch") {
    xOffset = 4;
  } else if (state.action === "kick" || state.action === "jumpKick" || state.action === "crouchKick") {
    xOffset = 8;
  }

  elements.fighterWrap.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0) scale(${state.crouching ? 0.98 : 1})`;
  state.frameId = window.requestAnimationFrame(updateFighterPosition);
}

function finishGame(won) {
  if (!state.running) {
    return;
  }
  state.running = false;
  clearTimers();
  elements.resultOverlay.hidden = false;
  elements.resultLabel.textContent = won ? "Victory" : "Time Up";
  elements.resultTitle.textContent = won ? "Target destroyed" : "Round over";
  elements.resultCopy.textContent = won
    ? `You smashed the ${STAGES[state.stage].label.toLowerCase()} with a score of ${state.score}.`
    : `The ${STAGES[state.stage].label.toLowerCase()} survived. Final score: ${state.score}.`;
}

function startGame() {
  clearTimers();
  state.running = true;
  state.score = 0;
  state.combo = 0;
  state.timeLeft = 30;
  state.crouching = false;
  state.airborne = false;
  state.action = "idle";
  state.targetBroken = false;
  state.targetMaxHealth = STAGES[state.stage].maxHealth;
  state.targetHealth = state.targetMaxHealth;
  elements.resultOverlay.hidden = true;
  setTargetStage();
  updateSelectionCards();
  updateHud();
  updateTargetVisual();
  setScreen("game");
  setSprite("idle");
  elements.fighterWrap.style.transform = "translate3d(0, 0, 0) scale(1)";
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

function bindSelectionHandlers() {
  elements.characterCards.forEach((card) => {
    card.addEventListener("click", () => {
      state.character = card.dataset.character;
      updateSelectionCards();
    });
  });

  elements.stageCards.forEach((card) => {
    card.addEventListener("click", () => {
      state.stage = card.dataset.stage;
      updateSelectionCards();
    });
  });
}

function bindButtons() {
  elements.startButton.addEventListener("click", goToCharacterSelection);
  elements.characterBack.addEventListener("click", goToStart);
  elements.characterNext.addEventListener("click", goToStageSelection);
  elements.stageBack.addEventListener("click", goToCharacterSelection);
  elements.stageStart.addEventListener("click", startGame);
  elements.resultChooseAgain.addEventListener("click", goToCharacterSelection);
  elements.resultPlayAgain.addEventListener("click", startGame);

  elements.controlButtons.forEach((button) => {
    button.addEventListener("click", () => performAction(button.dataset.action));
  });

  window.addEventListener("keydown", (event) => {
    if (event.repeat) {
      return;
    }
    const keyMap = {
      z: "punch",
      x: "kick",
      ArrowUp: "jump",
      ArrowDown: "crouch",
      Escape: "idle",
      r: "restart",
    };
    const mappedAction = keyMap[event.key];
    if (mappedAction) {
      event.preventDefault();
      performAction(mappedAction);
    }
  });
}

function preloadSprites() {
  Object.values(SPRITES).forEach((character) => {
    Object.values(character).forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  });
}

function init() {
  preloadSprites();
  bindSelectionHandlers();
  bindButtons();
  updateSelectionCards();
  updateHud();
  setTargetStage();
  setSprite("idle");
  setScreen("start");
}

init();
