
import { ArchetypeID, ArchetypeConfig, MoveType, EmoteConfig, EmoteType } from './types';
import { 
  Sword, 
  Shield, 
  Eye, 
  Dices
} from 'lucide-react';

export const MAX_HP = 100;
export const WIN_ROUNDS = 3; // Best of 5 means first to 3
export const TURN_TIMER = 5; // Seconds

// Willpower Stats (New Computational Layer)
export const MAX_WILL = 100;
export const START_WILL = 75;
export const WILL_REGEN = 40; // Gained on Observe
export const WILL_COSTS: Record<MoveType, number> = {
  [MoveType.STRIKE]: 25,
  [MoveType.SHIELD]: 15,
  [MoveType.GAMBLE]: 35,
  [MoveType.OBSERVE]: 0,
  [MoveType.NONE]: 0
};

// Move Stats
export const DMG_STRIKE = 15;
export const DMG_GAMBLE_SUCCESS = 35;
export const DMG_GAMBLE_FAIL_SELF = 8; // Reduced from 10 to be slightly less punishing
export const HEAL_OBSERVE = 10; // Buffed from 5 to make patience more viable
export const DMG_EXHAUSTION = 10; // Extra damage taken when burning out

export const EMOTE_DURATION = 3000;

export const EMOTES: EmoteConfig[] = [
  { id: 'happy', icon: '😊', label: 'Smile', type: EmoteType.HAPPY },
  { id: 'angry', icon: '😠', label: 'Rage', type: EmoteType.ANGRY },
  { id: 'shocked', icon: '😲', label: 'Shock', type: EmoteType.SHOCKED },
  { id: 'thinking', icon: '🤔', label: 'Think', type: EmoteType.THINKING },
  { id: 'taunt', icon: '😜', label: 'Taunt', type: EmoteType.TAUNT },
  { id: 'sad', icon: '😢', label: 'Cry', type: EmoteType.SAD },
];

export const ARCHETYPES: Record<ArchetypeID, ArchetypeConfig> = {
  [ArchetypeID.IMPULSE]: {
    id: ArchetypeID.IMPULSE,
    name: "The Impulse",
    title: "Avatar of Aggression",
    description: "Reacts without thinking. Strikes hard and often.",
    color: "text-red-500",
    icon: "wolf",
    difficulty: 1
  },
  [ArchetypeID.WALL]: {
    id: ArchetypeID.WALL,
    name: "The Wall",
    title: "Avatar of Fear",
    description: "Hides behind defenses. Waits for you to tire.",
    color: "text-amber-500",
    icon: "shield",
    difficulty: 2
  },
  [ArchetypeID.OBSERVER]: {
    id: ArchetypeID.OBSERVER,
    name: "The Observer",
    title: "Avatar of Judgment",
    description: "Watches your patterns. Strikes when you are weak.",
    color: "text-cyan-500",
    icon: "eye",
    difficulty: 3
  },
  [ArchetypeID.GAMBLER]: {
    id: ArchetypeID.GAMBLER,
    name: "The Gambler",
    title: "Avatar of Chaos",
    description: "Relies on luck. Dangerous and unpredictable.",
    color: "text-purple-500",
    icon: "dice",
    difficulty: 3
  },
  [ArchetypeID.TRICKSTER]: {
    id: ArchetypeID.TRICKSTER,
    name: "The Trickster",
    title: "Avatar of Deceit",
    description: "Uses your expectations against you.",
    color: "text-emerald-500",
    icon: "mask",
    difficulty: 4
  },
  [ArchetypeID.MIRROR]: {
    id: ArchetypeID.MIRROR,
    name: "The Mirror",
    title: "Your Shadow Self",
    description: "Knows everything you know.",
    color: "text-stone-100",
    icon: "mirror",
    difficulty: 5
  }
};

export const MOVES_CONFIG = {
  [MoveType.STRIKE]: { name: 'Strike', color: 'bg-red-900 border-red-500 text-red-100', icon: Sword, cost: WILL_COSTS[MoveType.STRIKE] },
  [MoveType.SHIELD]: { name: 'Shield', color: 'bg-amber-900 border-amber-500 text-amber-100', icon: Shield, cost: WILL_COSTS[MoveType.SHIELD] },
  [MoveType.OBSERVE]: { name: 'Observe', color: 'bg-cyan-900 border-cyan-500 text-cyan-100', icon: Eye, cost: 0 },
  [MoveType.GAMBLE]: { name: 'Gamble', color: 'bg-purple-900 border-purple-500 text-purple-100', icon: Dices, cost: WILL_COSTS[MoveType.GAMBLE] },
};
