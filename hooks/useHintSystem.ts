import { useState, useEffect } from 'react';
import { Action, Hand } from '../types';
import { GameRules } from '../types';
import { getBasicStrategyAction } from '../services/strategyEngine';

export const useHintSystem = (
  gameState: number,
  hintsEnabled: boolean,
  playerHands: Hand[],
  activeHandIndex: number,
  dealerHand: Hand,
  rules: GameRules,
  getAllowedActions: () => Action[]
) => {
  const [hintAction, setHintAction] = useState<Action | null>(null);
  const [hasUsedHints, setHasUsedHints] = useState(false);

  useEffect(() => {
    if (gameState === 3 && hintsEnabled) {
      // 3 = SimState.PlayerTurn
      const currentHand = playerHands[activeHandIndex];
      const dealerUp = dealerHand.cards[0];
      if (!currentHand || !dealerUp) {
        setHintAction(null);
        return;
      }
      const action = getBasicStrategyAction(currentHand, dealerUp, rules);
      const allowedActions = getAllowedActions();

      // 只有当建议的动作在允许的动作列表中时才显示提示
      // 这样可以避免在玩家已经hit后还建议double的情况
      if (allowedActions.includes(action)) {
        setHintAction(action);
      } else {
        // 如果建议的动作不允许，回退到基本动作（Hit或Stand）
        if (allowedActions.includes(Action.Stand)) {
          setHintAction(Action.Stand);
        } else if (allowedActions.includes(Action.Hit)) {
          setHintAction(Action.Hit);
        } else {
          setHintAction(allowedActions[0] || null);
        }
      }
      setHasUsedHints(true);
    } else {
      setHintAction(null);
    }
  }, [gameState, activeHandIndex, hintsEnabled, playerHands, dealerHand, rules, getAllowedActions]);

  return {
    hintAction,
    hasUsedHints,
    setHintAction,
    setHasUsedHints,
  };
};
