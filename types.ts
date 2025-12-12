
export enum MoveType {
  STRIKE = 'STRIKE',
  SHIELD = 'SHIELD',
  OBSERVE = 'OBSERVE',
  GAMBLE = 'GAMBLE',
  NONE = 'NONE' // Used for timeout
}

export enum ArchetypeID {
  IMPULSE = 'IMPULSE',
  WALL = 'WALL',
  OBSERVER = 'OBSERVER',
  GAMBLER = 'GAMBLER',
  TRICKSTER = 'TRICKSTER',
  MIRROR = 'MIRROR'
}

export enum EmoteType {
  HAPPY = 'HAPPY',
  ANGRY = 'ANGRY',
  SHOCKED = 'SHOCKED',
  THINKING = 'THINKING',
  TAUNT = 'TAUNT',
  SAD = 'SAD'
}

export enum GameMode {
  SINGLE = 'SINGLE',
  LOCAL = 'LOCAL',
  ONLINE = 'ONLINE'
}

export interface EmoteConfig {
  id: string;
  icon: string;
  label: string;
  type: EmoteType;
}

export interface MatchLog {
  id: string;
  timestamp: number;
  opponentId: ArchetypeID;
  result: 'WIN' | 'LOSS';
  score: string;
  stats: {
    strikes: number;
    shields: number;
    gambles: number;
    observes: number;
  };
}

export interface PlayerStats {
  xp: number;
  level: number;
  matchesPlayed: number;
  matchesWon: number;
  archetypesDefeated: ArchetypeID[];
  moveHistory: MoveType[]; // For the Mirror AI
  matchLogs: MatchLog[];
}

export interface TurnResult {
  playerMove: MoveType;
  aiMove: MoveType;
  playerDamageTaken: number;
  aiDamageTaken: number;
  narrative: string;
  round: number; // Track which round this turn belongs to
  isCritical?: boolean;
  isGambleSuccess?: boolean;
  playerExhausted?: boolean;
  aiExhausted?: boolean;
}

export interface ActiveEmote {
  id: string;
  timestamp: number;
  // No type property needed here as it's just tracking the active instance
}

export interface GameState {
  mode: GameMode;
  turnPlayer: 'P1' | 'P2'; // For Multiplayer Input
  pendingP1Move: MoveType | null; // Store P1 move during P2 turn
  playerHP: number;
  aiHP: number;
  playerWill: number; // New Resource
  aiWill: number;     // New Resource
  playerWins: number;
  aiWins: number;
  currentRound: number;
  history: TurnResult[];
  lastResult: TurnResult | null;
  pendingResult: TurnResult | null; // For Card Reveal animation
  phase: 'START' | 'PLAYER_INPUT' | 'INTERMISSION' | 'RESOLVING' | 'ROUND_OVER' | 'MATCH_OVER';
  playerFocused: boolean; // Effect of Observe
  aiFocused: boolean;
  lastRoundResult: 'VICTORY' | 'DEFEAT' | null;
  activePlayerEmote?: ActiveEmote | null;
  activeAIEmote?: ActiveEmote | null;
}

export interface ArchetypeConfig {
  id: ArchetypeID;
  name: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  difficulty: number; // 1-5
}

export interface AppSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
}
