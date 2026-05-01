/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Skull, Heart, Shield, Zap, RefreshCw } from 'lucide-react';

// --- Types ---
type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'LEVEL_UP';

interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  speed: number;
  color: string;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color: string;
}

// --- Constants ---
const PLAYER_SIZE = 32;
const ENEMY_SIZE = 24;
const PROJECTILE_SIZE = 8;
const INITIAL_PLAYER_HP = 100;
const XP_FOR_LEVEL = 100;

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [timer, setTimer] = useState(0);
  
  // Game loop trigger
  const startGame = () => {
    setGameState('PLAYING');
    setScore(0);
    setLevel(1);
    setXp(0);
    setTimer(0);
  };

  const handleGameOver = () => {
    setGameState('GAMEOVER');
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      <AnimatePresence mode="wait">
        {gameState === 'MENU' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full space-y-12"
          >
            <div className="text-center">
              <h1 className="text-6xl md:text-8xl font-bold text-red-600 pixel-text-shadow mb-4">
                PIXEL
                <br />
                SURVIVOR
              </h1>
              <p className="text-sm md:text-lg text-gray-400 animate-pulse">PRESS START TO FIGHT FOR YOUR LIFE</p>
            </div>

            <button
              onClick={startGame}
              className="pixel-button text-2xl flex items-center gap-4 group"
            >
              <Play className="fill-current" />
              START GAME
            </button>

            <div className="grid grid-cols-2 gap-8 text-xs text-gray-500 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Skull size={16} /> KILLS: ---
              </div>
              <div className="flex items-center gap-2">
                <Heart size={16} /> RECORD: ---
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'PLAYING' && (
          <GameEngine 
            onGameOver={handleGameOver} 
            level={level}
            setLevel={setLevel}
            xp={xp}
            setXp={setXp}
            score={score}
            setScore={setScore}
            timer={timer}
            setTimer={setTimer}
          />
        )}

        {gameState === 'GAMEOVER' && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 space-y-10"
          >
            <h2 className="text-7xl font-bold text-red-600 pixel-text-shadow">YOU PERISHED</h2>
            <div className="text-center space-y-4">
              <p className="text-2xl">KILLS: {score}</p>
              <p className="text-2xl">SURVIVED: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</p>
            </div>
            <button
              onClick={startGame}
              className="pixel-button text-xl flex items-center gap-3"
            >
              <RefreshCw size={24} /> REBOOT
            </button>
            <button
              onClick={() => setGameState('MENU')}
              className="text-gray-500 hover:text-white transition-colors"
            >
              MAIN MENU
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Game Engine Component ---
function GameEngine({ 
  onGameOver, 
  level, setLevel, 
  xp, setXp, 
  score, setScore,
  timer, setTimer
}: { 
  onGameOver: () => void;
  level: number; setLevel: (n: number | ((p: number) => number)) => void;
  xp: number; setXp: (n: number | ((p: number) => number)) => void;
  score: number; setScore: (n: number | ((p: number) => number)) => void;
  timer: number; setTimer: (n: number | ((p: number) => number)) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Entity>({
    x: 0, y: 0, 
    width: PLAYER_SIZE, height: PLAYER_SIZE, 
    hp: INITIAL_PLAYER_HP, maxHp: INITIAL_PLAYER_HP,
    speed: 4, color: '#ef4444'
  });
  
  const enemiesRef = useRef<Entity[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const lastShotTime = useRef(0);

  // Initialize player position
  useEffect(() => {
    playerRef.current.x = window.innerWidth / 2 - PLAYER_SIZE / 2;
    playerRef.current.y = window.innerHeight / 2 - PLAYER_SIZE / 2;
  }, []);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main Loop
  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();
    let enemySpawnTimer = 0;
    
    const loop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Update timer
      if (Math.floor(currentTime / 1000) > Math.floor((currentTime - deltaTime) / 1000)) {
        setTimer(t => t + 1);
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      // Resize canvas if needed
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      // 1. Update Player Movement
      const p = playerRef.current;
      if (keysPressed.current['w'] || keysPressed.current['arrowup']) p.y -= p.speed;
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) p.y += p.speed;
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) p.x -= p.speed;
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) p.x += p.speed;

      // Boundary check
      p.x = Math.max(0, Math.min(canvas.width - p.width, p.x));
      p.y = Math.max(0, Math.min(canvas.height - p.height, p.y));

      // 2. Auto-attack (Survivor style)
      if (currentTime - lastShotTime.current > 500 / (1 + level * 0.1)) {
        // Find nearest enemy
        let nearestEnemy: Entity | null = null;
        let minDist = Infinity;
        enemiesRef.current.forEach(e => {
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d < minDist) {
            minDist = d;
            nearestEnemy = e;
          }
        });

        if (nearestEnemy) {
          const target = nearestEnemy as Entity;
          const angle = Math.atan2(target.y - p.y, target.x - p.x);
          projectilesRef.current.push({
            x: p.x + p.width/2,
            y: p.y + p.height/2,
            vx: Math.cos(angle) * 10,
            vy: Math.sin(angle) * 10,
            damage: 20 + level * 5,
            color: '#facc15'
          });
          lastShotTime.current = currentTime;
        }
      }

      // 3. Update Projectiles
      projectilesRef.current = projectilesRef.current.filter(proj => {
        proj.x += proj.vx;
        proj.y += proj.vy;
        
        // Kill if out of bounds
        if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) return false;

        // Collision with enemies
        let hit = false;
        enemiesRef.current.forEach(e => {
          if (!hit && proj.x > e.x && proj.x < e.x + e.width && proj.y > e.y && proj.y < e.y + e.height) {
            e.hp -= proj.damage;
            hit = true;
          }
        });
        return !hit;
      });

      // 4. Update Enemies
      enemySpawnTimer += deltaTime;
      if (enemySpawnTimer > 1000 - Math.min(800, level * 50)) {
        const side = Math.floor(Math.random() * 4);
        let ex = 0, ey = 0;
        if (side === 0) { ex = Math.random() * canvas.width; ey = -ENEMY_SIZE; }
        else if (side === 1) { ex = Math.random() * canvas.width; ey = canvas.height + ENEMY_SIZE; }
        else if (side === 2) { ex = -ENEMY_SIZE; ey = Math.random() * canvas.height; }
        else { ex = canvas.width + ENEMY_SIZE; ey = Math.random() * canvas.height; }

        enemiesRef.current.push({
          x: ex, y: ey,
          width: ENEMY_SIZE, height: ENEMY_SIZE,
          hp: 40 + (level * 10), maxHp: 40 + (level * 10),
          speed: 1.5 + (Math.random() * level * 0.1),
          color: '#22c55e'
        });
        enemySpawnTimer = 0;
      }

      enemiesRef.current = enemiesRef.current.filter(e => {
        // Move towards player
        const angle = Math.atan2(p.y - e.y, e.x - p.x);
        e.x -= Math.cos(angle) * e.speed;
        e.y += Math.sin(angle) * e.speed;

        // Collision with player
        if (Math.hypot(e.x - p.x, e.y - p.y) < (PLAYER_SIZE + ENEMY_SIZE) / 2) {
          p.hp -= 0.5; // Damage over time
          if (p.hp <= 0) onGameOver();
        }

        if (e.hp <= 0) {
          setScore(s => s + 1);
          setXp(x => {
            const newXp = x + 10;
            if (newXp >= XP_FOR_LEVEL) {
              setLevel(l => l + 1);
              p.hp = Math.min(p.maxHp, p.hp + 20); // Heal on level up
              return 0;
            }
            return newXp;
          });
          return false;
        }
        return true;
      });

      // 5. Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw Grid lines (stylized)
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      const gridSize = 100;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Draw Enemies
      enemiesRef.current.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x, e.y, e.width, e.height);
        // Enemy HP bar
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(e.x, e.y - 8, e.width, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(e.x, e.y - 8, e.width * (e.hp / e.maxHp), 4);
      });

      // Draw Projectiles
      projectilesRef.current.forEach(proj => {
        ctx.fillStyle = proj.color;
        ctx.fillRect(proj.x - PROJECTILE_SIZE/2, proj.y - PROJECTILE_SIZE/2, PROJECTILE_SIZE, PROJECTILE_SIZE);
      });

      // Draw Player
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.width, p.height);
      // Small hat/eye to show direction
      ctx.fillStyle = 'white';
      ctx.fillRect(p.x + 6, p.y + 6, 6, 6);
      ctx.fillRect(p.x + 20, p.y + 6, 6, 6);

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [level, onGameOver, setLevel, setScore, setTimer, setXp]);

  const progressPercent = (xp / XP_FOR_LEVEL) * 100;
  const hpPercent = (playerRef.current.hp / playerRef.current.maxHp) * 100;

  return (
    <div className="absolute inset-0 z-10 font-pixel">
      {/* Top HUD */}
      <div className="absolute top-0 left-0 w-full p-4 flex flex-col items-center gap-2 pointer-events-none">
        <div className="w-full max-w-2xl h-8 bg-gray-900 border-4 border-white relative overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300" 
            style={{ width: `${progressPercent}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-xs pixel-text-shadow">
            LVL {level}
          </span>
        </div>
        
        <div className="flex justify-between w-full max-w-2xl text-xl pixel-text-shadow">
          <div className="flex items-center gap-2 text-white">
            <Skull size={20} /> {score}
          </div>
          <div className="text-white">
            {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Bottom HUD: HP Bar */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-64 pointer-events-none">
        <div className="flex items-center gap-3 mb-1">
          <Heart className="text-red-500 fill-current" size={16} />
          <span className="text-[10px] text-red-500 italic uppercase">Vitality</span>
        </div>
        <div className="w-full h-4 bg-gray-900 border-2 border-white relative">
          <div 
            className="h-full bg-red-600 transition-all duration-300"
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {/* Side HUD: Active Skills (Mockup) */}
      <div className="absolute top-24 left-4 flex flex-col gap-4">
        {[Zap, Shield, Heart].map((Icon, i) => (
          <div key={i} className="w-12 h-12 bg-gray-900 border-4 border-gray-700 flex items-center justify-center text-gray-400">
            <Icon size={20} />
            <span className="absolute -bottom-1 -right-1 bg-blue-600 text-[8px] px-1 border border-white">L1</span>
          </div>
        ))}
      </div>

      {/* Game Canvas */}
      <canvas ref={canvasRef} className="block cursor-crosshair" />
    </div>
  );
}
