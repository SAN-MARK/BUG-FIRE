/**
 * BUG FIRE - 3D Retro Battle Royale
 * Main Application Shell & UI Coordinator
 */

import React, { useEffect, useRef, useState } from 'react';
import { gameEngine } from './game/engine';
import { Difficulty, GameMode, GameState, MapId, QualityTier } from './game/types';
import { LoadingScreen } from './components/LoadingScreen';
import { LoginScreen } from './components/LoginScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { MapSelectScreen } from './components/MapSelectScreen';
import { MatchmakingScreen } from './components/MatchmakingScreen';
import { HUD } from './components/HUD';
import { TouchControls } from './components/TouchControls';
import { EndScreen } from './components/EndScreen';
import { HelpModal } from './components/HelpModal';
import { soundEngine } from './game/audio';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [gameState, setGameState] = useState<GameState>('LOADING');
  const [selectedMap, setSelectedMap] = useState<MapId>('BERMUDA');
  const [gameMode, setGameMode] = useState<GameMode>('SOLO');
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL');
  const [quality, setQuality] = useState<QualityTier>('MEDIUM');
  const [isMuted, setIsMuted] = useState(false);
  const [username, setUsername] = useState('Vance_Rider');
  const [showHelp, setShowHelp] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  useEffect(() => {
    // Detect mobile touch
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);

    // Initialize WebGL Three.js Renderer
    if (canvasMountRef.current && !gameEngine.renderer) {
      gameEngine.initRenderer(canvasMountRef.current);
    }

    // Subscribe to engine state changes
    gameEngine.onStateChange = (newState) => {
      setGameState(newState);
    };

    // Pointer lock listener
    const onLockChange = () => {
      setIsPointerLocked(document.pointerLockElement !== null);
    };
    document.addEventListener('pointerlockchange', onLockChange);

    return () => {
      document.removeEventListener('pointerlockchange', onLockChange);
    };
  }, []);

  const handleCanvasClick = () => {
    if ((gameState === 'PLAYING' || gameState === 'DROP') && canvasMountRef.current) {
      try {
        canvasMountRef.current.requestPointerLock?.();
      } catch (e) {
        console.warn('Pointer lock request rejected', e);
      }
    }
  };

  const handleStartMatch = () => {
    gameEngine.mode = gameMode;
    gameEngine.difficulty = difficulty;
    gameEngine.startMatch();
  };

  const handleSelectMap = (mapId: MapId) => {
    setSelectedMap(mapId);
    gameEngine.setMap(mapId);
  };

  const handleQualityChange = (q: QualityTier) => {
    setQuality(q);
    gameEngine.setQuality(q);
  };

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0a1a] select-none font-['Chakra_Petch',sans-serif]">
      {/* Isolated Three.js WebGL Mount Canvas */}
      <div
        ref={canvasMountRef}
        onClick={handleCanvasClick}
        className="absolute inset-0 z-0 cursor-crosshair"
      />

      {/* Pointer Lock Helper Tag (Only shown if mouse lock is inactive during match) */}
      {(gameState === 'PLAYING' || gameState === 'DROP') && !isPointerLocked && !isTouchDevice && (
        <div
          onClick={handleCanvasClick}
          className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-[#10002b]/90 border border-[#ffd166] text-[#ffd166] px-4 py-1.5 rounded-full text-xs font-mono font-bold shadow-[0_0_15px_rgba(255,209,102,0.6)] cursor-pointer animate-pulse"
        >
          🖱️ Click screen to lock 360° mouse look
        </div>
      )}

      {/* 1. LOADING SCREEN */}
      {gameState === 'LOADING' && (
        <LoadingScreen onEnter={() => gameEngine.setState('LOGIN')} />
      )}

      {/* 2. LOGIN SCREEN */}
      {gameState === 'LOGIN' && (
        <LoginScreen
          onLoginSuccess={(name) => {
            setUsername(name);
            gameEngine.username = name;
            gameEngine.setState('LOBBY');
          }}
        />
      )}

      {/* 3. LOBBY SCREEN */}
      {gameState === 'LOBBY' && (
        <LobbyScreen
          username={username}
          selectedMap={selectedMap}
          gameMode={gameMode}
          difficulty={difficulty}
          quality={quality}
          isMuted={isMuted}
          onStartMatch={handleStartMatch}
          onOpenMapSelect={() => gameEngine.setState('MAP_SELECT')}
          onChangeMode={(m) => setGameMode(m)}
          onChangeDifficulty={(d) => setDifficulty(d)}
          onChangeQuality={handleQualityChange}
          onToggleMute={handleToggleMute}
          onOpenHelp={() => setShowHelp(true)}
        />
      )}

      {/* 4. MAP SELECT SCREEN */}
      {gameState === 'MAP_SELECT' && (
        <MapSelectScreen
          currentMap={selectedMap}
          onSelectMap={handleSelectMap}
          onBack={() => gameEngine.setState('LOBBY')}
        />
      )}

      {/* 5. MATCHMAKING SCREEN */}
      {gameState === 'MATCHMAKING' && <MatchmakingScreen />}

      {/* 6. PLAYING & DROP HUD OVERLAYS */}
      {(gameState === 'PLAYING' || gameState === 'DROP') && (
        <>
          <HUD engine={gameEngine} />
          {isTouchDevice && <TouchControls engine={gameEngine} />}
        </>
      )}

      {/* 7. END SCREEN (BOOYAH or GAME OVER) */}
      {(gameState === 'GAME_OVER' || gameState === 'BOOYAH') && (
        <EndScreen
          isBooyah={gameState === 'BOOYAH'}
          stats={gameEngine.stats}
          onPlayAgain={() => gameEngine.resetMatch()}
          onLobby={() => gameEngine.returnToLobby()}
        />
      )}

      {/* 8. HELP & CONTROLS MODAL */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
