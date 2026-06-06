import { withBase, MAX_EQUIPPED_SKILLS } from "../../data";
import { SKILLS_BY_ID } from "../../data/skills";
import { CHARACTER_SKILLS } from "../../data/skills";

function getUnlockCostLabel(skillId) {
  const unlockGold = SKILLS_BY_ID[skillId]?.unlockGold || 0;
  return unlockGold > 0 ? `Need ${unlockGold} gold` : "";
}

export default function SkillSelectionScreen({
  selectedCharacter,
  equippedSkillIds,
  gold,
  unlockedSkillIds,
  stageLockSatisfied,
  onBack,
  onNext,
  onBuySkill,
  onToggleSkill,
}) {
  const characterSkillIds = CHARACTER_SKILLS[selectedCharacter] || [];

  const selected = new Set(equippedSkillIds || []);
  const unlocked = new Set(unlockedSkillIds || []);
  const reachedLimit = (equippedSkillIds || []).length >= MAX_EQUIPPED_SKILLS;

  const skills = Object.values(SKILLS_BY_ID);

  return (
    <section className="screen selection-screen" id="screen-skill" data-screen="skill">
      <div className="selection-frame">
        <div className="panel-head panel-head-centered">
          <h2 className="selection-title">Equip Skills</h2>
          <p className="selection-subtitle">Choose up to 2 skills</p>
        </div>
        <p className="selection-subtitle" id="skill-selection-hint">
          {(equippedSkillIds || []).length}/{MAX_EQUIPPED_SKILLS} equipped
        </p>

        <div className="selection-grid skill-selection-grid" id="skill-grid">
          {skills.map((skill) => {
            const canUseForCharacter = characterSkillIds.includes(skill.id);
            const isSelected = selected.has(skill.id);
            const isUnlocked = unlocked.has(skill.id) || skill.unlockGold === 0;
            const disabledForLimit = !isSelected && reachedLimit;
            const disabledForGold = canUseForCharacter && !isUnlocked;
            const costLabelText = canUseForCharacter && !isUnlocked ? getUnlockCostLabel(skill.id) : "";

            const isDisabled = !canUseForCharacter || disabledForLimit || disabledForGold;
            const buyButtonHidden = canUseForCharacter && isUnlocked;

            return (
              <div
                key={skill.id}
                className={`choice-card skill-card ${isSelected ? "is-selected" : ""} ${canUseForCharacter ? "" : "is-disabled"} ${disabledForGold ? "is-locked" : ""}`}
                data-skill={skill.id}
                role="button"
                tabIndex={0}
                aria-disabled={isDisabled}
              >
                <img className="skill-card-icon" src={skill.iconSrc} alt={`${skill.name} icon`} />
                <div className="skill-card-info">
                  <strong>{skill.name}</strong>
                  <span>{skill.description}</span>
                  <small>{skill.cooldownMs ? `${Math.ceil(skill.cooldownMs / 1000)}s cooldown.` : ""}</small>

                  <small className="skill-price" data-skill-cost={skill.id} hidden>
                    {costLabelText}
                  </small>

                  {canUseForCharacter && !isUnlocked ? (
                    <button
                      className="skill-buy-button"
                      type="button"
                      onClick={() => onBuySkill?.(skill.id)}
                      disabled={gold < (skill.unlockGold || 0)}
                    >
                      Buy {skill.unlockGold || 0}
                    </button>
                  ) : (
                    <button
                      className="skill-buy-button"
                      type="button"
                      hidden={buyButtonHidden}
                      onClick={() => onToggleSkill?.(skill.id)}
                    >
                      {isSelected ? "Remove" : "Buy"}
                    </button>
                  )}

                  {canUseForCharacter && isUnlocked ? (
                    <button
                      className="skill-buy-button"
                      type="button"
                      hidden
                      onClick={() => onToggleSkill?.(skill.id)}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="screen-actions">
        <button className="secondary-button nav-back-button" id="skill-back" type="button" onClick={onBack}>
          Back
        </button>
        <button className="primary-button nav-next-button" id="skill-next" type="button" onClick={onNext} disabled={!stageLockSatisfied}>
          Next: Stage
        </button>
      </div>
    </section>
  );
}

