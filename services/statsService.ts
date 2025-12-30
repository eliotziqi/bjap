import { PlayerStats, StatEntry } from "../types";

const STATS_KEY = 'bj_trainer_stats';

const initialStats: PlayerStats = {
  hard: {},
  soft: {},
  pairs: {},
  heatmap: {},
  streak: 0,
  maxStreak: 0,
  streakMilestones: [],
};

export const loadStats = (): PlayerStats => {
  try {
    const data = localStorage.getItem(STATS_KEY);
    if (!data) return initialStats;
    
    const parsed = JSON.parse(data);
    
    // 数据迁移：确保新字段存在
    return {
      hard: parsed.hard || {},
      soft: parsed.soft || {},
      pairs: parsed.pairs || {},
      heatmap: parsed.heatmap || {},
      streak: parsed.streak || 0,
      maxStreak: parsed.maxStreak || 0,
      streakMilestones: parsed.streakMilestones || [],
    };
  } catch (e) {
    return initialStats;
  }
};

export const saveStats = (stats: PlayerStats) => {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
};

export const recordPracticeResult = (
  key: string,
  category: 'hard' | 'soft' | 'pairs',
  isCorrect: boolean
) => {
  const stats = loadStats();
  
  // Update Matrix Stats
  const entry = stats[category][key] || { correct: 0, total: 0 };
  entry.total += 1;
  if (isCorrect) entry.correct += 1;
  stats[category][key] = entry;

  // Update Streak
  stats.streak = isCorrect ? stats.streak + 1 : 0;
  
  // Update maxStreak
  if (stats.streak > stats.maxStreak) {
    stats.maxStreak = stats.streak;
  }
  
  // Check for milestones (10, 25, 50, 100, 150, ...)
  const milestones = [10, 25, 50, 100, 150, 200, 250, 300];
  if (milestones.includes(stats.streak) && !stats.streakMilestones.includes(stats.streak)) {
    stats.streakMilestones.push(stats.streak);
    stats.streakMilestones.sort((a, b) => a - b);
  }

  // Update Heatmap
  const today = new Date().toISOString().split('T')[0];
  stats.heatmap[today] = (stats.heatmap[today] || 0) + 1;

  saveStats(stats);
  return stats; // return updated stats
};

export const clearStats = () => {
    localStorage.removeItem(STATS_KEY);
    return initialStats;
}
