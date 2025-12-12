import React, { useState, useEffect, useRef } from 'react';
import { Peer, DataConnection } from 'peerjs';
import {
  MoveType,
  ArchetypeID,
  GameState,
  TurnResult,
  PlayerStats,
  MatchLog,
  EmoteType,
  EmoteConfig,
  AppSettings,
  GameMode
} from './types';
import {
  MAX_HP,
  WIN_ROUNDS,
  TURN_TIMER,
  ARCHETYPES,
  MOVES_CONFIG,
  MAX_WILL,
  START_WILL,
  WILL_COSTS,
  DMG_STRIKE,
  DMG_GAMBLE_SUCCESS,
  DMG_GAMBLE_FAIL_SELF,
  HEAL_OBSERVE,
  DMG_EXHAUSTION,
  WILL_REGEN,
  EMOTES,
  EMOTE_DURATION
} from './constants';
import { resolveTurn, getAIMove, generateInsight, getAIEmote } from './services/engine';
import { getPsychologicalProfile } from './services/ai';
import {
  Sword,
  Shield,
  Eye,
  Dices,
  Brain,
  RefreshCw,
  Lock,
  History,
  Play,
  Zap,
  HelpCircle,
  X,
  LogOut,
  ArrowLeft,
  ChevronRight,
  Scroll,
  MessageCircle,
  Smile,
  Users,
  Settings,
  User,
  Clock,
  Volume2,
  VolumeX,
  Vibrate,
  Monitor,
  Trash2,
  Check,
  AlertTriangle,
  Loader2,
  Smartphone,
  Globe,
  Copy,
  Wifi,
  WifiOff
} from 'lucide-react';

// --- Sub Components ---

const ProgressBar = ({ current, max, color = "bg-stone-200", height = "h-3" }: { current: number, max: number, color?: string, height?: string }) => {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className={`w-full ${height} bg-stone-900 rounded-full overflow-hidden border border-stone-800`}>
      <div
        className={`h-full transition-all duration-500 ease-out ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

const MoveCard = ({ move, isPlayer, hidden = false }: { move: MoveType, isPlayer: boolean, hidden?: boolean }) => {
  const cfg = MOVES_CONFIG[move];
  if (!cfg && !hidden) return null;

  if (hidden) {
    return (
      <div className="w-32 h-48 bg-stone-900 border-2 border-stone-800 rounded-lg flex items-center justify-center animate-pulse">
        <div className="w-12 h-12 rounded-full border border-stone-700 opacity-20"></div>
      </div>
    );
  }

  const Icon = cfg.icon;

  return (
    <div className={`w-32 h-48 rounded-lg flex flex-col items-center justify-center space-y-4 border-2 shadow-2xl animate-fade-in
      ${isPlayer ? 'bg-stone-900 border-stone-600' : 'bg-stone-950 border-stone-800'}
    `}>
      <div className={`p-4 rounded-full ${cfg.color.split(' ')[0]} bg-opacity-20`}>
        <Icon size={40} className={cfg.color.split(' ')[2]} />
      </div>
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-stone-500">{isPlayer ? "You Played" : "Opponent"}</p>
        <h3 className={`font-bold text-lg ${cfg.color.split(' ')[2]}`}>{cfg.name}</h3>
      </div>
    </div>
  );
};

const HistoryLog = ({ history, title }: { history: TurnResult[], title?: string }) => {
  if (history.length === 0) return null;

  return (
    <div className="w-full bg-stone-900/50 rounded-lg border border-stone-800 p-4 max-h-60 overflow-y-auto">
      {title && <h4 className="text-stone-500 text-xs uppercase tracking-widest mb-3 border-b border-stone-800 pb-2">{title}</h4>}
      <div className="space-y-2">
        {history.map((turn, i) => {
          const PIcon = MOVES_CONFIG[turn.playerMove]?.icon || HelpCircle;
          const AIcon = MOVES_CONFIG[turn.aiMove]?.icon || HelpCircle;

          return (
            <div key={i} className="flex items-center justify-between text-xs bg-stone-950/50 p-2 rounded">
              <div className="flex items-center space-x-2 w-1/3">
                <PIcon size={14} className={MOVES_CONFIG[turn.playerMove]?.color.split(' ')[2] || 'text-stone-500'} />
                <span className="text-stone-400">{MOVES_CONFIG[turn.playerMove]?.name}</span>
              </div>

              <div className="text-stone-600">vs</div>

              <div className="flex items-center justify-end space-x-2 w-1/3">
                <span className="text-stone-400">{MOVES_CONFIG[turn.aiMove]?.name}</span>
                <AIcon size={14} className={MOVES_CONFIG[turn.aiMove]?.color.split(' ')[2] || 'text-stone-500'} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const EmoteBubble = ({ emoteId, isPlayer }: { emoteId: string, isPlayer: boolean }) => {
  const config = EMOTES.find(e => e.id === emoteId);
  if (!config) return null;

  return (
    <div className={`absolute z-20 animate-fade-in top-0 ${isPlayer ? '-right-4 transform translate-x-full' : '-left-4 transform -translate-x-full'}`}>
      <div className={`bg-stone-100 text-stone-900 px-3 py-2 rounded-xl shadow-lg border border-stone-300 flex items-center space-x-2 whitespace-nowrap`}>
        <span className="text-lg">{config.icon}</span>
        <span className="text-xs font-bold uppercase tracking-wide">{config.label}</span>
      </div>
      {/* Triangle pointer */}
      <div className={`absolute top-1/2 -mt-1 w-2 h-2 bg-stone-100 rotate-45 transform 
        ${isPlayer ? '-left-1' : '-right-1'}
      `}></div>
    </div>
  );
};

interface ModalProps {
  children?: React.ReactNode;
  title?: string;
}

const Modal = ({ children, title }: ModalProps) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-6 animate-fade-in">
    <div className="w-full max-w-sm bg-stone-900 border border-stone-700 rounded-xl shadow-2xl p-6 relative flex flex-col space-y-4">
      {title && <h3 className="text-2xl font-bold text-stone-100 text-center sacred-text">{title}</h3>}
      {children}
    </div>
  </div>
);


// --- Main App ---

export default function App() {
  // Global State
  const [view, setView] = useState<'LANDING' | 'MENU' | 'GAME' | 'INSIGHT' | 'UNLOCKS' | 'RULES' | 'HISTORY' | 'SETTINGS' | 'ONLINE_LOBBY'>('LANDING');
  const [stats, setStats] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem('mirror_stats');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration: Ensure matchLogs exists
      if (!parsed.matchLogs) parsed.matchLogs = [];
      return parsed;
    }
    return {
      xp: 0,
      level: 1,
      matchesPlayed: 0,
      matchesWon: 0,
      archetypesDefeated: [],
      moveHistory: [],
      matchLogs: []
    };
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('mirror_settings');
    return saved ? JSON.parse(saved) : { soundEnabled: true, hapticsEnabled: true, reducedMotion: false };
  });

  // Save persistence
  useEffect(() => {
    localStorage.setItem('mirror_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('mirror_settings', JSON.stringify(settings));
  }, [settings]);

  // Online State
  const [peer, setPeer] = useState<Peer | null>(null);
  const [conn, setConn] = useState<DataConnection | null>(null);
  const [peerId, setPeerId] = useState<string>('');
  const [joinId, setJoinId] = useState<string>('');
  const [connStatus, setConnStatus] = useState<'IDLE' | 'HOSTING' | 'CONNECTING' | 'CONNECTED' | 'ERROR'>('IDLE');
  const [connError, setConnError] = useState<string>(''); // Detailed error message
  const [copyFeedback, setCopyFeedback] = useState(false);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Track specific moves for Online Resolution (since pendingP1Move is for local)
  const [onlineMoves, setOnlineMoves] = useState<{ me: MoveType | null, opp: MoveType | null }>({ me: null, opp: null });

  // Game State
  const [selectedOpponent, setSelectedOpponent] = useState<ArchetypeID>(ArchetypeID.IMPULSE);
  const [game, setGame] = useState<GameState>({
    mode: GameMode.SINGLE,
    turnPlayer: 'P1',
    pendingP1Move: null,
    playerHP: MAX_HP,
    aiHP: MAX_HP,
    playerWill: START_WILL,
    aiWill: START_WILL,
    playerWins: 0,
    aiWins: 0,
    currentRound: 1,
    history: [],
    lastResult: null,
    pendingResult: null,
    phase: 'START',
    playerFocused: false,
    aiFocused: false,
    lastRoundResult: null,
    activePlayerEmote: null,
    activeAIEmote: null
  });

  // AI Insight State
  const [aiInsight, setAiInsight] = useState<{ loading: boolean; data: { title: string; text: string } | null }>({
    loading: false,
    data: null
  });

  const [timeLeft, setTimeLeft] = useState(TURN_TIMER);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // --- Logic ---

  const triggerHaptic = () => {
    if (settings.hapticsEnabled && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  // PeerJS Cleanup & Heartbeat
  useEffect(() => {
    return () => {
      if (peer) peer.destroy();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    }
  }, []);

  const startHeartbeat = (c: DataConnection) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      if (c.open) {
        c.send({ type: 'PING' });
      } else {
        // If not open, maybe check status or try to reconnect?
      }
    }, 3000);
  };

  const hostGame = () => {
    triggerHaptic();
    setConnStatus('HOSTING');
    setConnError('');

    // Clean up old peer if exists
    if (peer) peer.destroy();

    const p = new Peer();
    setPeer(p);

    p.on('open', (id) => {
      setPeerId(id);
      console.log('Host Peer ID:', id);
    });

    p.on('connection', (c) => {
      console.log('Incoming connection...');
      setConn(c);

      c.on('open', () => {
        console.log('Connection fully open');
        setConnStatus('CONNECTED');
        setupConnection(c);
        startHeartbeat(c);
        startOnlineGame();
      });

      c.on('error', (err) => {
        console.error('Connection error:', err);
        setConnStatus('ERROR');
        setConnError('Connection lost. Opponent disconnected.');
      });

      c.on('close', () => {
        setConnStatus('ERROR');
        setConnError('Opponent disconnected.');
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      });
    });

    p.on('error', (err) => {
      console.error('Host Peer Error:', err);
      setConnStatus('ERROR');
      setConnError(`Network Error: ${err.type}`);
    });
  };

  const joinGame = () => {
    triggerHaptic();
    if (!joinId) return;
    setConnStatus('CONNECTING');
    setConnError('');

    // Clean up old peer if exists
    if (peer) peer.destroy();

    const p = new Peer();
    setPeer(p);

    p.on('open', (id) => {
      setPeerId(id);
      console.log('Joiner Peer Open. Connecting to:', joinId);

      const c = p.connect(joinId, { reliable: true });

      c.on('open', () => {
        console.log('Connected to host!');
        setConn(c);
        setConnStatus('CONNECTED');
        setupConnection(c);
        startHeartbeat(c);
        startOnlineGame();
      });

      c.on('error', (err) => {
        console.error('DataConnection Error:', err);
        setConnStatus('ERROR');
        setConnError('Failed to connect to host.');
      });

      c.on('close', () => {
        setConnStatus('ERROR');
        setConnError('Disconnected from host.');
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      });

      // Timeout handler for connection hang
      setTimeout(() => {
        setConnStatus((prev) => {
          if (prev === 'CONNECTING') {
            setConnError('Connection timed out. Check ID and try again.');
            return 'ERROR';
          }
          return prev;
        });
      }, 10000);
    });

    p.on('error', (err) => {
      console.error('Peer Error:', err);
      setConnStatus('ERROR');
      setConnError(`Network Error: ${err.type}`);
    });
  };

  const setupConnection = (c: DataConnection) => {
    c.on('data', (data: any) => {
      // console.log('Received data:', data); // Verbose
      if (data.type === 'MOVE') {
        handleOnlineOpponentMove(data.move);
      } else if (data.type === 'EMOTE') {
        triggerAIEmote(data.emoteId);
      } else if (data.type === 'PING') {
        // Heartbeat received, connection is alive
      }
    });
  };

  const handleCopyId = () => {
    if (!peerId) return;
    navigator.clipboard.writeText(peerId);
    triggerHaptic();
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const startGame = (archetype: ArchetypeID) => {
    triggerHaptic();
    setSelectedOpponent(archetype);
    setGame({
      mode: GameMode.SINGLE,
      turnPlayer: 'P1',
      pendingP1Move: null,
      playerHP: MAX_HP,
      aiHP: MAX_HP,
      playerWill: START_WILL,
      aiWill: START_WILL,
      playerWins: 0,
      aiWins: 0,
      currentRound: 1,
      history: [],
      lastResult: null,
      pendingResult: null,
      phase: 'PLAYER_INPUT',
      playerFocused: false,
      aiFocused: false,
      lastRoundResult: null,
      activePlayerEmote: null,
      activeAIEmote: null
    });
    setTimeLeft(TURN_TIMER);
    setView('GAME');
  };

  const startLocalGame = () => {
    triggerHaptic();
    setSelectedOpponent(ArchetypeID.MIRROR);
    setGame({
      mode: GameMode.LOCAL,
      turnPlayer: 'P1',
      pendingP1Move: null,
      playerHP: MAX_HP,
      aiHP: MAX_HP,
      playerWill: START_WILL,
      aiWill: START_WILL,
      playerWins: 0,
      aiWins: 0,
      currentRound: 1,
      history: [],
      lastResult: null,
      pendingResult: null,
      phase: 'PLAYER_INPUT',
      playerFocused: false,
      aiFocused: false,
      lastRoundResult: null,
      activePlayerEmote: null,
      activeAIEmote: null
    });
    setView('GAME');
  };

  const startOnlineGame = () => {
    setSelectedOpponent(ArchetypeID.MIRROR); // Use Mirror visual for unknown human
    setOnlineMoves({ me: null, opp: null }); // Reset moves
    setGame({
      mode: GameMode.ONLINE,
      turnPlayer: 'P1',
      pendingP1Move: null,
      playerHP: MAX_HP,
      aiHP: MAX_HP,
      playerWill: START_WILL,
      aiWill: START_WILL,
      playerWins: 0,
      aiWins: 0,
      currentRound: 1,
      history: [],
      lastResult: null,
      pendingResult: null,
      phase: 'PLAYER_INPUT',
      playerFocused: false,
      aiFocused: false,
      lastRoundResult: null,
      activePlayerEmote: null,
      activeAIEmote: null
    });
    setView('GAME');
  };

  const abandonGame = () => {
    triggerHaptic();
    if (timerRef.current) clearInterval(timerRef.current);
    if (conn) { conn.close(); setConn(null); }
    if (peer) { peer.destroy(); setPeer(null); }
    setConnStatus('IDLE');
    setView('MENU');
  };

  const resetProgress = () => {
    triggerHaptic();
    setStats({
      xp: 0,
      level: 1,
      matchesPlayed: 0,
      matchesWon: 0,
      archetypesDefeated: [],
      moveHistory: [],
      matchLogs: []
    });
    localStorage.removeItem('mirror_stats');
    setConfirmReset(false);
  };

  const handlePlayerEmote = (emoteId: string) => {
    triggerHaptic();

    // Show locally
    setGame(prev => ({
      ...prev,
      activePlayerEmote: { id: emoteId, timestamp: Date.now() }
    }));

    // Send to peer if online
    if (game.mode === GameMode.ONLINE && conn) {
      conn.send({ type: 'EMOTE', emoteId });
    }

    setShowEmotePicker(false);

    setTimeout(() => {
      setGame(prev => {
        if (prev.activePlayerEmote?.id === emoteId && Date.now() - prev.activePlayerEmote.timestamp >= EMOTE_DURATION - 100) {
          return { ...prev, activePlayerEmote: null };
        }
        return prev;
      });
    }, EMOTE_DURATION);
  };

  const triggerAIEmote = (emoteId: string) => {
    setGame(prev => ({
      ...prev,
      activeAIEmote: { id: emoteId, timestamp: Date.now() }
    }));

    setTimeout(() => {
      setGame(prev => {
        if (prev.activeAIEmote?.id === emoteId && Date.now() - prev.activeAIEmote.timestamp >= EMOTE_DURATION - 100) {
          return { ...prev, activeAIEmote: null };
        }
        return prev;
      });
    }, EMOTE_DURATION);
  };

  const handleOnlineOpponentMove = (move: MoveType) => {
    setOnlineMoves(prev => {
      const newState = { ...prev, opp: move };
      // If we have both moves now, resolve
      if (newState.me && newState.opp) {
        resolveOnlineTurn(newState.me, newState.opp);
      }
      return newState;
    });
  };

  const handleMove = (move: MoveType) => {
    if (game.phase !== 'PLAYER_INPUT') return;
    triggerHaptic();

    // -- ONLINE LOGIC --
    if (game.mode === GameMode.ONLINE) {
      if (onlineMoves.me) return; // Already moved

      // 1. Send Move
      if (conn) conn.send({ type: 'MOVE', move });

      // 2. Update Local State
      setOnlineMoves(prev => {
        const newState = { ...prev, me: move };
        // If we have both (Opponent moved first), resolve
        if (newState.me && newState.opp) {
          // We need to defer this slightly so the UI updates to "Waiting" state first if needed? 
          // Actually, if we have both, we go straight to resolving.
          // Call resolve outside set state to avoid side-effects in reducer
          setTimeout(() => resolveOnlineTurn(newState.me!, newState.opp!), 100);
        }
        return newState;
      });
      return;
    }

    // -- LOCAL MULTIPLAYER LOGIC --
    if (game.mode === GameMode.LOCAL) {
      if (game.turnPlayer === 'P1') {
        setGame(prev => ({
          ...prev,
          pendingP1Move: move,
          turnPlayer: 'P2',
          phase: 'INTERMISSION'
        }));
        return;
      }
      // P2 Move -> Resolve below
    }

    // -- RESOLUTION LOGIC --
    if (timerRef.current) clearInterval(timerRef.current);

    let aiMove = MoveType.NONE;
    let playerMove = move;

    if (game.mode === GameMode.SINGLE) {
      aiMove = getAIMove(
        selectedOpponent,
        [...stats.moveHistory, ...game.history.map(h => h.playerMove)],
        game.history.map(h => h.aiMove),
        game.aiWill,
        game.playerWill
      );
    } else {
      // LOCAL: P2 is the "AI" slot
      playerMove = game.pendingP1Move!;
      aiMove = move;
    }

    performResolution(playerMove, aiMove);
  };

  const resolveOnlineTurn = (pMove: MoveType, oMove: MoveType) => {
    // Both clients run this with the same inputs
    performResolution(pMove, oMove);
    // Reset online moves for next round *after* resolution animation starts
    setOnlineMoves({ me: null, opp: null });
  };

  const performResolution = (playerMove: MoveType, aiMove: MoveType) => {
    const resultRaw = resolveTurn(
      playerMove,
      aiMove,
      game.playerFocused,
      game.aiFocused,
      game.playerWill,
      game.aiWill
    );

    const result = { ...resultRaw, round: game.currentRound };

    setGame(prev => ({
      ...prev,
      phase: 'RESOLVING',
      pendingResult: result
    }));

    setTimeout(() => {
      setGame(prev => {
        const newPlayerHP = prev.playerHP - result.playerDamageTaken;
        const newAiHP = prev.aiHP - result.aiDamageTaken;

        let newPlayerWins = prev.playerWins;
        let newAiWins = prev.aiWins;
        let nextRound = prev.currentRound;
        let nextPhase: GameState['phase'] = 'PLAYER_INPUT';
        let resetHP = false;
        let roundResult: 'VICTORY' | 'DEFEAT' | null = null;

        if (newPlayerHP <= 0 || newAiHP <= 0) {
          if (newPlayerHP > newAiHP) {
            newPlayerWins++;
            roundResult = 'VICTORY';
          } else {
            newAiWins++;
            roundResult = 'DEFEAT';
          }

          if (newPlayerWins >= WIN_ROUNDS || newAiWins >= WIN_ROUNDS) {
            nextPhase = 'MATCH_OVER';
          } else {
            nextPhase = 'ROUND_OVER';
            nextRound++;
            resetHP = true;
          }
        }

        const nextPlayerFocused = result.playerMove === MoveType.OBSERVE;
        const nextAiFocused = result.aiMove === MoveType.OBSERVE;

        return {
          ...prev,
          playerHP: resetHP ? MAX_HP : Math.min(MAX_HP, newPlayerHP),
          aiHP: resetHP ? MAX_HP : Math.min(MAX_HP, newAiHP),
          playerWill: resetHP ? START_WILL : result.nextPlayerWill,
          aiWill: resetHP ? START_WILL : result.nextAiWill,
          playerWins: newPlayerWins,
          aiWins: newAiWins,
          currentRound: nextRound,
          history: [...prev.history, result],
          lastResult: result,
          pendingResult: null,
          phase: nextPhase,
          playerFocused: nextPlayerFocused,
          aiFocused: nextAiFocused,
          lastRoundResult: roundResult,
          turnPlayer: 'P1',
          pendingP1Move: null
        };
      });

      if (game.mode === GameMode.SINGLE) {
        const aiEmoteId = getAIEmote(selectedOpponent, result);
        if (aiEmoteId) {
          setTimeout(() => triggerAIEmote(aiEmoteId), 500);
        }
        setTimeLeft(TURN_TIMER);
      }
    }, 2500);
  };

  const handleTimeout = () => {
    if (game.mode === GameMode.LOCAL || game.mode === GameMode.ONLINE) return;
    handleMove(MoveType.OBSERVE);
  };

  // Timer Effect
  useEffect(() => {
    if (view === 'GAME' && game.phase === 'PLAYER_INPUT' && game.mode === GameMode.SINGLE) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeout();
            return TURN_TIMER;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, game.phase]);

  const finishMatch = () => {
    triggerHaptic();

    if (game.mode === GameMode.LOCAL || game.mode === GameMode.ONLINE) {
      if (conn) { conn.close(); setConn(null); }
      if (peer) { peer.destroy(); setPeer(null); }
      setConnStatus('IDLE');
      setView('MENU');
      return;
    }

    const isWin = game.playerWins >= WIN_ROUNDS;

    const strikes = game.history.filter(h => h.playerMove === MoveType.STRIKE).length;
    const shields = game.history.filter(h => h.playerMove === MoveType.SHIELD).length;
    const gambles = game.history.filter(h => h.playerMove === MoveType.GAMBLE).length;
    const observes = game.history.filter(h => h.playerMove === MoveType.OBSERVE).length;

    const matchLog: MatchLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      opponentId: selectedOpponent,
      result: isWin ? 'WIN' : 'LOSS',
      score: `${game.playerWins} - ${game.aiWins}`,
      stats: { strikes, shields, gambles, observes }
    };

    const newStats = { ...stats };
    newStats.matchesPlayed++;
    newStats.matchLogs = [matchLog, ...newStats.matchLogs];

    if (isWin) {
      newStats.matchesWon++;
      newStats.xp += 100 * ARCHETYPES[selectedOpponent].difficulty;
      if (!newStats.archetypesDefeated.includes(selectedOpponent)) {
        newStats.archetypesDefeated.push(selectedOpponent);
      }
    } else {
      newStats.xp += 20;
    }

    newStats.level = Math.floor(1 + newStats.xp / 500);
    newStats.moveHistory = [...newStats.moveHistory, ...game.history.map(h => h.playerMove)];

    setStats(newStats);

    setAiInsight({ loading: true, data: null });
    setView('INSIGHT');

    const currentStats = {
      strikes,
      shields,
      gambles,
      observes,
      total: game.history.length,
      win: isWin
    };

    getPsychologicalProfile(currentStats, selectedOpponent)
      .then(result => {
        setAiInsight({ loading: false, data: result });
      });
  };

  const nextRound = () => {
    triggerHaptic();
    setGame(prev => ({
      ...prev,
      phase: 'PLAYER_INPUT'
    }));
    setTimeLeft(TURN_TIMER);
  };


  // --- Render Helpers ---

  const renderLandingMenu = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-16 relative animate-fade-in bg-stone-950">
      <div className="text-center space-y-4">
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-stone-100 sacred-text">MIRROR / SELF</h1>
        <p className="text-stone-500 uppercase tracking-[0.4em] text-xs md:text-sm">The Reflection Engine</p>
      </div>

      <div className="w-full max-w-xs space-y-4">
        <button
          onClick={() => { triggerHaptic(); setView('MENU'); }}
          className="w-full group relative p-5 border border-stone-700 bg-stone-900/40 hover:border-stone-100 hover:bg-stone-900 transition-all duration-500 flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            <User className="text-stone-400 group-hover:text-stone-100 transition-colors" size={24} />
            <span className="text-stone-300 font-bold uppercase tracking-widest text-sm group-hover:text-white">Single Player</span>
          </div>
          <ChevronRight className="text-stone-600 group-hover:text-stone-100 opacity-0 group-hover:opacity-100 transition-all" size={20} />
        </button>

        <button
          onClick={() => { triggerHaptic(); startLocalGame(); }}
          className="w-full group relative p-5 border border-stone-700 bg-stone-900/40 hover:border-stone-100 hover:bg-stone-900 transition-all duration-500 flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            <Smartphone className="text-stone-400 group-hover:text-stone-100 transition-colors" size={24} />
            <span className="text-stone-300 font-bold uppercase tracking-widest text-sm group-hover:text-white">Local PvP</span>
          </div>
          <ChevronRight className="text-stone-600 group-hover:text-stone-100 opacity-0 group-hover:opacity-100 transition-all" size={20} />
        </button>

        <button
          onClick={() => { triggerHaptic(); setView('ONLINE_LOBBY'); }}
          className="w-full group relative p-5 border border-stone-700 bg-stone-900/40 hover:border-stone-100 hover:bg-stone-900 transition-all duration-500 flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            <Globe className="text-stone-400 group-hover:text-stone-100 transition-colors" size={24} />
            <span className="text-stone-300 font-bold uppercase tracking-widest text-sm group-hover:text-white">Online PvP</span>
          </div>
          <ChevronRight className="text-stone-600 group-hover:text-stone-100 opacity-0 group-hover:opacity-100 transition-all" size={20} />
        </button>

        <button
          className="w-full p-5 border border-stone-800 bg-stone-950 hover:border-stone-600 transition-all flex items-center justify-between group"
          onClick={() => { triggerHaptic(); setView('SETTINGS'); }}
        >
          <div className="flex items-center space-x-4">
            <Settings className="text-stone-600 group-hover:text-stone-400" size={24} />
            <span className="text-stone-600 font-bold uppercase tracking-widest text-sm group-hover:text-stone-400">Settings</span>
          </div>
        </button>
      </div>
      <div className="absolute bottom-6 text-stone-800 text-[10px] uppercase tracking-widest">
        v1.1.0 • Online Enabled
      </div>
    </div>
  );

  const renderOnlineLobby = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-8 relative animate-fade-in">
      <div className="absolute top-6 left-6">
        <button
          onClick={() => {
            triggerHaptic();
            if (peer) peer.destroy();
            setPeer(null);
            setConnStatus('IDLE');
            setConnError('');
            setView('LANDING');
          }}
          className="p-2 text-stone-600 hover:text-stone-300 transition-colors flex items-center space-x-2"
        >
          <ArrowLeft size={24} />
          <span className="text-xs uppercase tracking-widest hidden md:inline">Back</span>
        </button>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold sacred-text text-stone-200">The Void</h2>
        <p className="text-stone-500 text-xs uppercase tracking-widest">Establish Connection</p>
      </div>

      <div className="w-full max-w-md space-y-6">
        {connStatus === 'IDLE' && (
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={hostGame}
              className="p-8 border border-stone-700 bg-stone-900/50 hover:bg-stone-900 hover:border-stone-100 transition-all rounded-lg flex flex-col items-center space-y-4 group"
            >
              <Wifi className="text-stone-400 group-hover:text-stone-100" size={32} />
              <div className="text-center">
                <h3 className="font-bold text-stone-200 text-xl">Host Game</h3>
                <p className="text-stone-500 text-sm">Generate a code to share</p>
              </div>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-800"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-stone-950 text-stone-600 uppercase">Or</span>
              </div>
            </div>

            <div className="p-6 border border-stone-800 bg-stone-900/30 rounded-lg space-y-4">
              <h3 className="font-bold text-stone-400 text-center">Join Game</h3>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter Host ID"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  className="flex-1 bg-stone-950 border border-stone-700 text-stone-200 p-3 rounded focus:outline-none focus:border-stone-400 uppercase text-center tracking-widest text-sm"
                />
                <button
                  onClick={joinGame}
                  disabled={!joinId}
                  className="px-6 bg-stone-100 text-stone-900 font-bold rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  JOIN
                </button>
              </div>
            </div>
          </div>
        )}

        {connStatus === 'HOSTING' && (
          <div className="p-8 border border-stone-700 bg-stone-900 rounded-lg text-center space-y-6 animate-fade-in">
            <Loader2 className="mx-auto animate-spin text-stone-500" size={48} />
            <div className="space-y-2">
              <p className="text-stone-400 font-bold">Waiting for opponent...</p>
              <p className="text-xs text-stone-600">Share this ID with your friend</p>
            </div>

            {peerId ? (
              <button
                onClick={handleCopyId}
                className={`w-full p-4 rounded border flex items-center justify-center space-x-2 transition-all duration-300
                          ${copyFeedback
                    ? 'bg-green-900/20 border-green-500/50'
                    : 'bg-stone-950 border-stone-800 hover:border-stone-600'}
                        `}
              >
                <span className={`font-mono text-xl tracking-widest ${copyFeedback ? 'text-green-400' : 'text-stone-300'}`}>
                  {copyFeedback ? "COPIED TO CLIPBOARD" : peerId}
                </span>
                {!copyFeedback && <Copy size={16} className="text-stone-500" />}
              </button>
            ) : (
              <p className="text-stone-600 text-sm animate-pulse">Generating Frequency...</p>
            )}
          </div>
        )}

        {connStatus === 'CONNECTING' && (
          <div className="text-center space-y-4 animate-pulse">
            <Globe className="mx-auto text-stone-500" size={48} />
            <p className="text-stone-400 tracking-widest uppercase">Connecting to Signal...</p>
          </div>
        )}

        {connStatus === 'ERROR' && (
          <div className="text-center space-y-4 bg-red-950/20 p-6 rounded border border-red-900/30">
            <WifiOff className="mx-auto text-red-500" size={48} />
            <p className="text-red-400 tracking-widest uppercase font-bold">Connection Lost</p>
            <p className="text-stone-400 text-sm">{connError || "Unknown network error occured."}</p>
            <button onClick={() => setConnStatus('IDLE')} className="text-stone-500 hover:text-stone-300 underline text-sm pt-4">Return to Lobby</button>
          </div>
        )}
      </div>
    </div>
  );

  const renderMainMenu = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-8 relative animate-fade-in">
      {/* Header Controls */}
      <div className="absolute top-6 left-6">
        <button
          onClick={() => { triggerHaptic(); setView('LANDING'); }}
          className="p-2 text-stone-600 hover:text-stone-300 transition-colors flex items-center space-x-2"
        >
          <ArrowLeft size={24} />
          <span className="text-xs uppercase tracking-widest hidden md:inline">Back</span>
        </button>
      </div>

      <div className="absolute top-6 right-6 flex items-center space-x-4">
        <button
          onClick={() => { triggerHaptic(); setView('HISTORY'); }}
          className="p-2 text-stone-600 hover:text-stone-300 transition-colors rounded-full border border-transparent hover:border-stone-700"
          title="Battle Log"
        >
          <Clock size={24} />
        </button>
        <button
          onClick={() => { triggerHaptic(); setView('RULES'); }}
          className="p-2 text-stone-600 hover:text-stone-300 transition-colors rounded-full border border-transparent hover:border-stone-700"
          title="Codex"
        >
          <HelpCircle size={24} />
        </button>
      </div>

      <div className="text-center space-y-2 pb-6">
        <h2 className="text-3xl font-bold tracking-tight text-stone-200 sacred-text">Select Archetype</h2>
        <p className="text-stone-500 text-xs uppercase tracking-widest">Choose your opponent</p>
      </div>

      <div className="w-full max-w-md grid gap-4">
        {Object.values(ARCHETYPES).map((arch) => {
          const isLocked = arch.id !== ArchetypeID.IMPULSE && !stats.archetypesDefeated.includes(Object.values(ARCHETYPES)[arch.difficulty - 2]?.id);

          let locked = false;
          if (arch.id === ArchetypeID.WALL && !stats.archetypesDefeated.includes(ArchetypeID.IMPULSE)) locked = true;
          if ((arch.id === ArchetypeID.OBSERVER || arch.id === ArchetypeID.GAMBLER) && !stats.archetypesDefeated.includes(ArchetypeID.WALL)) locked = true;
          if (arch.id === ArchetypeID.TRICKSTER && (!stats.archetypesDefeated.includes(ArchetypeID.OBSERVER) && !stats.archetypesDefeated.includes(ArchetypeID.GAMBLER))) locked = true;
          if (arch.id === ArchetypeID.MIRROR && !stats.archetypesDefeated.includes(ArchetypeID.TRICKSTER)) locked = true;

          return (
            <button
              key={arch.id}
              disabled={locked}
              onClick={() => startGame(arch.id)}
              className={`group relative overflow-hidden p-4 border rounded-lg transition-all duration-300 text-left
                ${locked ? 'border-stone-800 opacity-50 cursor-not-allowed' : 'border-stone-700 hover:border-stone-400 hover:bg-stone-900'}
              `}
            >
              <div className="flex items-center justify-between z-10 relative">
                <div>
                  <h3 className={`font-bold text-lg ${locked ? 'text-stone-600' : arch.color}`}>{arch.name}</h3>
                  <p className="text-stone-500 text-xs uppercase tracking-widest">{arch.title}</p>
                </div>
                {locked ? <Lock className="text-stone-700" size={20} /> : <Play className="text-stone-500 group-hover:text-white" size={20} />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="fixed bottom-6 left-6 text-stone-600 text-xs">
        <p>LVL {stats.level} • XP {stats.xp}</p>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="min-h-screen bg-stone-950 p-6 flex flex-col items-center justify-center animate-fade-in">
      <div className="w-full max-w-lg space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold sacred-text text-stone-200">System</h2>
          <button
            onClick={() => { triggerHaptic(); setView('LANDING'); }}
            className="text-stone-500 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-lg p-6 space-y-6">
          <h3 className="text-stone-500 text-xs uppercase tracking-widest border-b border-stone-800 pb-2">Configuration</h3>

          {/* Audio Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {settings.soundEnabled ? <Volume2 className="text-stone-300" size={20} /> : <VolumeX className="text-stone-600" size={20} />}
              <div>
                <p className="text-stone-200 font-bold text-sm">Audio</p>
                <p className="text-stone-500 text-xs">Enable sound effects</p>
              </div>
            </div>
            <button
              onClick={() => { triggerHaptic(); setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled })); }}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.soundEnabled ? 'bg-stone-100' : 'bg-stone-800'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-stone-950 transform transition-transform ${settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Haptics Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Vibrate className={`${settings.hapticsEnabled ? 'text-stone-300' : 'text-stone-600'}`} size={20} />
              <div>
                <p className="text-stone-200 font-bold text-sm">Haptics</p>
                <p className="text-stone-500 text-xs">Device vibration on interaction</p>
              </div>
            </div>
            <button
              onClick={() => {
                // Vibrate immediately if turning ON, otherwise just toggle
                if (!settings.hapticsEnabled && navigator.vibrate) navigator.vibrate(20);
                setSettings(s => ({ ...s, hapticsEnabled: !s.hapticsEnabled }));
              }}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.hapticsEnabled ? 'bg-stone-100' : 'bg-stone-800'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-stone-950 transform transition-transform ${settings.hapticsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Reduced Motion Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Monitor className={`${settings.reducedMotion ? 'text-stone-300' : 'text-stone-600'}`} size={20} />
              <div>
                <p className="text-stone-200 font-bold text-sm">Reduced Motion</p>
                <p className="text-stone-500 text-xs">Minimize animations</p>
              </div>
            </div>
            <button
              onClick={() => { triggerHaptic(); setSettings(s => ({ ...s, reducedMotion: !s.reducedMotion })); }}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.reducedMotion ? 'bg-stone-100' : 'bg-stone-800'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-stone-950 transform transition-transform ${settings.reducedMotion ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-6 space-y-6">
          <h3 className="text-red-500 text-xs uppercase tracking-widest border-b border-red-900/30 pb-2">Danger Zone</h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Trash2 className="text-red-500" size={20} />
              <div>
                <p className="text-red-200 font-bold text-sm">Reset Save Data</p>
                <p className="text-red-400/50 text-xs">Delete all progress and history</p>
              </div>
            </div>
            <button
              onClick={() => { triggerHaptic(); setConfirmReset(true); }}
              className="px-4 py-2 border border-red-900 text-red-500 hover:bg-red-900/20 rounded text-xs uppercase font-bold transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="text-center text-stone-700 text-xs">
          <p>Mirror / Self v1.1.0</p>
          <p>Session ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
        </div>

        {/* Confirmation Modal */}
        {confirmReset && (
          <Modal title="Delete Everything?">
            <div className="text-center space-y-6">
              <AlertTriangle className="mx-auto text-red-500" size={48} />
              <p className="text-stone-400 text-sm">
                This action is irreversible. All XP, ranks, and match history will be erased from this device.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => { triggerHaptic(); setConfirmReset(false); }}
                  className="flex-1 py-3 bg-stone-800 text-stone-300 rounded hover:bg-stone-700 font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={resetProgress}
                  className="flex-1 py-3 bg-red-900 text-red-100 rounded hover:bg-red-800 font-bold text-sm"
                >
                  Confirm Wipe
                </button>
              </div>
            </div>
          </Modal>
        )}

      </div>
    </div>
  );

  const renderRules = () => (
    <div className="min-h-screen bg-stone-950 p-6 flex flex-col items-center justify-center space-y-8 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-2xl space-y-8 pb-10">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold sacred-text text-stone-200">The Codex</h2>
          <button onClick={() => { triggerHaptic(); setView('MENU'); }} className="text-stone-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <h3 className="text-stone-400 text-sm uppercase tracking-widest border-b border-stone-800 pb-2">Cognitive Resources</h3>
            <p className="text-stone-500 text-sm italic">
              Every action requires Willpower. If you run out, you enter
              <span className="text-red-500 font-bold"> BURNOUT </span>
              (Move Fails + {DMG_EXHAUSTION} Self DMG).
            </p>
          </div>

          <div className="grid gap-4">
            {/* Strike */}
            <div className="bg-stone-900 border border-red-900/30 p-4 rounded flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Sword className="text-red-500" size={24} />
                <div>
                  <h4 className="font-bold text-red-100">STRIKE</h4>
                  <p className="text-xs text-stone-500">The act of aggression.</p>
                </div>
              </div>
              <div className="text-right text-xs space-y-1">
                <p className="text-stone-300">COST: <span className="text-blue-400">{WILL_COSTS[MoveType.STRIKE]} WILL</span></p>
                <p className="text-stone-300">DMG: <span className="text-red-400">{DMG_STRIKE}</span></p>
                <p className="text-stone-500 italic">Blocked by Shield.</p>
              </div>
            </div>

            {/* Shield */}
            <div className="bg-stone-900 border border-amber-900/30 p-4 rounded flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Shield className="text-amber-500" size={24} />
                <div>
                  <h4 className="font-bold text-amber-100">SHIELD</h4>
                  <p className="text-xs text-stone-500">The act of preservation.</p>
                </div>
              </div>
              <div className="text-right text-xs space-y-1">
                <p className="text-stone-300">COST: <span className="text-blue-400">{WILL_COSTS[MoveType.SHIELD]} WILL</span></p>
                <p className="text-stone-300">DMG: <span className="text-stone-500">0</span></p>
                <p className="text-stone-500 italic">Blocks Strike. Reflects Gamble ({DMG_GAMBLE_FAIL_SELF} Self DMG).</p>
              </div>
            </div>

            {/* Gamble */}
            <div className="bg-stone-900 border border-purple-900/30 p-4 rounded flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Dices className="text-purple-500" size={24} />
                <div>
                  <h4 className="font-bold text-purple-100">GAMBLE</h4>
                  <p className="text-xs text-stone-500">The act of chaos.</p>
                </div>
              </div>
              <div className="text-right text-xs space-y-1">
                <p className="text-stone-300">COST: <span className="text-blue-400">{WILL_COSTS[MoveType.GAMBLE]} WILL</span></p>
                <p className="text-stone-300">EFFECT: <span className="text-purple-400">50% chance for {DMG_GAMBLE_SUCCESS} DMG</span></p>
                <p className="text-stone-500 italic">Failure = {DMG_GAMBLE_FAIL_SELF} Self DMG. Always fails vs Shield.</p>
              </div>
            </div>

            {/* Observe */}
            <div className="bg-stone-900 border border-cyan-900/30 p-4 rounded flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Eye className="text-cyan-500" size={24} />
                <div>
                  <h4 className="font-bold text-cyan-100">OBSERVE</h4>
                  <p className="text-xs text-stone-500">The act of clarity.</p>
                </div>
              </div>
              <div className="text-right text-xs space-y-1">
                <p className="text-stone-300">GAIN: <span className="text-green-400">+{WILL_REGEN} WILL</span></p>
                <p className="text-stone-300">HEAL: <span className="text-green-400">+{HEAL_OBSERVE} HP</span></p>
                <p className="text-stone-500 italic">Gain FOCUS: Next Strike Crits (25), Next Gamble Wins (100%).</p>
              </div>
            </div>
          </div>

          {/* Interaction Matrix */}
          <div className="space-y-2 pt-6 border-t border-stone-800">
            <h3 className="text-stone-400 text-sm uppercase tracking-widest pb-2">Interaction Matrix</h3>
            <div className="bg-stone-900 rounded-lg p-4 text-xs space-y-4 font-mono text-stone-400 border border-stone-800">

              <div className="grid grid-cols-[1fr_1fr_2fr] gap-2 border-b border-stone-800 pb-2 font-bold text-stone-300">
                <div>YOU PLAY</div>
                <div>THEY PLAY</div>
                <div>OUTCOME</div>
              </div>

              <div className="contents">
                <div className="grid grid-cols-[1fr_1fr_2fr] gap-2 items-center py-1 border-b border-stone-800/50">
                  <div className="text-red-400 font-bold">STRIKE</div>
                  <div className="text-amber-400">SHIELD</div>
                  <div className="text-stone-500">BLOCKED (0 DMG)</div>
                </div>
                <div className="grid grid-cols-[1fr_1fr_2fr] gap-2 items-center py-1 border-b border-stone-800/50">
                  <div className="text-red-400 font-bold">STRIKE</div>
                  <div className="text-red-400">STRIKE</div>
                  <div className="text-stone-300">Both take {DMG_STRIKE} DMG</div>
                </div>
                <div className="grid grid-cols-[1fr_1fr_2fr] gap-2 items-center py-1 border-b border-stone-800/50">
                  <div className="text-red-400 font-bold">STRIKE</div>
                  <div className="text-cyan-400">OBSERVE</div>
                  <div className="text-stone-300">Deal {DMG_STRIKE} DMG (They Heal {HEAL_OBSERVE})</div>
                </div>
              </div>

              <div className="contents">
                <div className="grid grid-cols-[1fr_1fr_2fr] gap-2 items-center py-1 border-b border-stone-800/50">
                  <div className="text-amber-400 font-bold">SHIELD</div>
                  <div className="text-purple-400">GAMBLE</div>
                  <div className="text-red-400 font-bold">REFLECT! Enemy takes {DMG_GAMBLE_FAIL_SELF} DMG</div>
                </div>
                <div className="grid grid-cols-[1fr_1fr_2fr] gap-2 items-center py-1 border-b border-stone-800/50">
                  <div className="text-amber-400 font-bold">SHIELD</div>
                  <div className="text-cyan-400">OBSERVE</div>
                  <div className="text-stone-500">Stalemate (You lose Will)</div>
                </div>
              </div>

              <div className="contents">
                <div className="grid grid-cols-[1fr_1fr_2fr] gap-2 items-center py-1 border-b border-stone-800/50">
                  <div className="text-purple-400 font-bold">GAMBLE</div>
                  <div className="text-amber-400">SHIELD</div>
                  <div className="text-red-500 font-bold">FAIL: You take {DMG_GAMBLE_FAIL_SELF} Self DMG</div>
                </div>
                <div className="grid grid-cols-[1fr_1fr_2fr] gap-2 items-center py-1 border-b border-stone-800/50">
                  <div className="text-purple-400 font-bold">GAMBLE</div>
                  <div className="text-stone-400">ANY OTHER</div>
                  <div className="text-stone-300">
                    <span className="text-green-400">WIN: {DMG_GAMBLE_SUCCESS} DMG</span> / <span className="text-red-400">LOSE: {DMG_GAMBLE_FAIL_SELF} Self DMG</span>
                  </div>
                </div>
              </div>

            </div>
            <p className="text-[10px] text-stone-600 italic text-center pt-2">
              *If Willpower is 0 (Burnout), any Move effectively becomes "Do Nothing" and you take {DMG_EXHAUSTION} DMG.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="min-h-screen bg-stone-950 p-6 flex flex-col items-center animate-fade-in overflow-y-auto">
      <div className="w-full max-w-2xl space-y-8 pb-10">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold sacred-text text-stone-200">Battle Log</h2>
          <button onClick={() => { triggerHaptic(); setView('MENU'); }} className="text-stone-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {stats.matchLogs.length === 0 ? (
          <div className="text-center py-20 text-stone-600 space-y-4">
            <History size={48} className="mx-auto opacity-20" />
            <p className="uppercase tracking-widest text-sm">No battles recorded yet.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {stats.matchLogs.map(log => {
              const opponent = ARCHETYPES[log.opponentId];
              const isWin = log.result === 'WIN';
              const date = new Date(log.timestamp).toLocaleDateString();

              return (
                <div key={log.id} className="bg-stone-900 border border-stone-800 rounded-lg p-4 flex items-center justify-between hover:border-stone-700 transition-colors">

                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-stone-950 ${opponent.color}`}>
                      {/* We don't have direct access to Lucide icons dynamically here easily without mapping, so using first char */}
                      <span className="font-bold">{opponent.name[0]}</span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold text-sm ${isWin ? 'text-green-500' : 'text-red-500'}`}>{log.result}</span>
                        <span className="text-stone-600 text-xs">•</span>
                        <span className="text-stone-300 font-bold text-sm">{opponent.name}</span>
                      </div>
                      <div className="text-xs text-stone-500 uppercase tracking-wider mt-1">
                        Score: {log.score}
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-[10px] text-stone-500">{date}</div>
                    <div className="flex space-x-2 text-[10px] text-stone-400">
                      <span title="Strikes" className="flex items-center space-x-0.5"><span className="text-red-900">S:</span><span>{log.stats.strikes}</span></span>
                      <span title="Shields" className="flex items-center space-x-0.5"><span className="text-amber-900">D:</span><span>{log.stats.shields}</span></span>
                      <span title="Gambles" className="flex items-center space-x-0.5"><span className="text-purple-900">G:</span><span>{log.stats.gambles}</span></span>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderGame = () => {
    const isMultiplayer = game.mode === GameMode.LOCAL || game.mode === GameMode.ONLINE;
    const isP2Turn = game.mode === GameMode.LOCAL && game.turnPlayer === 'P2';

    // Determine stats based on perspective
    // In Local: Flip based on turn. In Online: Bottom is always Self (Player), Top is Opponent (Remote/AI).

    let bottomHP, bottomWill, bottomWins, bottomFocused;
    let topHP, topWill, topWins, topFocused;
    let bottomLabel, topLabel;

    if (game.mode === GameMode.ONLINE) {
      // ONLINE: Fixed Perspective
      bottomHP = game.playerHP;
      bottomWill = game.playerWill;
      bottomWins = game.playerWins;
      bottomFocused = game.playerFocused;
      bottomLabel = "SELF";

      topHP = game.aiHP;
      topWill = game.aiWill;
      topWins = game.aiWins;
      topFocused = game.aiFocused;
      topLabel = "OPPONENT";
    } else {
      // LOCAL / SINGLE
      bottomHP = isP2Turn ? game.aiHP : game.playerHP;
      bottomWill = isP2Turn ? game.aiWill : game.playerWill;
      bottomWins = isP2Turn ? game.aiWins : game.playerWins;
      bottomFocused = isP2Turn ? game.aiFocused : game.playerFocused;
      bottomLabel = isMultiplayer ? (isP2Turn ? "PLAYER 2" : "PLAYER 1") : "SELF";

      topHP = isP2Turn ? game.playerHP : game.aiHP;
      topWill = isP2Turn ? game.playerWill : game.aiWill;
      topWins = isP2Turn ? game.playerWins : game.aiWins;
      topFocused = isP2Turn ? game.playerFocused : game.aiFocused;
      topLabel = isMultiplayer ? (isP2Turn ? "PLAYER 1" : "PLAYER 2") : ARCHETYPES[selectedOpponent].name;
    }

    const opponent = ARCHETYPES[selectedOpponent];
    const isPlayerTurn = game.phase === 'PLAYER_INPUT';

    // Online specific state
    const isOnlineWaiting = game.mode === GameMode.ONLINE && onlineMoves.me !== null;

    return (
      <div className="min-h-screen flex flex-col p-4 max-w-lg mx-auto relative overflow-hidden bg-stone-950">

        {/* Abandon Button */}
        <div className="absolute top-4 left-4 z-40">
          <button
            onClick={abandonGame}
            className="flex items-center space-x-2 text-stone-600 hover:text-red-500 transition-colors"
          >
            <LogOut size={16} />
            <span className="text-[10px] uppercase tracking-widest font-bold">Abandon</span>
          </button>
        </div>

        {/* Top Player / Opponent Area */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 pt-8 transition-opacity duration-300">
          <div className={`relative w-24 h-24 rounded-full border-2 transition-all duration-500 flex items-center justify-center 
              ${topFocused ? 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'border-stone-700'} 
              ${(isP2Turn ? game.lastResult?.playerDamageTaken : game.lastResult?.aiDamageTaken) ? 'animate-pulse' : ''}
          `}>

            {/* Emote Bubble */}
            {game.activeAIEmote && (
              <EmoteBubble emoteId={game.activeAIEmote.id} isPlayer={false} />
            )}

            {/* Simple Avatar Placeholder */}
            <div className={`w-20 h-20 rounded-full bg-stone-900 flex items-center justify-center ${opponent.color}`}>
              <span className="text-4xl font-black">{opponent.name[4]}</span>
            </div>

            {/* Focus Visuals */}
            {topFocused && (
              <>
                <div className="absolute -inset-2 border border-cyan-500/50 rounded-full animate-pulse-slow"></div>
                <div className="absolute -bottom-6 bg-stone-900 border border-cyan-500/30 px-2 py-0.5 rounded text-[9px] text-cyan-400 font-bold tracking-widest uppercase shadow-lg animate-fade-in">
                  Focused
                </div>
              </>
            )}
          </div>
          <div className="w-full space-y-1">
            <div className="flex justify-between text-xs uppercase tracking-widest text-stone-500">
              <span>{topLabel}</span>
              <span>{topHP} HP</span>
            </div>
            <ProgressBar current={topHP} max={MAX_HP} color="bg-red-700" />

            {/* Opponent Willpower Bar */}
            <div className="flex items-center space-x-2 pt-1">
              <Zap size={12} className="text-blue-500" />
              <ProgressBar current={topWill} max={MAX_WILL} color="bg-blue-600" height="h-1.5" />
            </div>

            <div className="flex justify-center space-x-1 mt-2">
              {[...Array(WIN_ROUNDS)].map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i < topWins ? 'bg-red-500' : 'bg-stone-800'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Central Stage */}
        <div className="flex-[2] flex flex-col items-center justify-center text-center py-4 relative z-0">
          <div className="space-y-2 transition-all duration-300">
            <span className={`text-6xl font-bold text-stone-800 ${game.phase === 'PLAYER_INPUT' ? 'animate-pulse' : ''}`}>
              {game.phase === 'PLAYER_INPUT' ? (isMultiplayer ? (isOnlineWaiting ? "..." : "VS") : timeLeft) : '...'}
            </span>
            <p className="text-stone-500 text-xs uppercase tracking-[0.2em]">
              {game.phase === 'PLAYER_INPUT'
                ? (isOnlineWaiting
                  ? "WAITING FOR OPPONENT"
                  : (isMultiplayer ? (game.mode === GameMode.LOCAL ? `${bottomLabel} CHOOSE` : "MAKE YOUR CHOICE") : "MAKE YOUR CHOICE"))
                : "RESOLVING FATE"}
            </p>
          </div>
        </div>

        {/* Bottom Player / Self Controls */}
        <div className="flex-1 space-y-6 pb-8 transition-opacity duration-300 relative">

          {/* Player Avatar Area (Invisible but used for positioning emote) */}
          <div className="absolute -top-10 right-4 w-1 h-1">
            {game.activePlayerEmote && (
              <EmoteBubble emoteId={game.activePlayerEmote.id} isPlayer={true} />
            )}
          </div>

          {/* Emote Button - Disabled in Multiplayer for now or shared */}
          {(!isMultiplayer || game.mode === GameMode.ONLINE) && (
            <div className="absolute -top-12 right-0">
              <button
                onClick={() => { triggerHaptic(); setShowEmotePicker(!showEmotePicker); }}
                className="p-2 text-stone-600 hover:text-stone-300 rounded-full border border-stone-800 bg-stone-900"
              >
                <Smile size={16} />
              </button>
              {showEmotePicker && (
                <div className="absolute bottom-10 right-0 bg-stone-900 border border-stone-700 rounded-lg p-2 grid grid-cols-2 gap-2 shadow-xl animate-fade-in z-50 w-48">
                  {EMOTES.map(e => (
                    <button
                      key={e.id}
                      onClick={() => handlePlayerEmote(e.id)}
                      className="flex items-center space-x-2 p-2 hover:bg-stone-800 rounded text-left"
                    >
                      <span className="text-lg">{e.icon}</span>
                      <span className="text-[10px] uppercase font-bold text-stone-400">{e.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="w-full space-y-1">
            <div className="flex justify-between text-xs uppercase tracking-widest text-stone-500">
              <div className="flex items-center space-x-2">
                <span>{bottomLabel}</span>
                {bottomFocused && (
                  <span className="flex items-center space-x-1 text-cyan-400 animate-pulse">
                    <Eye size={12} />
                    <span className="text-[9px] font-bold">FOCUSED</span>
                  </span>
                )}
              </div>
              <span>{bottomHP} HP</span>
            </div>

            <div className={`transition-all duration-300 rounded-full ${bottomFocused ? 'ring-2 ring-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : ''}`}>
              <ProgressBar current={bottomHP} max={MAX_HP} color="bg-stone-200" />
            </div>

            {/* Player Willpower Bar */}
            <div className="flex items-center space-x-2 pt-1">
              <Zap size={12} className="text-blue-400" />
              <ProgressBar current={bottomWill} max={MAX_WILL} color="bg-blue-500" height="h-1.5" />
            </div>

            <div className="flex justify-center space-x-1 mt-2">
              {[...Array(WIN_ROUNDS)].map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i < bottomWins ? 'bg-stone-200' : 'bg-stone-800'}`} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {Object.values(MoveType).filter(m => m !== MoveType.NONE).map((move) => {
              const cfg = MOVES_CONFIG[move];
              if (!cfg) return null;
              const Icon = cfg.icon;
              const cost = cfg.cost;
              const canAfford = bottomWill >= cost || move === MoveType.OBSERVE;

              return (
                <button
                  key={move}
                  disabled={!isPlayerTurn || isOnlineWaiting}
                  onClick={() => handleMove(move)}
                  className={`
                      relative p-4 rounded-lg flex flex-col items-center justify-center space-y-1 transition-all transform active:scale-95 overflow-hidden
                      ${isPlayerTurn && !isOnlineWaiting
                      ? canAfford
                        ? `${cfg.color} hover:opacity-90 shadow-lg border-b-4`
                        : 'bg-stone-950 border-2 border-red-900/60 text-stone-500 cursor-pointer hover:border-red-500 hover:bg-red-900/10' // Burnout risk style
                      : 'bg-stone-900 border border-stone-800 text-stone-600 opacity-50 cursor-not-allowed'}
                   `}
                >
                  {/* Insufficient Will Warning Watermark */}
                  {!canAfford && isPlayerTurn && !isOnlineWaiting && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                      <AlertTriangle size={64} className="text-red-500" />
                    </div>
                  )}

                  <div className="flex items-center space-x-2 relative z-10">
                    <Icon size={20} className={!canAfford && isPlayerTurn && !isOnlineWaiting ? "text-red-400" : ""} />
                    <span className="text-xs font-bold uppercase tracking-wider">{cfg.name}</span>
                  </div>

                  {move !== MoveType.OBSERVE && (
                    <div className={`text-[10px] relative z-10 ${canAfford ? 'text-stone-300' : 'text-red-500 font-bold flex items-center space-x-1'}`}>
                      {canAfford ? (
                        <span>-{cost} WILL</span>
                      ) : (
                        <>
                          <X size={12} />
                          <span>LOW WILL: BURNOUT</span>
                        </>
                      )}
                    </div>
                  )}
                  {move === MoveType.OBSERVE && (
                    <span className="text-[10px] text-blue-300">+REGEN</span>
                  )}

                  {move === MoveType.OBSERVE && bottomFocused && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* OVERLAYS */}

        {/* 1. Multiplayer Intermission Overlay */}
        {game.phase === 'INTERMISSION' && game.mode === GameMode.LOCAL && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-stone-950 p-6 animate-fade-in">
            <div className="text-center space-y-8 max-w-sm">
              <Smartphone size={48} className="mx-auto text-stone-500" />
              <div className="space-y-2">
                <h2 className="text-3xl font-bold sacred-text text-stone-200">Pass Device</h2>
                <p className="text-stone-400 text-sm uppercase tracking-widest">Hand over to Player 2</p>
              </div>
              <div className="p-4 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-500">
                Your move is hidden. Player 2 must choose their action to reveal the outcome.
              </div>
              <button
                onClick={() => setGame(prev => ({ ...prev, phase: 'PLAYER_INPUT' }))}
                className="w-full py-4 bg-stone-100 text-stone-950 font-bold rounded uppercase tracking-widest hover:bg-white transition-colors"
              >
                I am Player 2
              </button>
            </div>
          </div>
        )}

        {/* 2. Card Reveal Overlay */}
        {game.phase === 'RESOLVING' && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center">
            <div className="bg-stone-950/90 backdrop-blur-sm p-8 rounded-xl border border-stone-800 shadow-2xl flex flex-col items-center space-y-6 animate-fade-in pointer-events-auto">
              <div className="flex space-x-4">
                <MoveCard move={game.pendingResult?.playerMove || MoveType.NONE} isPlayer={true} />
                <div className="flex flex-col justify-center text-stone-500 font-bold text-xl">VS</div>
                <MoveCard move={game.pendingResult?.aiMove || MoveType.NONE} isPlayer={false} />
              </div>
              <div className="max-w-xs text-center">
                <p className="text-stone-300 text-sm leading-relaxed font-serif">
                  {isMultiplayer
                    ? game.pendingResult?.narrative
                      .replace(/You/g, "Player 1")
                      .replace(/Opponent/g, "Player 2")
                      .replace(/Your/g, "Player 1's")
                    : game.pendingResult?.narrative
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. Round Over Modal */}
        {game.phase === 'ROUND_OVER' && (
          <Modal title={`Round ${game.currentRound - 1} Complete`}>
            <p className="text-stone-400 text-sm text-center">
              {game.lastRoundResult === 'VICTORY' ? (isMultiplayer ? "Player 1 dominates." : "You dominated this round.") : (isMultiplayer ? "Player 2 dominates." : "You fell this round.")}
            </p>
            <HistoryLog
              history={game.history.filter(h => h.round === game.currentRound - 1)}
              title="Round Log"
            />
            <button
              onClick={nextRound}
              className="px-6 py-2 bg-stone-100 text-stone-900 font-bold rounded hover:bg-white w-full"
            >
              Continue
            </button>
          </Modal>
        )}

        {/* 4. Match Over Modal */}
        {game.phase === 'MATCH_OVER' && (
          <Modal title={game.playerWins >= WIN_ROUNDS ? "PLAYER 1 WINS" : (isMultiplayer ? "PLAYER 2 WINS" : "DEFEAT")}>
            <HistoryLog history={game.history} title="Match History" />
            <button
              onClick={finishMatch}
              className="px-6 py-2 bg-stone-100 text-stone-900 font-bold rounded hover:bg-white w-full"
            >
              {isMultiplayer ? "Exit to Menu" : "See Insights"}
            </button>
          </Modal>
        )}

      </div>
    );
  };

  const renderInsight = () => {
    // Calculate simple stats from the just-finished game
    const currentHistory = game.history;
    const strikes = currentHistory.filter(h => h.playerMove === MoveType.STRIKE).length;
    const shields = currentHistory.filter(h => h.playerMove === MoveType.SHIELD).length;
    const gambles = currentHistory.filter(h => h.playerMove === MoveType.GAMBLE).length;
    const observes = currentHistory.filter(h => h.playerMove === MoveType.OBSERVE).length;

    // Default fallback insight
    const localInsight = generateInsight({
      strikes, shields, gambles, observes,
      total: currentHistory.length,
      win: game.playerWins >= WIN_ROUNDS
    });

    const activeInsight = aiInsight.data || localInsight;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-8 bg-stone-950">
        <h2 className="text-stone-500 text-sm uppercase tracking-[0.3em]">Analysis Complete</h2>

        <div className="w-full max-w-md bg-stone-900 border border-stone-800 p-8 rounded-lg shadow-2xl space-y-6 relative overflow-hidden transition-all duration-500">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-stone-900 via-stone-500 to-stone-900 opacity-50"></div>

          <div className="text-center space-y-2">
            {aiInsight.loading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-pulse">
                <Brain className="text-cyan-500" size={48} />
                <div className="space-y-2">
                  <p className="text-stone-300 font-serif italic text-lg">"Thinking..."</p>
                  <p className="text-xs text-stone-500 uppercase tracking-widest">Analyzing Patterns</p>
                </div>
              </div>
            ) : (
              <>
                <Brain className="mx-auto text-stone-600 mb-4" size={32} />
                <h1 className="text-2xl font-bold text-stone-200 sacred-text animate-fade-in">{activeInsight.title}</h1>
                <p className="text-stone-400 italic font-serif leading-relaxed animate-fade-in">"{activeInsight.text}"</p>
              </>
            )}
          </div>

          {!aiInsight.loading && (
            <div className="grid grid-cols-4 gap-2 text-center text-xs text-stone-600 pt-4 border-t border-stone-800 animate-fade-in">
              <div>
                <div className="font-bold text-red-500">{strikes}</div>
                <div>STR</div>
              </div>
              <div>
                <div className="font-bold text-amber-500">{shields}</div>
                <div>SHD</div>
              </div>
              <div>
                <div className="font-bold text-cyan-500">{observes}</div>
                <div>OBS</div>
              </div>
              <div>
                <div className="font-bold text-purple-500">{gambles}</div>
                <div>RNG</div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => { triggerHaptic(); setView('MENU'); }}
          disabled={aiInsight.loading}
          className={`text-stone-400 hover:text-white transition-colors flex items-center space-x-2 text-sm uppercase tracking-widest ${aiInsight.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <History size={16} />
          <span>Return to Void</span>
        </button>
      </div>
    );
  };

  return (
    <div className="bg-stone-950 min-h-screen text-stone-200 selection:bg-stone-700">
      {view === 'LANDING' && renderLandingMenu()}
      {view === 'MENU' && renderMainMenu()}
      {view === 'RULES' && renderRules()}
      {view === 'HISTORY' && renderHistory()}
      {view === 'SETTINGS' && renderSettings()}
      {view === 'ONLINE_LOBBY' && renderOnlineLobby()}
      {view === 'GAME' && renderGame()}
      {view === 'INSIGHT' && renderInsight()}
    </div>
  );
}