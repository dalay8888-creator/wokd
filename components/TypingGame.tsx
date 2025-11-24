import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GAME_CONSTANTS } from '../constants';
import { GridItem, WordDefinition, Particle } from '../types';
import { Target, Heart } from 'lucide-react';

interface TypingGameProps {
  vocabList: WordDefinition[];
  onGameOver: (score: number, mastered: string[], missed: string[]) => void;
}

export const TypingGame: React.FC<TypingGameProps> = ({ vocabList, onGameOver }) => {
  // Game State
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const [targetDef, setTargetDef] = useState<WordDefinition | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(GAME_CONSTANTS.LIVES);
  const [timeLeft, setTimeLeft] = useState(GAME_CONSTANTS.GAME_DURATION_SEC);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Stats for Report
  const masteredRef = useRef<Set<string>>(new Set());
  const missedRef = useRef<Set<string>>(new Set());
  
  // Animation Loop Ref
  const requestRef = useRef<number>();
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---

  // Audio Helper
  const playAudio = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel current speech to avoid overlap when clicking fast
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; // English US
      utterance.rate = 0.9; // Slightly slower for clarity
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // Get a random word from the provided list
  const getRandomWord = useCallback(() => {
    if (vocabList.length === 0) return null;
    return vocabList[Math.floor(Math.random() * vocabList.length)];
  }, [vocabList]);

  // Get a random display spelling for a word definition
  const getDisplayWord = (def: WordDefinition) => 
    def.targets[Math.floor(Math.random() * def.targets.length)];

  // Initialize Grid
  useEffect(() => {
    if (vocabList.length === 0) return;

    const initialItems: GridItem[] = [];
    const usedIds = new Set<string>();

    // Fill grid with unique words initially if possible
    while (initialItems.length < GAME_CONSTANTS.GRID_SIZE) {
      const def = vocabList[Math.floor(Math.random() * vocabList.length)];
      // Try to avoid duplicates in initial grid, but allow if list is small
      if (!usedIds.has(def.id) || usedIds.size >= vocabList.length) {
        usedIds.add(def.id);
        initialItems.push({
          id: Math.random().toString(36).substr(2, 9),
          wordDef: def,
          displayWord: getDisplayWord(def),
          state: 'spawning'
        });
      }
    }
    setGridItems(initialItems);
    
    // Pick first target
    const randomItem = initialItems[Math.floor(Math.random() * initialItems.length)];
    if (randomItem) {
      setTargetDef(randomItem.wordDef);
    }

    // Reset spawning state after animation
    setTimeout(() => {
      setGridItems(prev => prev.map(item => ({ ...item, state: 'idle' })));
    }, 500);

  }, [vocabList]);

  // --- Game Mechanics ---

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 || lives <= 0) {
      onGameOver(score, Array.from(masteredRef.current), Array.from(missedRef.current));
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, lives, onGameOver, score]);

  // Particle System Loop
  const updateParticles = useCallback(() => {
    setParticles(prev => 
      prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.05
        }))
        .filter(p => p.life > 0)
    );
    requestRef.current = requestAnimationFrame(updateParticles);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateParticles);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [updateParticles]);

  const createExplosion = (rect: DOMRect, color: string) => {
    if (!gameContainerRef.current) return;
    const containerRect = gameContainerRef.current.getBoundingClientRect();
    const x = ((rect.left + rect.width / 2) - containerRect.left) / containerRect.width * 100;
    const y = ((rect.top + rect.height / 2) - containerRect.top) / containerRect.height * 100;

    const newParticles: Particle[] = [];
    for (let i = 0; i < 20; i++) {
      newParticles.push({
        id: Math.random(),
        x,
        y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color,
        life: 1.0
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  // Click Handler
  const handleItemClick = (item: GridItem, e: React.MouseEvent) => {
    // 1. Play Pronunciation immediately on click
    playAudio(item.displayWord);

    // 2. Validate Game Logic
    if (item.state !== 'idle' || !targetDef) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();

    if (item.wordDef.id === targetDef.id) {
      // CORRECT
      setScore(s => s + 100);
      masteredRef.current.add(item.displayWord);
      createExplosion(rect, '#22c55e'); // Green

      // Mark item as correct (animation)
      setGridItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, state: 'correct' } : i
      ));

      // Wait for animation, then replace item and pick new target
      setTimeout(() => {
        setGridItems(prevItems => {
          // Replace the clicked item
          const newDef = getRandomWord();
          if (!newDef) return prevItems;

          const newItem: GridItem = {
            id: Math.random().toString(36).substr(2, 9),
            wordDef: newDef,
            displayWord: getDisplayWord(newDef),
            state: 'spawning'
          };
          
          const newGrid = prevItems.map(i => i.id === item.id ? newItem : i);
          
          // Pick new target from the NEW grid
          const availableDefs = newGrid.map(i => i.wordDef);
          const nextTarget = availableDefs[Math.floor(Math.random() * availableDefs.length)];
          setTargetDef(nextTarget);

          return newGrid;
        });
        
        // Reset the spawning state shortly after
        setTimeout(() => {
          setGridItems(prev => prev.map(i => i.state === 'spawning' ? { ...i, state: 'idle' } : i));
        }, 300);

      }, 300); // Wait for shrink animation

    } else {
      // WRONG
      setLives(l => l - 1);
      missedRef.current.add(targetDef.targets[0]); // Missed the target word
      createExplosion(rect, '#ef4444'); // Red

      setGridItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, state: 'wrong' } : i
      ));

      // Reset state after shake
      setTimeout(() => {
        setGridItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, state: 'idle' } : i
        ));
      }, 500);
    }
  };

  if (vocabList.length < 4) {
    return (
      <div className="flex items-center justify-center h-full text-white text-center p-8">
        <div>
          <h2 className="text-2xl font-bold text-neon-red mb-4">Not enough words!</h2>
          <p>Please import at least 4 words to start the game.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={gameContainerRef}
      className="relative w-full h-full bg-space-900 flex flex-col items-center justify-between p-4 overflow-hidden"
    >
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ 
             backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }}>
      </div>

      {/* Header / HUD */}
      <div className="w-full max-w-4xl flex items-center justify-between bg-space-800/80 p-4 rounded-xl border border-slate-700 shadow-lg z-10">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 text-neon-blue">
             <Target className="w-6 h-6" />
             <span className="font-arcade text-lg">{score}</span>
           </div>
           <div className="flex items-center gap-2 text-neon-red">
             <Heart className="w-6 h-6 fill-current" />
             <span className="font-arcade text-lg">{lives}</span>
           </div>
        </div>
        
        <div className="text-slate-400 font-mono text-sm md:text-base">
           TIME: <span className={`${timeLeft < 10 ? 'text-neon-red animate-pulse' : 'text-white'}`}>{timeLeft}s</span>
        </div>
      </div>

      {/* Target Display (The "Mission") */}
      <div className="flex flex-col items-center justify-center my-4 z-10 animate-pulse-fast">
        <span className="text-slate-400 text-xs tracking-widest uppercase mb-1">Current Mission</span>
        <h2 className="text-4xl md:text-6xl text-white font-bold drop-shadow-[0_0_15px_rgba(34,197,94,0.8)] text-center">
          {targetDef?.meaning}
        </h2>
      </div>

      {/* The Grid */}
      <div className="flex-1 w-full max-w-2xl flex items-center justify-center z-10">
        <div className="grid grid-cols-3 gap-3 md:gap-6 w-full aspect-square md:aspect-auto md:h-auto">
          {gridItems.map((item) => (
            <button
              key={item.id}
              onClick={(e) => handleItemClick(item, e)}
              disabled={item.state !== 'idle'}
              className={`
                relative group flex items-center justify-center p-2 rounded-2xl border-2 shadow-2xl transition-all duration-300
                ${item.state === 'idle' ? 'bg-space-800 border-slate-600 hover:border-neon-blue hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:-translate-y-1' : ''}
                ${item.state === 'correct' ? 'bg-neon-green border-neon-green scale-0 opacity-0' : ''}
                ${item.state === 'wrong' ? 'bg-red-900/50 border-neon-red animate-[shake_0.5s_ease-in-out]' : ''}
                ${item.state === 'spawning' ? 'scale-0 opacity-0 animate-[popIn_0.3s_ease-out_forwards]' : ''}
              `}
              style={{ minHeight: '80px' }}
            >
              {/* Card visual details */}
              <div className={`absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity`}></div>
              
              <span className={`
                text-lg md:text-3xl font-bold tracking-wide font-mono break-words text-center
                ${item.state === 'idle' ? 'text-slate-100 group-hover:text-neon-blue' : 'text-white'}
              `}>
                {/* Display Lowercase directly */}
                {item.displayWord}
              </span>

              {/* Decorative corners */}
              <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-slate-600 group-hover:border-neon-blue transition-colors"></div>
              <div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-slate-600 group-hover:border-neon-blue transition-colors"></div>
            </button>
          ))}
        </div>
      </div>

      {/* Particles Layer */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none z-20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: '8px',
            height: '8px',
            backgroundColor: p.color,
            opacity: p.life,
            transform: `scale(${p.life})`
          }}
        />
      ))}

      {/* Styles for custom animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px) rotate(-5deg); }
          75% { transform: translateX(5px) rotate(5deg); }
        }
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};