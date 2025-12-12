
import { ArchetypeID, MoveType, TurnResult } from '../types';
import { 
  DMG_STRIKE, 
  DMG_GAMBLE_SUCCESS, 
  DMG_GAMBLE_FAIL_SELF, 
  HEAL_OBSERVE,
  WILL_COSTS,
  WILL_REGEN,
  MAX_WILL,
  DMG_EXHAUSTION
} from '../constants';

export const resolveTurn = (
  playerMove: MoveType,
  aiMove: MoveType,
  playerFocused: boolean,
  aiFocused: boolean,
  playerWill: number,
  aiWill: number
): Omit<TurnResult, 'round'> & { nextPlayerWill: number, nextAiWill: number } => {
  let playerDmg = 0;
  let aiDmg = 0;
  let narrative = "";
  let isCritical = false;
  let isGambleSuccess = false;
  let playerExhausted = false;
  let aiExhausted = false;

  // 1. Calculate Willpower Costs & Burnout
  const playerCost = WILL_COSTS[playerMove];
  const aiCost = WILL_COSTS[aiMove];

  let effectivePlayerMove = playerMove;
  let effectiveAiMove = aiMove;

  // Check Player Exhaustion
  let nextPlayerWill = playerWill;
  if (playerMove !== MoveType.OBSERVE && playerWill < playerCost) {
    playerExhausted = true;
    effectivePlayerMove = MoveType.NONE;
    playerDmg += DMG_EXHAUSTION; // Burnout penalty
    narrative += `You try to act, but your mind is empty! BURN OUT (-${DMG_EXHAUSTION} HP). `;
  } else {
    // Pay cost or Regen
    if (playerMove === MoveType.OBSERVE) {
      nextPlayerWill = Math.min(MAX_WILL, playerWill + WILL_REGEN);
    } else {
      nextPlayerWill -= playerCost;
    }
  }

  // Check AI Exhaustion
  let nextAiWill = aiWill;
  if (aiMove !== MoveType.OBSERVE && aiWill < aiCost) {
    aiExhausted = true;
    effectiveAiMove = MoveType.NONE;
    aiDmg += DMG_EXHAUSTION;
    narrative += `Opponent stumbles, mentally exhausted (-${DMG_EXHAUSTION} HP)! `;
  } else {
    if (aiMove === MoveType.OBSERVE) {
      nextAiWill = Math.min(MAX_WILL, aiWill + WILL_REGEN);
    } else {
      nextAiWill -= aiCost;
    }
  }

  // Modifiers
  const playerDmgMod = playerFocused ? 1.5 : 1.0;
  const aiDmgMod = aiFocused ? 1.5 : 1.0;

  // 2. Resolve Interactions (Using Effective Moves)
  
  // PLAYER ACTION
  if (effectivePlayerMove === MoveType.STRIKE) {
    if (effectiveAiMove === MoveType.SHIELD) {
      narrative += "Your Strike was blocked by The Wall. ";
    } else {
      let dmg = Math.floor(DMG_STRIKE * playerDmgMod);
      if (playerFocused) {
        dmg = 25; // Critical fixed
        isCritical = true;
        narrative += "Focused Strike! ";
      }
      aiDmg += dmg;
      narrative += `You struck for ${dmg} damage. `;
    }
  } else if (effectivePlayerMove === MoveType.GAMBLE) {
    // GAMBLE VS SHIELD INTERACTION
    if (effectiveAiMove === MoveType.SHIELD) {
      // Shield reflects Gamble -> Self Damage
      playerDmg += DMG_GAMBLE_FAIL_SELF;
      narrative += `Your Gamble CRASHED into their Shield! The chaos deflects (-${DMG_GAMBLE_FAIL_SELF} HP). `;
    } else {
      const success = Math.random() > 0.5 || playerFocused;
      if (success) {
        isGambleSuccess = true;
        aiDmg += DMG_GAMBLE_SUCCESS;
        narrative += `Jackpot! Massive hit for ${DMG_GAMBLE_SUCCESS} damage. `;
      } else {
        playerDmg += DMG_GAMBLE_FAIL_SELF;
        narrative += `Gamble backfired! You hurt yourself (-${DMG_GAMBLE_FAIL_SELF} HP). `;
      }
    }
  } else if (effectivePlayerMove === MoveType.OBSERVE) {
    playerDmg -= HEAL_OBSERVE;
    narrative += `You observe and recover (+${HEAL_OBSERVE} HP, +${WILL_REGEN} Will). `;
  }

  // AI ACTION
  if (effectiveAiMove === MoveType.STRIKE) {
    if (effectivePlayerMove === MoveType.SHIELD) {
      narrative += "You blocked the incoming attack.";
    } else {
      let dmg = Math.floor(DMG_STRIKE * aiDmgMod);
      playerDmg += dmg;
      narrative += ` Opponent struck you for ${dmg} damage.`;
    }
  } else if (effectiveAiMove === MoveType.GAMBLE) {
    // GAMBLE VS SHIELD INTERACTION (AI)
    if (effectivePlayerMove === MoveType.SHIELD) {
      aiDmg += DMG_GAMBLE_FAIL_SELF;
      narrative += ` You shielded against their gamble! They take recoil (-${DMG_GAMBLE_FAIL_SELF} HP).`;
    } else {
      const success = Math.random() > 0.5 || aiFocused;
      if (success) {
        if (effectivePlayerMove === MoveType.OBSERVE) {
           playerDmg += DMG_GAMBLE_SUCCESS;
           narrative += ` Opponent landed a chaotic critical for ${DMG_GAMBLE_SUCCESS} damage!`;
        } else {
           // If user struck, they trade damage usually, but gamble hits harder
           playerDmg += DMG_GAMBLE_SUCCESS;
           narrative += ` Opponent landed a chaotic critical for ${DMG_GAMBLE_SUCCESS} damage!`;
        }
      } else {
        aiDmg += DMG_GAMBLE_FAIL_SELF;
        narrative += " Opponent's gamble backfired.";
      }
    }
  } else if (effectiveAiMove === MoveType.OBSERVE) {
    aiDmg -= HEAL_OBSERVE;
    narrative += ` Opponent is watching closely (+${HEAL_OBSERVE} HP).`;
  } else if (effectiveAiMove === MoveType.SHIELD) {
    if (effectivePlayerMove === MoveType.SHIELD || effectivePlayerMove === MoveType.OBSERVE) {
       narrative += " Opponent raised a shield.";
    }
  }

  // Cap heals correctly using constants
  if (playerDmg < -HEAL_OBSERVE) playerDmg = -HEAL_OBSERVE;
  if (aiDmg < -HEAL_OBSERVE) aiDmg = -HEAL_OBSERVE;

  return {
    playerMove: effectivePlayerMove,
    aiMove: effectiveAiMove,
    playerDamageTaken: playerDmg,
    aiDamageTaken: aiDmg,
    narrative,
    isCritical,
    isGambleSuccess,
    playerExhausted,
    aiExhausted,
    nextPlayerWill,
    nextAiWill
  };
};

export const getAIMove = (
  archetype: ArchetypeID, 
  playerHistory: MoveType[], 
  aiHistory: MoveType[],
  aiWill: number,
  playerWill: number
): MoveType => {
  const rand = Math.random();

  // 1. RESOURCE CHECK (Complex Computation Layer)
  // Determine affordable moves
  const canStrike = aiWill >= WILL_COSTS[MoveType.STRIKE];
  const canShield = aiWill >= WILL_COSTS[MoveType.SHIELD];
  const canGamble = aiWill >= WILL_COSTS[MoveType.GAMBLE];

  // If critically low on Will, forced to Observe
  if (!canStrike && !canShield) return MoveType.OBSERVE;

  // 2. OPPORTUNISTIC LOGIC (Check Player Vulnerability)
  const playerLowWill = playerWill < WILL_COSTS[MoveType.SHIELD]; // Player can't block?
  const playerVeryLowWill = playerWill < WILL_COSTS[MoveType.STRIKE]; // Player can't even strike?

  // 3. ARCHETYPE LOGIC
  switch (archetype) {
    case ArchetypeID.IMPULSE:
      // Aggressive, often ignores own low will until too late
      if (playerLowWill && canStrike) return MoveType.STRIKE; // Blood in the water
      if (rand < 0.7 && canStrike) return MoveType.STRIKE;
      if (rand < 0.9 && canGamble) return MoveType.GAMBLE;
      return canShield ? MoveType.SHIELD : MoveType.OBSERVE;

    case ArchetypeID.WALL:
      // Nerfed: If last move was Shield, low chance to shield again
      const lastAiMove = aiHistory[aiHistory.length - 1];
      const shieldPenalty = lastAiMove === MoveType.SHIELD ? 0.3 : 0;
      
      // If low will, Wall prioritizes Observe heavily to keep Shield up
      if (aiWill < 40) return MoveType.OBSERVE;

      if (rand < (0.5 - shieldPenalty) && canShield) return MoveType.SHIELD;
      if (rand < 0.8) return MoveType.OBSERVE;
      return canStrike ? MoveType.STRIKE : MoveType.OBSERVE;

    case ArchetypeID.GAMBLER:
      if (rand < 0.5 && canGamble) return MoveType.GAMBLE;
      if (rand < 0.8 && canStrike) return MoveType.STRIKE;
      return MoveType.OBSERVE;

    case ArchetypeID.OBSERVER:
      // Smart: If player is low will, Punish hard.
      if (playerVeryLowWill && canStrike) return MoveType.STRIKE; 
      
      const lastMove = aiHistory[aiHistory.length - 1];
      if (lastMove === MoveType.OBSERVE && canStrike) return MoveType.STRIKE; // Combo
      if (rand < 0.4) return MoveType.OBSERVE;
      if (rand < 0.7 && canShield) return MoveType.SHIELD;
      return canStrike ? MoveType.STRIKE : MoveType.OBSERVE;

    case ArchetypeID.MIRROR:
      // Smartest: Manages Will efficiently
      if (aiWill < 30) return MoveType.OBSERVE; // Never burn out
      
      const strikeCount = playerHistory.filter(m => m === MoveType.STRIKE).length;
      
      // If player strikes often -> Shield (if affordable)
      if (strikeCount > playerHistory.length * 0.5 && canShield) return MoveType.SHIELD;
      
      // Default to computed counters
      if (rand < 0.6 && canStrike) return MoveType.STRIKE;
      return canGamble ? MoveType.GAMBLE : MoveType.OBSERVE;

    default:
      return canStrike ? MoveType.STRIKE : MoveType.OBSERVE;
  }
};

export const generateInsight = (stats: {
  strikes: number;
  shields: number;
  gambles: number;
  observes: number;
  total: number;
  win: boolean;
}): { title: string; text: string } => {
  const { strikes, shields, gambles, observes, total, win } = stats;

  if (total === 0) return { title: "The Void", text: "You did nothing. The void stares back." };

  const sPct = strikes / total;
  const dPct = shields / total;
  const gPct = gambles / total;
  const oPct = observes / total;

  if (dPct > 0.5) {
    return {
      title: "The Fortress",
      text: "You build walls to keep pain out, but they also keep victory locked away. What are you protecting so desperately?"
    };
  }
  
  if (gPct > 0.4) {
    return {
      title: "The Fatalist",
      text: "You surrender control to chance. Deep down, do you believe you deserve to lose? Or do you just fear responsibility?"
    };
  }

  if (sPct > 0.6) {
    return {
      title: "The Hammer",
      text: "Aggression is your only language. You mistake force for strength. True power requires stillness."
    };
  }

  if (oPct > 0.4) {
    return {
      title: "The Spectator",
      text: "You watch life happen rather than shaping it. Insight without action is merely a dream."
    };
  }

  if (win) {
    return {
      title: "The Victor",
      text: "Balance was achieved. You adapted. You overcame. But do not let confidence become arrogance."
    };
  }

  return {
    title: "The Learner",
    text: "Defeat is not the end. It is the only true teacher. Listen to what your failure is whispering."
  };
};

export const getAIEmote = (archetype: ArchetypeID, result: TurnResult): string | null => {
  if (result.aiDamageTaken >= 20) return 'angry';
  if (result.playerDamageTaken >= 20) return 'taunt';
  if (result.isCritical) return 'shocked';
  if (result.isGambleSuccess) {
      if (result.aiMove === MoveType.GAMBLE) return 'happy';
      return 'shocked';
  }
  if (result.aiMove === MoveType.SHIELD && result.playerDamageTaken === 0 && result.playerMove === MoveType.STRIKE) {
    return 'taunt';
  }
  return null;
};
