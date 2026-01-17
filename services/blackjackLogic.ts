import { Card, Rank, Suit, Hand, Action, GameRules } from '../types';

const VALUES: Record<Rank, number> = {
  [Rank.Two]: 2, [Rank.Three]: 3, [Rank.Four]: 4, [Rank.Five]: 5,
  [Rank.Six]: 6, [Rank.Seven]: 7, [Rank.Eight]: 8, [Rank.Nine]: 9,
  [Rank.Ten]: 10, [Rank.Jack]: 10, [Rank.Queen]: 10, [Rank.King]: 10,
  [Rank.Ace]: 11,
};

export const createDeck = (deckCount: number = 6): Card[] => {
  const deck: Card[] = [];
  const suits = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades];
  const ranks = Object.values(Rank);

  for (let i = 0; i < deckCount; i++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank, value: VALUES[rank] });
      }
    }
  }
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const calculateHandValue = (cards: Card[]): number => {
  let value = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.isHidden) continue;
    value += card.value;
    if (card.rank === Rank.Ace) aces += 1;
  }

  while (value > 21 && aces > 0) {
    value -= 10;
    aces -= 1;
  }
  return value;
};

export const isSoftHand = (cards: Card[]): boolean => {
  let value = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.isHidden) continue;
    value += card.value;
    if (card.rank === Rank.Ace) aces += 1;
  }
  // Soft hand: has an Ace that is being counted as 11
  // This means: value > 11 (at least one Ace as 11) but value <= 21 (not busted)
  // AND the minimum value (counting all Aces as 1) is less than the current value
  const minValue = value - (aces * 10);
  return aces > 0 && value <= 21 && minValue < value;
};

/**
 * Count the number of Aces currently being counted as 11 (usable Aces).
 * 
 * 核心不变式：
 * - total = 已经把必要的Ace从11降到1之后的最佳不爆点数
 * - usableAces = 当前仍按11计的Ace数量
 * - isSoft === (usableAces > 0)
 * 
 * 用例验证：
 * A,2 → total=13, usableAces=1 → Soft 13 ✓
 * A,A → total=12, usableAces=1 → Soft 12 ✓
 * A,A,2 → total=14, usableAces=1 → Soft 14 ✓
 * A,A,9 → total=21, usableAces=1 → Soft 21 ✓
 * A,A,9,9 → total=20, usableAces=0 → Hard 20 ✓
 */
export const countUsableAces = (cards: Card[]): number => {
  let total = 0;
  let aceCount = 0;

  // 步骤1：所有Ace按11计，其他牌按正常价值计
  for (const card of cards) {
    if (card.isHidden) continue;
    if (card.rank === Rank.Ace) {
      total += 11;
      aceCount += 1;
    } else {
      total += card.value;
    }
  }

  // 步骤2：当 total > 21 时，逐个将Ace从11转为1，直到 total <= 21
  let usableAces = aceCount;
  while (total > 21 && usableAces > 0) {
    total -= 10;      // 将一个Ace从11降到1
    usableAces -= 1;
  }

  return usableAces;
};

export const getHandType = (cards: Card[]): 'HARD' | 'SOFT' | 'PAIR' => {
  if (cards.length === 2 && cards[0].rank === cards[1].rank) return 'PAIR';
  
  const total = calculateHandValue(cards);
  let minVal = 0;
  for(const c of cards) minVal += (c.rank === Rank.Ace ? 1 : c.value);
  
  // If the calculated total is higher than the minimum possible sum, it means an Ace is being used as 11
  return (total !== minVal) ? 'SOFT' : 'HARD';
};

export const createHand = (bet: number = 0): Hand => ({
  cards: [],
  bet,
  isCompleted: false,
  isBusted: false,
  isBlackjack: false,
  hasDoubled: false,
  hasSurrendered: false,
  canSplit: false,
});

export const playDealerTurn = (deck: Card[], dealerHand: Hand, rules: GameRules): { updatedDeck: Card[], finalHand: Hand } => {
  const newHand = { ...dealerHand, cards: [...dealerHand.cards] };
  let currentDeck = [...deck];

  // Reveal hidden card if any
  newHand.cards.forEach(c => c.isHidden = false);

  let val = calculateHandValue(newHand.cards);
  let isSoft = isSoftHand(newHand.cards);

  // Dealer rules loop
  // Hit if < 17
  // If 17, check H17/S17 rule
  while (true) {
    val = calculateHandValue(newHand.cards);
    isSoft = isSoftHand(newHand.cards);

    if (val > 21) break; // Busted

    if (val < 17) {
      // Hit
      if (currentDeck.length === 0) currentDeck = shuffleDeck(createDeck(rules.deckCount)); // Reshuffle if needed, though rare in single hand logic
      const card = currentDeck.pop()!;
      newHand.cards.push(card);
      continue;
    }

    if (val === 17) {
      if (isSoft && rules.dealerHitSoft17) {
        // H17: Hit soft 17
        if (currentDeck.length === 0) currentDeck = shuffleDeck(createDeck(rules.deckCount));
        const card = currentDeck.pop()!;
        newHand.cards.push(card);
        continue;
      }
    }

    // Stand on 17 (Hard or S17) or > 17
    break;
  }

  // Mark as busted if over 21
  if (val > 21) {
    newHand.isBusted = true;
  }

  return { updatedDeck: currentDeck, finalHand: newHand };
};
