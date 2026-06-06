import { withBase } from "./base";
import { MAX_EQUIPPED_SKILLS, TEMPORARILY_UNLOCK_ALL_SKILLS } from "./constants";

export const SKILLS_BY_ID = {
  meteorPunch: {
    id: "meteorPunch",
    name: "Meteor Punch",
    icon: "MP",
    iconSrc: withBase("assets/skill-icons/meteor-punch.jpg"),
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
    iconSrc: withBase("assets/skill-icons/breaker.jpg"),
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
    iconSrc: withBase("assets/skill-icons/accelerate.jpg"),
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
    iconSrc: withBase("assets/skill-icons/impact-burst.jpg"),
    description: "AOE burst: near target +22%, otherwise +15%.",
    type: "active",
    cooldownMs: 10000,
    durationMs: 0,
    unlockGold: 1000,
  },
};

export const CHARACTER_SKILLS = {
  default: ["breaker", "accelerate", "impactBurst", "meteorPunch"],
  "female-hulk": [],
};

export { MAX_EQUIPPED_SKILLS, TEMPORARILY_UNLOCK_ALL_SKILLS };

export function getSkillUnlockCost(skillId) {
  const unlockCost = SKILLS_BY_ID[skillId]?.unlockGold;
  return Number.isFinite(unlockCost) && unlockCost > 0 ? Math.floor(unlockCost) : 0;
}

