import { Action, Card, GameRules, Rank } from '../types';

// --- Types ---

export interface EVResult {
  action: Action;
  ev: number;
}

export interface DealerDist {
  17: number;
  18: number;
  19: number;
  20: number;
  21: number;
  bust: number;
  bj: number;
}

// --- Constants ---

// Infinite Deck Probabilities
// 2-9: 1/13 each
// 10, J, Q, K: 4/13 total
// A: 1/13
const PROB_CARD = (val: number): number => {
  if (val >= 2 && val <= 9) return 1 / 13;
  if (val === 10) return 4 / 13;
  if (val === 11) return 1 / 13;
  return 0;
};

// Memoization Caches
let dealerCache: Record<string, DealerDist> = {};
let playerCache: Record<string, number> = {};

export const clearEVCache = () => {
  dealerCache = {};
  playerCache = {};
};

// --- Dealer Distribution Logic ---

/**
 * Calculates the probability distribution of the dealer's final hand.
 * Uses usableAces (number of Aces counted as 11) for accurate state tracking.
 * 
 * 不变式：
 * - currentVal = 已经把必要的Ace从11降到1之后的最佳不爆点数
 * - usableAces = 当前仍按11计的Ace数量
 * - soft === (usableAces > 0)
 */
const getDealerOutcomeProbs = (
  currentVal: number,
  usableAces: number,
  rules: GameRules,
  isFirstCard: boolean = false
): DealerDist => {
  const cacheKey = `${currentVal}-${usableAces}-${rules.dealerHitSoft17 ? 'H17' : 'S17'}`;
  
  if (!isFirstCard && dealerCache[cacheKey]) return dealerCache[cacheKey];

  const dist: DealerDist = { 17: 0, 18: 0, 19: 0, 20: 0, 21: 0, bust: 0, bj: 0 };

  // Safety: Invalid state
  if (currentVal > 21) {
    dist.bust = 1.0;
    return dist;
  }

  // Dealer Standing Rules
  let mustHit = false;
  if (currentVal < 17) {
    mustHit = true;
  } else if (currentVal === 17) {
    // H17 rule: Hit Soft 17 (Soft = usableAces > 0)
    if (usableAces > 0 && rules.dealerHitSoft17) mustHit = true;
    else mustHit = false;
  } else {
    mustHit = false; // Stand on 18+
  }

  if (!mustHit) {
    // Dealer Stands
    if (currentVal === 21 && isFirstCard) dist.bj = 1.0;
    else (dist as any)[currentVal] = 1.0;
    return dist;
  }

  // Recursive Hit - Iterate cards 2-11
  const cardValues = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  for (const cardVal of cardValues) {
    const p = PROB_CARD(cardVal);
    
    // 加牌逻辑：遵循核心不变式
    let nextVal = currentVal + cardVal;
    let nextUsableAces = usableAces + (cardVal === 11 ? 1 : 0);

    // 调整：将Ace从11转为1，直到不爆
    while (nextVal > 21 && nextUsableAces > 0) {
      nextVal -= 10;
      nextUsableAces--;
    }

    const subDist = getDealerOutcomeProbs(nextVal, nextUsableAces, rules, false);

    // Accumulate probabilities
    dist[17] += p * subDist[17];
    dist[18] += p * subDist[18];
    dist[19] += p * subDist[19];
    dist[20] += p * subDist[20];
    dist[21] += p * subDist[21];
    dist.bust += p * subDist.bust;
    dist.bj += p * subDist.bj;
  }

  if (!isFirstCard) dealerCache[cacheKey] = dist;
  return dist;
};

// --- Player EV Logic ---

/**
 * Calculate EV of "Standing" against a specific dealer distribution
 */
const calculateStandEV = (playerTotal: number, dealerDist: DealerDist): number => {
  if (playerTotal > 21) return -1;

  let ev = 0;
  ev += dealerDist.bust * 1.0;

  for (let d = 17; d <= 21; d++) {
    const p = (dealerDist as any)[d];
    if (playerTotal > d) ev += p * 1.0;
    else if (playerTotal < d) ev += p * -1.0;
    else ev += p * 0.0; // Push
  }
  
  return ev;
};

/**
 * Recursive function to find the MAX EV for a given hand state.
 * Uses usableAces to properly track Ace flexibility across multiple Aces.
 * 
 * 不变式：
 * - total = 已经把必要的Ace从11降到1之后的最佳不爆点数
 * - usableAces = 当前仍按11计的Ace数量
 */
const calculateHandMaxEV = (
  total: number,
  usableAces: number,
  dealerDist: DealerDist,
  rules: GameRules
): number => {
  // Check Cache
  const cacheKey = `${total}-${usableAces}`;
  if (playerCache[cacheKey] !== undefined) return playerCache[cacheKey];

  if (total > 21) return -1; // Busted

  // 1. Stand EV
  const evStand = calculateStandEV(total, dealerDist);

  // 2. Hit EV - Sum(P(card) * MaxEV(newHand))
  let evHit = 0;
  const cardValues = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  
  for (const c of cardValues) {
    // 加牌逻辑：遵循核心不变式
    let nextTotal = total + c;
    let nextUsableAces = usableAces + (c === 11 ? 1 : 0);

    // 调整：将Ace从11转为1，直到不爆
    while (nextTotal > 21 && nextUsableAces > 0) {
      nextTotal -= 10;
      nextUsableAces--;
    }
    
    const nextEV = calculateHandMaxEV(nextTotal, nextUsableAces, dealerDist, rules);
    evHit += PROB_CARD(c) * nextEV;
  }

  const maxEV = Math.max(evStand, evHit);
  playerCache[cacheKey] = maxEV;
  return maxEV;
};

// --- Top Level Entry Point ---

/**
 * Calculate EV for all available actions.
 * @param playerHandTotal - Current hand total (13, 17, etc.)
 * @param usableAces - Number of Aces being counted as 11
 * @param isPair - Whether this is a pair situation
 * @param pairRank - The rank of the pair (if applicable)
 * @param dealerUpVal - Dealer's upcard value (2-11)
 * @param rules - Game rules
 */
export const calculateAllActionEVs = (
  playerHandTotal: number,
  usableAces: number,
  isPair: boolean,
  pairRank: Rank | null,
  dealerUpVal: number,
  rules: GameRules
): EVResult[] => {
  clearEVCache();

  // Dealer's initial usable Aces (Ace upcard = 1 usable Ace)
  const dealerInitialUsableAces = dealerUpVal === 11 ? 1 : 0;
  const dealerDist = getDealerOutcomeProbs(dealerUpVal, dealerInitialUsableAces, rules, true);

  const results: EVResult[] = [];

  // --- STAND ---
  results.push({
    action: Action.Stand,
    ev: calculateStandEV(playerHandTotal, dealerDist)
  });

  // --- HIT ---
  let evHit = 0;
  [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].forEach(c => {
    // 加牌逻辑：遵循核心不变式
    let nextTotal = playerHandTotal + c;
    let nextUsableAces = usableAces + (c === 11 ? 1 : 0);
    while (nextTotal > 21 && nextUsableAces > 0) {
      nextTotal -= 10;
      nextUsableAces--;
    }
    
    evHit += PROB_CARD(c) * calculateHandMaxEV(nextTotal, nextUsableAces, dealerDist, rules);
  });
  results.push({ action: Action.Hit, ev: evHit });

  // --- DOUBLE ---
  let evDouble = 0;
  [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].forEach(c => {
    // 加牌逻辑：遵循核心不变式
    let nextTotal = playerHandTotal + c;
    let nextUsableAces = usableAces + (c === 11 ? 1 : 0);
    while (nextTotal > 21 && nextUsableAces > 0) {
      nextTotal -= 10;
      nextUsableAces--;
    }
    
    // Double = 一张牌后强制Stand，收益乘以2
    evDouble += PROB_CARD(c) * calculateStandEV(nextTotal, dealerDist);
  });
  results.push({ action: Action.Double, ev: 2 * evDouble });

  // --- SURRENDER ---
  if (rules.surrender !== 'none') {
    results.push({ action: Action.Surrender, ev: -0.5 });
  }

  // --- SPLIT ---
  if (isPair && pairRank) {
    let singleHandEV = 0;
    
    let cardVal = 0;
    if (['J','Q','K','10'].includes(pairRank)) cardVal = 10;
    else if (pairRank === 'A') cardVal = 11;
    else cardVal = parseInt(pairRank);

    [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].forEach(c => {
      // 分裂后得到的手牌初始总值和可用Aces
      let nextTotal = cardVal + c;
      let nextUsableAces = (cardVal === 11 ? 1 : 0) + (c === 11 ? 1 : 0);
      
      // 调整：将Ace从11转为1，直到不爆
      while (nextTotal > 21 && nextUsableAces > 0) {
        nextTotal -= 10;
        nextUsableAces--;
      }
       
      if (pairRank === 'A' && !rules.doubleAfterSplit) {
        // 分裂Aces但DAS关闭：一张牌后强制Stand
        singleHandEV += PROB_CARD(c) * calculateStandEV(nextTotal, dealerDist);
      } else {
        // 分裂后的手牌可以继续优化操作（Hit/Stand/Double等）
        singleHandEV += PROB_CARD(c) * calculateHandMaxEV(nextTotal, nextUsableAces, dealerDist, rules);
      }
    });

    results.push({ action: Action.Split, ev: 2 * singleHandEV });
  }

  return results.sort((a, b) => b.ev - a.ev);
};

/**
 * Get the best action based on EV calculation.
 * This is the single source of truth for optimal action selection.
 * 
 * @param playerHandTotal - Current hand value (13, 17, etc.)
 * @param usableAces - Number of Aces being counted as 11
 * @param isPair - Whether this is a pair
 * @param pairRank - The rank of the pair (if applicable)
 * @param dealerUpVal - Dealer's upcard value (2-11)
 * @param rules - Game rules (H17, DAS, etc.)
 * @param trueCount - Reserved for future TC-based adjustments (currently unused)
 */
export const getBestActionFromEV = (
  playerHandTotal: number,
  usableAces: number,
  isPair: boolean,
  pairRank: Rank | null,
  dealerUpVal: number,
  rules: GameRules,
  trueCount: number = 0
): { bestAction: Action; allActions: EVResult[] } => {
  const allActions = calculateAllActionEVs(
    playerHandTotal,
    usableAces,
    isPair,
    pairRank,
    dealerUpVal,
    rules
  );
  
  const bestAction = allActions.length > 0 ? allActions[0].action : Action.Stand;
  
  return { bestAction, allActions };
};
