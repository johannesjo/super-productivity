/**
 * Utility functions for calculating productivity and sustainability metrics.
 * v2.1 - Low-friction model that prioritizes total focused time over session logging.
 * Includes robust fallbacks and heuristics for missing data.
 */

/**
 * Helper: Clamps a value between specified bounds (default 0-1).
 * @param value - Value to clamp
 * @param min - Minimum bound (default 0)
 * @param max - Maximum bound (default 1)
 * @returns Clamped value between min and max
 */
const clamp = (value: number, min: number = 0, max: number = 1): number =>
  Math.max(min, Math.min(max, value));

/**
 * Helper: Soft-cap function that provides diminishing returns above target.
 * Uses exponential decay: 1 - exp(-k * clamp(x))
 * @param x - Input value (typically a ratio like focusedMinutes/targetMinutes)
 * @param k - Decay constant (default 2.2 for balanced diminishing returns)
 * @returns Soft-capped value between 0 and ~1
 */
const softCap = (x: number, k: number = 2.2): number => {
  return 1 - Math.exp(-k * clamp(x));
};

/**
 * Helper: Safe division with fallback for zero denominator.
 * @param numerator - Value to divide
 * @param denominator - Value to divide by
 * @param fallback - Value to return if denominator is zero (default 0)
 * @returns Result of division or fallback
 */
const safeDiv = (numerator: number, denominator: number, fallback: number = 0): number =>
  denominator > 0 ? numerator / denominator : fallback;

/**
 * Calculates a productivity score (0-100) with impact rating as the primary driver.
 *
 * v2.4 - Impact-driven model (mandatory daily reflection):
 * - 45% Impact Rating: User's assessment of work value/significance (1-5, required)
 * - 35% Focus Density: Portion of total work time spent in focused work
 * - 20% Target Progress: Progress toward deep work goal (soft-capped for diminishing returns)
 *
 * Making impact rating mandatory ensures users reflect on work value, not just time spent.
 * This prevents "busywork scoring high" and emphasizes meaningful output.
 *
 * @param impactRating - User's assessment of work impact (1-5 scale, REQUIRED)
 * @param focusedMinutes - Total focused time for the day (in minutes)
 * @param totalWorkMinutes - Total work time including meetings, emails, etc. (in minutes)
 * @param targetFocusedMinutes - Target deep work goal (in minutes, default 240 = 4 hours)
 * @param completedTasks - Number of tasks completed (optional, currently unused but kept for future)
 * @param plannedTasks - Number of tasks planned (optional, currently unused but kept for future)
 * @returns Productivity score from 0-100
 *
 * @example
 * // High impact, good focus, met target = excellent score
 * calculateProductivityScore(5, 240, 360, 240) // Returns ~85-90
 *
 * @example
 * // Medium impact, typical day
 * calculateProductivityScore(3, 180, 360, 240) // Returns ~55-60
 *
 * @example
 * // Low impact despite good focus = moderate score
 * calculateProductivityScore(2, 240, 360, 240) // Returns ~50-55
 */
export const calculateProductivityScore = (
  impactRating: number,
  focusedMinutes: number,
  totalWorkMinutes: number,
  targetFocusedMinutes: number = 240,
  completedTasks?: number,
  plannedTasks?: number,
): number => {
  // Impact: User's reflection on work value (1-5 scale normalized to 0-1)
  const impact = clamp(impactRating / 5);

  // Focus Density: What portion of work time was focused
  const density = clamp(safeDiv(focusedMinutes, Math.max(totalWorkMinutes, 1), 0));

  // Progress to Target (soft-capped for diminishing returns beyond goal)
  const progressRatio = safeDiv(focusedMinutes, targetFocusedMinutes, 0);
  const targetProgress = softCap(progressRatio);

  // Optional: Task completion (currently not weighted, but available for future use)
  // const completion = completedTasks != null && plannedTasks != null
  //   ? clamp(safeDiv(completedTasks, Math.max(plannedTasks, 1), 0))
  //   : density;

  // Weighted components (0.45 + 0.35 + 0.20 = 1.0)
  const impactComponent = impact * 0.45;
  const densityComponent = density * 0.35;
  const progressComponent = targetProgress * 0.2;

  const score = impactComponent + densityComponent + progressComponent;

  // Scale to 0-100 range
  return Math.round(score * 100);
};

/**
 * Calculates a sustainability score (0-100) to assess work-life balance and burnout risk.
 *
 * v2.3 - Balance model with inverted-V focus curve:
 * - 45% Freshness: Energy levels from check-in or exhaustion (inverted)
 * - 40% Workload: Linear penalty for long days (10h → score 0)
 * - 15% Focus Balance: Inverted-V curve - optimal at 4h, penalizes excessive focus
 *
 * The focus balance curve rewards building up to 4h of focused work, but then
 * penalizes going beyond 4h as a sustainability risk (even if productive short-term).
 * This prevents burnout from excessive deep work sessions.
 *
 * Calibration target: 7h total work, 4h focus, medium energy → score ≈50
 *
 * @param focusedMinutes - Total focused time for the day (in minutes)
 * @param totalWorkMinutes - Total work time including meetings, emails, etc. (in minutes)
 * @param workloadLinearZeroAt - Minutes at which workload score becomes 0 (default 600 = 10h)
 * @param energyCheckin - Simple energy check-in (1=exhausted, 2=ok, 3=good) - optional
 * @param exhaustion - Detailed exhaustion level (1-5 scale, higher = more exhausted) - optional
 * @returns Sustainability score from 0-100
 *
 * @example
 * // Target case: 7h work, 4h focus, medium energy = ~50
 * calculateSustainabilityScore(240, 420, 600, 2) // Returns ~50
 *
 * @example
 * // Excessive focus (5h): penalty vs 4h
 * calculateSustainabilityScore(300, 420, 600, 2) // Returns ~46 (lower than 4h)
 *
 * @example
 * // Good energy, reasonable hours, optimal focus = high score
 * calculateSustainabilityScore(240, 420, 600, 3) // Returns ~72
 */
export const calculateSustainabilityScore = (
  focusedMinutes: number,
  totalWorkMinutes: number,
  workloadLinearZeroAt: number = 600,
  energyCheckin?: number,
  exhaustion?: number,
): number => {
  // Freshness: Energy level normalized to 0-1
  // Priority: energyCheckin (simpler) > exhaustion (detailed) > 0.5 (neutral fallback)
  let freshness = 0.5; // Default neutral
  if (energyCheckin !== undefined) {
    // energyCheckin: 1=exhausted, 2=ok, 3=good → (value-1)/2 → 0, 0.5, 1
    freshness = (energyCheckin - 1) / 2;
  } else if (exhaustion !== undefined) {
    // exhaustion: 1-5 (higher = worse) → invert to 0-1
    const exhaustionNorm = exhaustion / 5;
    freshness = 1 - exhaustionNorm;
  }

  // Workload: Linear penalty - 0h = 1.0, workloadLinearZeroAt (default 10h) = 0.0
  const workloadRatio = totalWorkMinutes / workloadLinearZeroAt;
  const workloadScore = clamp(1 - workloadRatio, 0, 1);

  // Focus Balance: Inverted-V curve with peak at 4h (240 min)
  // Up to 4h: linear increase rewards building focus
  // Beyond 4h: linear decrease penalizes excessive deep work
  let focusBalance: number;
  if (focusedMinutes <= 240) {
    // Building up to optimal: 0h=0, 4h=1
    focusBalance = clamp(focusedMinutes / 240);
  } else {
    // Beyond optimal: 4h=1, 8h=0 (linear penalty for too much focus)
    const excess = focusedMinutes - 240;
    const excessRatio = excess / 240;
    focusBalance = clamp(1 - excessRatio);
  }

  // Weighted components (0.45 + 0.40 + 0.15 = 1.0)
  const freshnessComponent = freshness * 0.45;
  const workloadComponent = workloadScore * 0.4;
  const focusBalanceComponent = focusBalance * 0.15;

  const score = freshnessComponent + workloadComponent + focusBalanceComponent;

  // Scale to 0-100 range
  return Math.round(score * 100);
};

/**
 * Determines the overall daily state based on productivity and sustainability scores.
 *
 * Uses a quadrant system with 50 as the threshold for both dimensions:
 * - DEEP_FLOW: High productivity + High sustainability (ideal state)
 * - OVERDRIVE: High productivity + Low sustainability (burnout risk)
 * - RECOVERY: Low productivity + High sustainability (rest/recharge)
 * - DRIFT: Low productivity + Low sustainability (attention needed)
 *
 * @param productivityScore - Productivity score (0-100)
 * @param sustainabilityScore - Sustainability score (0-100)
 * @param threshold - Threshold for high/low classification (default 50)
 * @returns Daily state classification
 */
export type DailyState = 'DEEP_FLOW' | 'OVERDRIVE' | 'RECOVERY' | 'DRIFT';

export const calculateDailyState = (
  productivityScore: number,
  sustainabilityScore: number,
  threshold: number = 50,
): DailyState => {
  const isProductivityHigh = productivityScore >= threshold;
  const isSustainabilityHigh = sustainabilityScore >= threshold;

  if (isProductivityHigh && isSustainabilityHigh) {
    return 'DEEP_FLOW'; // Sweet spot: productive and sustainable
  } else if (isProductivityHigh && !isSustainabilityHigh) {
    return 'OVERDRIVE'; // Warning: productive but burning out
  } else if (!isProductivityHigh && isSustainabilityHigh) {
    return 'RECOVERY'; // Rest phase: sustainable but low output
  } else {
    return 'DRIFT'; // Alert: neither productive nor sustainable
  }
};

/**
 * Generates a color gradient (red to green) based on a score value.
 *
 * Provides visual feedback on score quality:
 * - 0-33: Red (poor)
 * - 34-66: Yellow/Orange (moderate)
 * - 67-100: Green (excellent)
 *
 * @param score - Score value (0-100)
 * @returns CSS gradient string using HSL color space
 *
 * @example
 * getScoreColorGradient(25) // Red gradient
 * getScoreColorGradient(50) // Yellow gradient
 * getScoreColorGradient(85) // Green gradient
 */
export const getScoreColorGradient = (score: number): string => {
  // Convert score (0-100) to hue (0° = red, 60° = yellow, 120° = green)
  const hue = (score / 100) * 120;
  // Return gradient with 70% saturation and varying lightness for depth
  return `linear-gradient(135deg, hsl(${hue}, 70%, 50%) 0%, hsl(${hue}, 70%, 60%) 100%)`;
};
