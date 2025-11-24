import React, { useState } from 'react';
import { TypingGame } from './components/TypingGame';
import { generateGameReport } from './services/geminiService';
import { GameReport, WordDefinition } from './types';
import { VOCAB_LIST } from './constants';
import { Rocket, Play, RefreshCw, Trophy, BookOpen, AlertCircle, Zap, MousePointer2, Edit, Save, ArrowLeft } from 'lucide-react';

enum AppState {
  MENU,
  IMPORT,
  PLAYING,
  SUMMARY
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.MENU);
  const [report, setReport] = useState<GameReport | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [vocabList, setVocabList] = useState<WordDefinition[]>(VOCAB_LIST);
  const [importText, setImportText] = useState('');

  // --- Helper: Convert List to Text for Editing ---
  const formatListToText = (list: WordDefinition[]) => {
    return list.map(item => {
      const main = item.targets[0];
      const alias = item.targets.length > 1 ? ` (${item.targets[1]})` : '';
      return `• ${main}${alias}：${item.meaning}`;
    }).join('\n');
  };

  // --- Helper: Parse Text to List ---
  const parseInput = (text: string): WordDefinition[] => {
    const lines = text.split('\n');
    const newVocab: WordDefinition[] = [];

    lines.forEach((line, index) => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      // 1. Remove starting bullets/dots/stars
      // Removes •, -, *, and whitespace from start
      const content = cleanLine.replace(/^[\s•\-\*]+/, '');

      // 2. Find separator (Chinese or English colon)
      const separatorMatch = content.match(/[:：]/);
      if (!separatorMatch) return; // Skip if no separator

      const separatorIndex = separatorMatch.index!;
      const englishPart = content.substring(0, separatorIndex).trim();
      const meaning = content.substring(separatorIndex + 1).trim();

      if (!englishPart || !meaning) return;

      // 3. Parse English part for aliases in ()
      // e.g. "grandfather (grandpa)"
      const targets: string[] = [];
      
      const parenMatch = englishPart.match(/^([^(]+)\s*\(([^)]+)\)$/);
      if (parenMatch) {
        targets.push(parenMatch[1].trim().toLowerCase());
        targets.push(parenMatch[2].trim().toLowerCase());
      } else {
        targets.push(englishPart.toLowerCase());
      }

      newVocab.push({
        id: `custom-${index}-${Date.now()}`,
        targets: targets,
        meaning: meaning
      });
    });

    return newVocab;
  };

  const handleOpenImport = () => {
    setImportText(formatListToText(vocabList));
    setAppState(AppState.IMPORT);
  };

  const handleSaveImport = () => {
    const parsed = parseInput(importText);
    if (parsed.length < 4) {
      alert("Please enter at least 4 valid word definitions to play!");
      return;
    }
    setVocabList(parsed);
    setAppState(AppState.MENU);
  };

  // --- Components ---

  const MenuScreen = () => (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 px-4 relative z-20 overflow-y-auto py-10">
      <div className="space-y-2">
        <h1 className="text-4xl md:text-6xl font-arcade text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink drop-shadow-lg">
          VOCAB BLASTER
        </h1>
        <h2 className="text-xl md:text-2xl text-neon-green font-mono">
          FAMILY EDITION
        </h2>
      </div>

      <div className="p-6 bg-space-800/80 backdrop-blur border border-slate-600 rounded-xl max-w-lg w-full shadow-2xl">
        <h3 className="text-lg text-slate-300 mb-4 flex items-center justify-center gap-2">
          <BookOpen className="w-5 h-5 text-neon-blue" />
          MISSION BRIEFING
        </h3>
        <ul className="text-left text-sm md:text-base space-y-3 text-slate-400 font-mono">
          <li className="flex gap-2 items-center">
            <span className="text-neon-pink">►</span> 
            Read the <strong className="text-white">Mission (Chinese)</strong> at the top.
          </li>
          <li className="flex gap-2 items-center">
            <span className="text-neon-pink">►</span> 
            Find the matching <strong className="text-white">English Word</strong> in the grid.
          </li>
          <li className="flex gap-2 items-center">
            <span className="text-neon-pink">►</span> 
            <MousePointer2 className="w-4 h-4 text-neon-blue" /> 
            <strong className="text-white">CLICK</strong> the card to eliminate it!
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button 
          onClick={() => setAppState(AppState.PLAYING)}
          className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-neon-blue font-arcade rounded-lg hover:bg-blue-600 focus:outline-none ring-offset-2 focus:ring-2 ring-neon-blue"
        >
          <span className="absolute w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
          <span className="relative flex items-center gap-3">
            START MISSION <Play className="w-5 h-5 fill-current" />
          </span>
        </button>

        <button 
          onClick={handleOpenImport}
          className="group relative inline-flex items-center justify-center px-8 py-3 font-bold text-slate-300 transition-all duration-200 bg-slate-800 font-arcade rounded-lg hover:bg-slate-700 hover:text-white border border-slate-600"
        >
          <span className="relative flex items-center gap-3">
            EDIT WORDS <Edit className="w-4 h-4" />
          </span>
        </button>
      </div>

      <div className="mt-4 text-slate-500 font-mono text-xs">
        Current Vocabulary Size: <span className="text-neon-green">{vocabList.length}</span> words
      </div>
    </div>
  );

  const ImportScreen = () => (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8 relative z-20">
      <div className="w-full max-w-3xl flex-1 flex flex-col bg-space-800/95 border border-slate-600 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-space-900/50">
          <div className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-neon-pink" />
            <h2 className="text-xl font-bold text-white font-arcade">EDIT VOCABULARY</h2>
          </div>
          <button onClick={() => setAppState(AppState.MENU)} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col gap-2">
           <p className="text-slate-400 text-sm font-mono">
             Paste your words below. Format: <span className="text-neon-blue">• English (Alias)：Chinese Meaning</span>
           </p>
           <textarea 
             value={importText}
             onChange={(e) => setImportText(e.target.value)}
             className="flex-1 w-full bg-space-900 text-slate-200 font-mono text-sm p-4 rounded-lg border border-slate-700 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue resize-none outline-none leading-relaxed"
             placeholder="• apple : 苹果&#10;• banana : 香蕉"
             spellCheck={false}
           />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-space-900/50 flex justify-between items-center">
          <button 
             onClick={() => setImportText(formatListToText(VOCAB_LIST))}
             className="text-xs text-slate-500 hover:text-neon-blue underline"
          >
            Reset to Defaults
          </button>
          <button 
            onClick={handleSaveImport}
            className="flex items-center gap-2 px-6 py-2 bg-neon-green hover:bg-green-600 text-black font-bold rounded-lg transition-all"
          >
            <Save className="w-4 h-4" /> SAVE & CLOSE
          </button>
        </div>
      </div>
    </div>
  );

  const SummaryScreen = () => (
    <div className="flex flex-col items-center justify-center h-full px-4 overflow-y-auto py-10 relative z-20">
      <div className="w-full max-w-2xl bg-space-800/90 border-2 border-slate-700 rounded-2xl p-6 md:p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-arcade text-white mb-2">MISSION REPORT</h2>
          <div className="inline-flex items-center gap-3 bg-space-900 px-6 py-2 rounded-full border border-neon-blue">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <span className="text-xl font-bold text-white">SCORE: {report?.score || 0}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-space-900/50 p-4 rounded-lg border border-green-500/30">
            <h3 className="text-green-400 font-bold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              MASTERED ({report?.masteredWords.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {report?.masteredWords.length === 0 && <span className="text-slate-500 text-sm">None yet!</span>}
              {report?.masteredWords.map((w, i) => (
                <span key={i} className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded border border-green-500/50">
                  {w}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-space-900/50 p-4 rounded-lg border border-red-500/30">
            <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              MISSED ({report?.missedWords.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {report?.missedWords.length === 0 && <span className="text-slate-500 text-sm">Perfect run!</span>}
              {report?.missedWords.map((w, i) => (
                <span key={i} className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded border border-red-500/50">
                  {w}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* AI Section */}
        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-6 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <Rocket className="w-24 h-24 text-indigo-500" />
          </div>
          
          <h3 className="text-indigo-300 font-bold mb-4 flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-yellow-400" /> 
            AI COACH ANALYSIS
          </h3>

          {loadingAI ? (
            <div className="flex flex-col items-center py-8 space-y-3">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-indigo-300 text-sm animate-pulse">Contacting Gemini Headquarters...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-space-900/80 p-4 rounded-lg border-l-4 border-yellow-400">
                <p className="text-slate-200 italic font-serif text-lg leading-relaxed">
                  "{report?.aiMessage}"
                </p>
              </div>
              
              {report?.aiTips && report.aiTips.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Improvement Tips</p>
                  <ul className="space-y-2">
                    {report.aiTips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                        <AlertCircle className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button 
            onClick={() => setAppState(AppState.MENU)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors"
          >
            <RefreshCw className="w-5 h-5" /> PLAY AGAIN
          </button>
        </div>

      </div>
    </div>
  );

  const handleGameOver = async (score: number, mastered: string[], missed: string[]) => {
    setReport({ score, masteredWords: mastered, missedWords: missed });
    setAppState(AppState.SUMMARY);
    setLoadingAI(true);

    // Call Gemini
    const aiData = await generateGameReport(mastered, missed);
    
    setReport(prev => prev ? ({
      ...prev,
      aiMessage: aiData.story,
      aiTips: aiData.tips
    }) : null);
    
    setLoadingAI(false);
  };

  return (
    <div className="w-full h-screen bg-space-900 text-white overflow-hidden font-sans relative">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-space-800 via-space-900 to-black"></div>
      </div>

      <div className="relative z-10 w-full h-full">
        {appState === AppState.MENU && <MenuScreen />}
        {appState === AppState.IMPORT && <ImportScreen />}
        {appState === AppState.PLAYING && <TypingGame vocabList={vocabList} onGameOver={handleGameOver} />}
        {appState === AppState.SUMMARY && <SummaryScreen />}
      </div>
    </div>
  );
};

export default App;