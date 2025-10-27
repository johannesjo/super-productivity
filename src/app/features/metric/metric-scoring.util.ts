/**
 * Utility functions for calculating productivity and sustainability metrics.
 * v2.4 - Impact-driven productivity with inverted-V sustainability model.
 * Includes robust fallbacks and heuristics for missing data.
 */

// ==================== SCORING CONSTANTS ====================

/**
 * Productivity Score Weights (must sum to 1.0)
 * Impact is the primary driver to ensure reflection on work value.
 */
export const PRODUCTIVITY_WEIGHTS = {
  IMPACT: 0.45, // User's assessment of work significance (primary driver)
  DENSITY: 0.35, // Portion of total work time spent in focused work
  PROGRESS: 0.2, // Progress toward deep work target (soft-capped)
} as const;

/**
 * Sustainability Score Weights (must sum to 1.0)
 * Freshness leads to emphasize energy and burnout prevention.
 */
export const SUSTAINABILITY_WEIGHTS = {
  FRESHNESS: 0.45, // Energy level (from simple check-in or detailed exhaustion)
  WORKLOAD: 0.4, // Reasonable work hours (penalizes overwork)
  FOCUS_BALANCE: 0.15, // Inverted-V curve - optimal at 4h, penalizes excess
} as const;

/**
 * Default time targets and limits (in minutes)
 */
export const TIME_TARGETS = {
  DEFAULT_TARGET_FOCUSED_MINUTES: 240, // 4 hours - optimal deep work target
  DEFAULT_WORKLOAD_LINEAR_ZERO_AT: 600, // 10 hours - point where workload score becomes 0
  FOCUS_BALANCE_PEAK_MINUTES: 240, // 4 hours - optimal focus time for sustainability
} as const;

/**
 * Scale conversions for user inputs
 */
export const SCALE_CONVERSIONS = {
  IMPACT_SCALE_MAX: 5, // Impact rating is 1-5
  EXHAUSTION_SCALE_MAX: 5, // Exhaustion is 1-5 (higher = worse)
  ENERGY_CHECKIN_MIN: 1, // Energy check-in is 1-3
  ENERGY_CHECKIN_DIVISOR: 2, // Convert (value - 1) / 2 to get 0-1 range
} as const;

/**
 * Soft-cap parameters for diminishing returns
 */
export const SOFT_CAP = {
  K_VALUE: 2.2, // Decay constant for exponential soft-cap (higher = faster diminishing returns)
} as const;

/**
 * Daily state classification threshold
 */
export const DAILY_STATE = {
  THRESHOLD: 50, // Score >= 50 is considered "high" for both dimensions
} as const;

/**
 * Default fallback values
 */
export const DEFAULTS = {
  FRESHNESS_NEUTRAL: 0.5, // Neutral energy level when no data provided
} as const;

/**
 * Color gradient parameters for score visualization
 */
export const COLOR_GRADIENT = {
  HUE_MIN: 0, // Red (poor score)
  HUE_MAX: 120, // Green (excellent score)
  SATURATION: 70, // Saturation percentage
  LIGHTNESS_START: 50, // Lightness for gradient start
  LIGHTNESS_END: 60, // Lightness for gradient end
} as const;

// ==================== HELPER FUNCTIONS ====================

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
 * @param k - Decay constant (uses SOFT_CAP.K_VALUE by default)
 * @returns Soft-capped value between 0 and ~1
 */
const softCap = (x: number, k: number = SOFT_CAP.K_VALUE): number => {
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
  targetFocusedMinutes: number = TIME_TARGETS.DEFAULT_TARGET_FOCUSED_MINUTES,
  completedTasks?: number,
  plannedTasks?: number,
): number => {
  // Impact: User's reflection on work value (1-5 scale normalized to 0-1)
  const impact = clamp(impactRating / SCALE_CONVERSIONS.IMPACT_SCALE_MAX);

  // Focus Density: What portion of work time was focused
  const density = clamp(safeDiv(focusedMinutes, Math.max(totalWorkMinutes, 1), 0));

  // Progress to Target (soft-capped for diminishing returns beyond goal)
  const progressRatio = safeDiv(focusedMinutes, targetFocusedMinutes, 0);
  const targetProgress = softCap(progressRatio);

  // Optional: Task completion (currently not weighted, but available for future use)
  // const completion = completedTasks != null && plannedTasks != null
  //   ? clamp(safeDiv(completedTasks, Math.max(plannedTasks, 1), 0))
  //   : density;

  // Weighted components (sum = 1.0)
  const impactComponent = impact * PRODUCTIVITY_WEIGHTS.IMPACT;
  const densityComponent = density * PRODUCTIVITY_WEIGHTS.DENSITY;
  const progressComponent = targetProgress * PRODUCTIVITY_WEIGHTS.PROGRESS;

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
  workloadLinearZeroAt: number = TIME_TARGETS.DEFAULT_WORKLOAD_LINEAR_ZERO_AT,
  energyCheckin?: number,
  exhaustion?: number,
): number => {
  // Freshness: Energy level normalized to 0-1
  // Priority: energyCheckin (simpler) > exhaustion (detailed) > neutral fallback
  let freshness = DEFAULTS.FRESHNESS_NEUTRAL;
  if (energyCheckin !== undefined) {
    // energyCheckin: 1=exhausted, 2=ok, 3=good → (value-1)/2 → 0, 0.5, 1
    freshness =
      (energyCheckin - SCALE_CONVERSIONS.ENERGY_CHECKIN_MIN) /
      SCALE_CONVERSIONS.ENERGY_CHECKIN_DIVISOR;
  } else if (exhaustion !== undefined) {
    // exhaustion: 1-5 (higher = worse) → invert to 0-1
    const exhaustionNorm = exhaustion / SCALE_CONVERSIONS.EXHAUSTION_SCALE_MAX;
    freshness = 1 - exhaustionNorm;
  }

  // Workload: Linear penalty - 0h = 1.0, workloadLinearZeroAt (default 10h) = 0.0
  const workloadRatio = totalWorkMinutes / workloadLinearZeroAt;
  const workloadScore = clamp(1 - workloadRatio, 0, 1);

  // Focus Balance: Inverted-V curve with peak at optimal focus time
  // Up to optimal: linear increase rewards building focus
  // Beyond optimal: linear decrease penalizes excessive deep work
  let focusBalance: number;
  const peakMinutes = TIME_TARGETS.FOCUS_BALANCE_PEAK_MINUTES;
  if (focusedMinutes <= peakMinutes) {
    // Building up to optimal: 0h=0, peak=1
    focusBalance = clamp(focusedMinutes / peakMinutes);
  } else {
    // Beyond optimal: peak=1, 2*peak=0 (linear penalty for too much focus)
    const excess = focusedMinutes - peakMinutes;
    const excessRatio = excess / peakMinutes;
    focusBalance = clamp(1 - excessRatio);
  }

  // Weighted components (sum = 1.0)
  const freshnessComponent = freshness * SUSTAINABILITY_WEIGHTS.FRESHNESS;
  const workloadComponent = workloadScore * SUSTAINABILITY_WEIGHTS.WORKLOAD;
  const focusBalanceComponent = focusBalance * SUSTAINABILITY_WEIGHTS.FOCUS_BALANCE;

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
  threshold: number = DAILY_STATE.THRESHOLD,
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
  // Convert score (0-100) to hue range (red to green)
  const scoreRatio = score / 100;
  const hueRange = scoreRatio * COLOR_GRADIENT.HUE_MAX;
  const hue = hueRange + COLOR_GRADIENT.HUE_MIN;
  // Return gradient with configured saturation and varying lightness for depth
  const sat = COLOR_GRADIENT.SATURATION;
  const lightStart = COLOR_GRADIENT.LIGHTNESS_START;
  const lightEnd = COLOR_GRADIENT.LIGHTNESS_END;
  return `linear-gradient(135deg, hsl(${hue}, ${sat}%, ${lightStart}%) 0%, hsl(${hue}, ${sat}%, ${lightEnd}%) 100%)`;
};
