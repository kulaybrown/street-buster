import { useEffect, useRef } from "react";

const SPRITES = {
  default: {
    idle: "assets/actions/default/default-idle-position.gif",
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

const damageMap = {
  punch: 1,
  kick: 2,
  jumpPunch: 1,
  jumpKick: 2,
  crouchPunch: 1,
  crouchKick: 2,
};

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
      moveOffsetX: 0,
      jumpDriftX: 0,
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
        elements.targetObject.innerHTML = '<div class="target-car-wheel left"></div><div class="target-car-wheel right"></div>';
      } else {
        elements.targetObject.innerHTML = '<div class="crate-face"></div>';
      }
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
          elements.targetObject.classList.toggle("damage-1", ratio <= 0.85);
          elements.targetObject.classList.toggle("damage-2", ratio <= 0.55);
          elements.targetObject.classList.toggle("damage-3", ratio <= 0.25);
        }
      }
      if (elements.stageBonusLabel) {
        elements.stageBonusLabel.textContent = state.targetBroken ? "Broken" : ratio < 0.35 ? "Cracking" : "Ready";
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
            { transform: "translateX(0)" },
            { transform: "translateX(-10px)" },
            { transform: "translateX(8px)" },
            { transform: "translateX(0)" },
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
      state.running = false;
      clearTimers();
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
        elements.resultCopy.textContent = won
          ? `You smashed the ${STAGES[state.stage].label.toLowerCase()} with a score of ${state.score}.`
          : `The ${STAGES[state.stage].label.toLowerCase()} survived. Final score: ${state.score}.`;
      }
    }

    function applyDamage(amount) {
      if (state.targetBroken || amount <= 0) {
        return;
      }
      state.targetHealth = Math.max(0, state.targetHealth - amount);
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
      const height = window.innerWidth <= 560 ? 86 : 118;
      let yOffset = 0;
      let xOffset = state.moveOffsetX;

      if (state.airborne) {
        const progress = Math.min(1, (now - state.jumpStart) / state.jumpDuration);
        yOffset = -Math.sin(progress * Math.PI) * height;
        xOffset += state.jumpDriftX * Math.sin(progress * Math.PI);
      } else if (state.crouching) {
        yOffset = 18;
      }

      if (state.action === "punch" || state.action === "jumpPunch" || state.action === "crouchPunch") {
        xOffset = 4;
      } else if (state.action === "kick" || state.action === "jumpKick" || state.action === "crouchKick") {
        xOffset = 8;
      }

      if (elements.fighterWrap) {
        elements.fighterWrap.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0) scale(${state.crouching ? 0.98 : 1})`;
      }
      state.frameId = window.requestAnimationFrame(updateFighterPosition);
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
      state.moveOffsetX = 0;
      state.jumpDriftX = 0;
      if (elements.resultOverlay) {
        elements.resultOverlay.hidden = true;
      }
      setTargetStage();
      updateSelectionCards();
      updateHud();
      updateTargetVisual();
      setScreen("game");
      setSprite("idle");
      if (elements.fighterWrap) {
        elements.fighterWrap.style.transform = "translate3d(0, 0, 0) scale(1)";
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
        state.jumpDriftX = 0;
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
        const step = action === "moveLeft" ? -26 : 26;
        state.moveOffsetX = Math.max(-58, Math.min(58, state.moveOffsetX + step));
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
        state.crouching = false;
        state.airborne = true;
        state.jumpDriftX = 0;
        state.action = "jump";
        state.jumpStart = performance.now();
        window.clearTimeout(state.jumpTimer);
        setSprite("jump");
        state.jumpTimer = window.setTimeout(() => {
          state.airborne = false;
          state.jumpTimer = null;
          returnToRestingPose();
        }, 1500);
        return;
      }

      if (action === "jumpLeft" || action === "jumpRight") {
        if (state.airborne) {
          return;
        }
        state.crouching = false;
        state.airborne = true;
        state.jumpDriftX = action === "jumpLeft" ? -70 : 70;
        state.action = "jump";
        state.jumpStart = performance.now();
        window.clearTimeout(state.jumpTimer);
        setSprite("jump");
        state.jumpTimer = window.setTimeout(() => {
          state.airborne = false;
          state.jumpTimer = null;
          state.jumpDriftX = 0;
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
        window.clearTimeout(state.actionTimer);
        setSprite(state.crouching ? "crouch" : "idle");
        return;
      }

      if (action === "crouchLeft" || action === "crouchRight") {
        if (state.airborne) {
          return;
        }
        const step = action === "crouchLeft" ? -22 : 22;
        state.moveOffsetX = Math.max(-58, Math.min(58, state.moveOffsetX + step));
        state.crouching = true;
        state.action = "crouch";
        window.clearTimeout(state.actionTimer);
        setSprite("crouch");
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

      state.action = mappedAction;
      window.clearTimeout(state.actionTimer);
      setSprite(mappedAction);
      applyDamage(damageMap[mappedAction] || 0);

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
      on(button, "click", () => performAction(button.dataset.action));
    });

    const resolveArrowAction = () => {
      const up = pressedArrows.has("ArrowUp");
      const down = pressedArrows.has("ArrowDown");
      const left = pressedArrows.has("ArrowLeft");
      const right = pressedArrows.has("ArrowRight");

      if (up && left) {
        return "jumpLeft";
      }
      if (up && right) {
        return "jumpRight";
      }
      if (down && left) {
        return "crouchLeft";
      }
      if (down && right) {
        return "crouchRight";
      }
      if (up) {
        return "jump";
      }
      if (down) {
        return "crouch";
      }
      if (left) {
        return "moveLeft";
      }
      if (right) {
        return "moveRight";
      }
      return null;
    };

    const handleKeydown = (event) => {
      if (event.repeat) {
        return;
      }

      if (event.key === "z" || event.key === "x" || event.key === "Escape" || event.key === "q" || event.key === "e") {
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
      if (event.key === "q") {
        performAction("jumpLeft");
        return;
      }
      if (event.key === "e") {
        performAction("jumpRight");
        return;
      }

      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        return;
      }

      event.preventDefault();
      pressedArrows.add(event.key);
      const mappedAction = resolveArrowAction();
      if (mappedAction) {
        performAction(mappedAction);
      }
    };

    const handleKeyup = (event) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        return;
      }
      pressedArrows.delete(event.key);
    };

    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("keyup", handleKeyup);
    listeners.push(() => window.removeEventListener("keydown", handleKeydown));
    listeners.push(() => window.removeEventListener("keyup", handleKeyup));

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
            <div className="timer-pill" id="hud-time">30</div>
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
                  <button className="control-button dpad-up-left" data-action="jumpLeft" type="button">↖</button>
                  <button className="control-button dpad-up" data-action="jump" type="button">↑</button>
                  <button className="control-button dpad-up-right" data-action="jumpRight" type="button">↗</button>
                  <button className="control-button dpad-left" data-action="moveLeft" type="button">←</button>
                  <div className="joystick-core" aria-hidden="true"></div>
                  <button className="control-button dpad-right" data-action="moveRight" type="button">→</button>
                  <button className="control-button dpad-down-left" data-action="crouchLeft" type="button">↙</button>
                  <button className="control-button dpad-down" data-action="crouch" type="button">↓</button>
                  <button className="control-button dpad-down-right" data-action="crouchRight" type="button">↘</button>
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
