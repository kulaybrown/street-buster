import { STAGES, SPRITES, CHARACTER_LABELS, CHARACTER_STATS } from "../../data";

export default function StageSelectionScreen({
  selectedCharacter,
  selectedStage,
  onSelectStage,
  onBack,
  onStart,
  maxStages,
}) {
  const stages = Object.keys(STAGES);
  const previewCharacter = selectedCharacter || "default";
  const previewStats = CHARACTER_STATS[previewCharacter] || CHARACTER_STATS.default;

  return (
    <section className="screen selection-screen" id="screen-stage" data-screen="stage">
      <div className="selection-frame">
        <div className="panel-head panel-head-centered">
          <h2 className="selection-title">Stage Selection</h2>
          <p className="selection-subtitle" id="stage-character-label">Selected Fighter: {CHARACTER_LABELS[previewCharacter]}</p>
        </div>

        <div className="character-selection-layout stage-selection-layout">
          <div className="character-preview-panel stage-selected-character">
            <img
              id="stage-character-sprite"
              className="stage-character-sprite"
              src={SPRITES[previewCharacter]?.idle || SPRITES.default.idle}
              alt={`${CHARACTER_LABELS[previewCharacter]} idle preview`}
            />

            <div>
              <p className="character-preview-kicker">Current Fighter</p>
              <h3 id="stage-character-name" className="character-preview-name">{CHARACTER_LABELS[previewCharacter]}</h3>
              <p id="stage-character-stats" className="selection-subtitle">STR {previewStats.strength} | AGI {previewStats.agility}</p>
            </div>
          </div>

          <div className="selection-grid stage-grid stage-selection-grid" id="stage-grid">
            {stages.map((stageKey) => {
              const stage = STAGES[stageKey];
              const isSelected = stageKey === selectedStage;
              const isLocked = false;
              const imgSrc = stageKey === "car" ? "/assets/stages/stage-car-img.png" : "/assets/stages/stage-woodbox-img.png";

              return (
                <button
                  key={stageKey}
                  className={`choice-card ${isSelected ? "is-selected" : ""}`}
                  data-stage={stageKey}
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    if (isLocked) return;
                    onSelectStage?.(stageKey);
                  }}
                >
                  <div className="stage-preview stage-preview-image-wrap">
                    <img className="stage-preview-image" src={imgSrc} alt={`${stage.label} stage preview`} />
                  </div>
                  <span>{stage.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="screen-actions">
        <button className="secondary-button nav-back-button" id="stage-back" type="button" onClick={onBack}>
          Back
        </button>
        <button className="primary-button" id="stage-start" type="button" onClick={onStart}>
          DESTROY!!!
        </button>
      </div>
    </section>
  );
}

