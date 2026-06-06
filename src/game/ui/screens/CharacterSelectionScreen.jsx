import { withBase } from "../../data/base";
import { CHARACTER_LABELS, CHARACTER_STATS, LOCKED_CHARACTERS, SPRITES } from "../../data";

export default function CharacterSelectionScreen({
  selectedCharacter,
  onSelectCharacter,
  onBack,
  onNext,
}) {
  const characters = Object.keys(CHARACTER_LABELS);

  const previewCharacter = selectedCharacter || "default";
  const previewStats = CHARACTER_STATS[previewCharacter] || CHARACTER_STATS.default;

  return (
    <section className="screen selection-screen screen-character" id="screen-character" data-screen="character">
      <div className="selection-frame">
        <div className="panel-head panel-head-centered">
          <h2 className="selection-title">Character Selection</h2>
          <p className="selection-subtitle">Choose your fighter</p>
        </div>

        <div className="character-selection-layout">
          <div className="character-preview-panel">
            <img
              id="character-preview-sprite"
              className="character-preview-sprite"
              src={SPRITES[previewCharacter]?.idle || SPRITES.default.idle}
              alt={`${CHARACTER_LABELS[previewCharacter]} idle preview`}
            />
            <p className="character-preview-kicker">Selected Fighter</p>
            <h3 id="character-preview-name" className="character-preview-name">{CHARACTER_LABELS[previewCharacter]}</h3>
            <p id="character-preview-stats" className="selection-subtitle">
              STR {previewStats.strength} | AGI {previewStats.agility}
            </p>
          </div>

          <div className="selection-grid character-selection-grid" id="character-grid">
            {characters.map((character) => {
              const locked = LOCKED_CHARACTERS.has(character);
              const isSelected = character === previewCharacter;

              const imgSrc = character === "default"
                ? withBase("assets/selection/select-default.gif")
                : withBase("assets/selection/select-female-hulk.gif");

              return (
                <button
                  key={character}
                  className={`choice-card character-choice-card ${isSelected ? "is-selected" : ""} ${locked ? "is-locked" : ""}`}
                  data-character={character}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    if (locked) return;
                    onSelectCharacter?.(character);
                  }}
                >
                  <img className="character-choice-image" src={imgSrc} alt={`${CHARACTER_LABELS[character]} selection preview`} />
                  {locked ? <span className="lock-badge">Locked</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="screen-actions">
        <button className="secondary-button nav-back-button" id="character-back" type="button" onClick={onBack}>
          Back
        </button>
        <button className="primary-button nav-next-button" id="character-next" type="button" onClick={onNext}>
          Next: Skills
        </button>
      </div>
    </section>
  );
}

