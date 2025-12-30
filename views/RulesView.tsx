import React from 'react';
import { GameRules, ViewMode } from '../types';
import RuleToggle from '../components/ui/RuleToggle';

interface RulesViewProps {
  rules: GameRules;
  setRules: (rules: GameRules) => void;
}

const RulesView: React.FC<RulesViewProps> = ({ rules, setRules }) => {
  // 默认规则常量
  const DEFAULT_RULES: GameRules = {
    deckCount: 6,
    dealerHitSoft17: true,
    doubleAfterSplit: true,
    surrender: 'late',
    blackjackPayout: 1.5,
  };

  const handleResetToDefault = () => {
    setRules(DEFAULT_RULES);
  };
  return (
    <div className="space-y-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-white mb-4">Table Rules</h2>
      
      <div className="bg-gray-800 p-6 rounded-lg space-y-4 shadow-lg border border-gray-700">
        <RuleToggle 
          label="Dealer Hits Soft 17" 
          value={rules.dealerHitSoft17} 
          onChange={(v) => setRules({...rules, dealerHitSoft17: v})} 
        />
        <RuleToggle 
          label="Double After Split" 
          value={rules.doubleAfterSplit} 
          onChange={(v) => setRules({...rules, doubleAfterSplit: v})} 
        />
        <div className="flex justify-between items-center">
            <label className="text-gray-300">Surrender</label>
            <select 
                className="bg-gray-700 text-white rounded p-2"
                value={rules.surrender}
                onChange={(e) => setRules({...rules, surrender: e.target.value})}
            >
                <option value="none">None</option>
                <option value="late">Late</option>
                <option value="early">Early</option>
            </select>
        </div>
        <div className="flex justify-between items-center">
            <label className="text-gray-300">Decks</label>
            <select 
                className="bg-gray-700 text-white rounded p-2"
                value={rules.deckCount}
                onChange={(e) => setRules({...rules, deckCount: parseInt(e.target.value)})}
            >
                <option value={1}>1 Deck</option>
                <option value={2}>2 Decks</option>
                <option value={6}>6 Decks</option>
                <option value={8}>8 Decks</option>
            </select>
        </div>
      </div>

      <button 
        onClick={handleResetToDefault} 
        className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg shadow-lg transition duration-150"
      >
        Reset to Default
      </button>
    </div>
  );
};

export default RulesView;
