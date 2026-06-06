import { withBase } from "./base";

export const CHARACTER_LABELS = {
  default: "Hero",
  "female-hulk": "Female Hulk",
};

export const BALANCED_CHARACTER_STATS = {
  strength: 5,
  agility: 5,
};

export const CHARACTER_STATS = {
  default: {
    strength: 5,
    agility: 5,
  },
  "female-hulk": {
    strength: 7,
    agility: 4,
  },
};

export const LOCKED_CHARACTERS = new Set(["female-hulk"]);

export const SPRITES = {
  default: {
    idle: withBase("assets/actions/default/default-idle-position.gif"),
    celebPost: withBase("assets/actions/default/celeb-post.gif"),
    meteorPunch: withBase("assets/actions/default/meteor-punch.gif"),
    impactBurst: withBase("assets/actions/default/impact-burst.gif"),
    punch: withBase("assets/actions/default/default-punch-post.gif"),
    kick: withBase("assets/actions/default/default-kick-post.gif"),
    jump: withBase("assets/actions/default/default-jump-post.gif"),
    jumpPunch: withBase("assets/actions/default/default-jump-punch-post.gif"),
    jumpKick: withBase("assets/actions/default/default-jump-kick-post.gif"),
    crouch: withBase("assets/actions/default/default-crouch.gif"),
    crouchPunch: withBase("assets/actions/default/default-crouch-punch.gif"),
    crouchKick: withBase("assets/actions/default/default-crouch-kick.gif"),
  },
  "female-hulk": {
    idle: withBase("assets/actions/female-hulk/female-hulk-idle-position.gif"),
    celebPost: withBase("assets/actions/female-hulk/female-hulk-idle-position.gif"),
    punch: withBase("assets/actions/female-hulk/female-hulk-punch-post.gif"),
    kick: withBase("assets/actions/female-hulk/female-hulk-kick-post.gif"),
    jump: withBase("assets/actions/female-hulk/female-hulk-jump-post.gif"),
    jumpPunch: withBase("assets/actions/female-hulk/female-hulk-jump-punch-post.gif"),
    jumpKick: withBase("assets/actions/female-hulk/female-hulk-jump-kick-post.gif"),
    crouch: withBase("assets/actions/female-hulk/female-hulk-crouch.gif"),
    crouchPunch: withBase("assets/actions/female-hulk/female-hulk-crouch-punch.gif"),
    crouchKick: withBase("assets/actions/female-hulk/female-hulk-crouch-kick.gif"),
  },
};

