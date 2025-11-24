export interface WordDefinition {
  id: string;
  targets: string[]; // Acceptable spellings (e.g., ['grandfather', 'grandpa'])
  meaning: string; // The Chinese prompt
}

export interface GridItem {
  id: string;
  wordDef: WordDefinition;
  displayWord: string; // The specific English word shown (e.g., 'grandpa')
  state: 'idle' | 'correct' | 'wrong' | 'spawning';
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

export interface GameReport {
  score: number;
  masteredWords: string[];
  missedWords: string[];
  aiMessage?: string;
  aiTips?: string[];
}