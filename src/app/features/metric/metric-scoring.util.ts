/**
 * Utility functions for calculating productivity and sustainability metrics.
 * v2.6 - Productivity: Simplified impact-driven (1-4 scale, 70/30 split)
 * v2.4 - Sustainability: Exponential decay + sigmoid workload model
 * Includes robust fallbacks and heuristics for missing data.
 */

// ==================== SCORING CONSTANTS ====================

/**
 * Productivity Score Weights (must sum to 1.0)
 * Impact is the primary driver to ensure reflection on work value.
 * Note: Density removed to eliminate confounding with progress (both used focused_minutes).
 */
export const PRODUCTIVITY_WEIGHTS = {
  IMPACT: 0.7, // User's assessment of work significance (primary driver)
  PROGRESS: 0.3, // Progress toward deep work target (soft-capped)
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
  IMPACT_SCALE_MAX: 4, // Impact rating is 1-4 (simplified from 1-5)
  EXHAUSTION_SCALE_MAX: 5, // Exhaustion is 1-5 (higher = worse)
  ENERGY_CHECKIN_MIN: 1, // Energy check-in is 1-3
  ENERGY_CHECKIN_DIVISOR: 2, // Convert (value - 1) / 2 to get 0-1 range
} as const;

/**
 * Soft-cap and decay parameters
 */
export const SOFT_CAP = {
  K_VALUE: 2.2, // Decay constant for exponential soft-cap (higher = faster diminishing returns)
} as const;

export const FOCUS_BALANCE_DECAY = {
  BETA: 0.00001, // Exponential decay rate for excessive focus (β parameter)
} as const;

export const WORKLOAD_SIGMOID = {
  INFLECTION_POINT: 480, // 8 hours - point where workload score is 0
  STEEPNESS: 0.01, // Controls how quickly score changes around inflection point
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
 * v2.6 - Simplified impact-driven model with 1-4 scale:
 * - 70% Impact Rating: User's assessment of work value/significance (1-4, required)
 * - 30% Target Progress: Progress toward deep work goal (soft-capped for diminishing returns)
 *
 * Changes from v2.5:
 * - Impact scale reduced from 1-5 to 1-4 (avoids middle-point bias, clearer choices)
 * - Addresses Stevens' Power Law concern about non-linear perception of rating scales
 *
 * Making impact rating mandatory ensures users reflect on work value, not just time spent.
 * This prevents "busywork scoring high" and emphasizes meaningful output.
 *
 * @param impactRating - User's assessment of work impact (1-4 scale, REQUIRED)
 * @param focusedMinutes - Total focused time for the day (in minutes)
 * @param totalWorkMinutes - Total work time (unused in v2.6, kept for API compatibility)
 * @param targetFocusedMinutes - Target deep work goal (in minutes, default 240 = 4 hours)
 * @param completedTasks - Number of tasks completed (optional, currently unused but kept for future)
 * @param plannedTasks - Number of tasks planned (optional, currently unused but kept for future)
 * @returns Productivity score from 0-100
 *
 * @example
 * // High impact, met target = excellent score
 * calculateProductivityScore(4, 240, 360, 240) // Returns ~97
 *
 * @example
 * // Medium impact, typical day
 * calculateProductivityScore(2, 180, 360, 240) // Returns ~60
 *
 * @example
 * // Low impact despite good focus = moderate score
 * calculateProductivityScore(1, 240, 360, 240) // Returns ~41
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

  // Progress to Target (soft-capped for diminishing returns beyond goal)
  const progressRatio = safeDiv(focusedMinutes, targetFocusedMinutes, 0);
  const targetProgress = softCap(progressRatio);

  // Optional: Task completion (currently not weighted, but available for future use)
  // const completion = completedTasks != null && plannedTasks != null
  //   ? clamp(safeDiv(completedTasks, Math.max(plannedTasks, 1), 0))
  //   : targetProgress;

  // Weighted components (sum = 1.0)
  const impactComponent = impact * PRODUCTIVITY_WEIGHTS.IMPACT;
  const progressComponent = targetProgress * PRODUCTIVITY_WEIGHTS.PROGRESS;

  const score = impactComponent + progressComponent;

  // Scale to 0-100 range
  return Math.round(score * 100);
};

/**
 * Calculates a sustainability score (0-100) to assess work-life balance and burnout risk.
 *
 * v2.4 - Improved balance model with exponential decay and sigmoid workload:
 * - 45% Freshness: Energy levels from check-in or exhaustion (inverted)
 * - 40% Workload: Sigmoid function (inflection at 8h, asymptotic decay)
 * - 15% Focus Balance: Linear growth to 4h, then exponential penalty for excess
 *
 * Changes from v2.3:
 * - Workload: Sigmoid instead of linear (avoids harsh 0 at 10h)
 * - Focus Balance: Exponential decay instead of linear (matches fatigue research)
 *
 * The focus balance curve rewards building up to 4h of focused work, but then
 * applies exponential penalty beyond 4h (cognitive fatigue is non-linear).
 * This prevents burnout from excessive deep work sessions.
 *
 * @param focusedMinutes - Total focused time for the day (in minutes)
 * @param totalWorkMinutes - Total work time including meetings, emails, etc. (in minutes)
 * @param workloadLinearZeroAt - Minutes at which workload score becomes 0 (deprecated, kept for API compatibility)
 * @param energyCheckin - Simple energy check-in (1=exhausted, 2=ok, 3=good) - optional
 * @param exhaustion - Detailed exhaustion level (1-5 scale, higher = more exhausted) - optional
 * @returns Sustainability score from 0-100
 *
 * @example
 * // Target case: 7h work, 4h focus, medium energy = ~50
 * calculateSustainabilityScore(240, 420, 600, 2) // Returns ~52
 *
 * @example
 * // Excessive focus (5h): exponential penalty vs 4h
 * calculateSustainabilityScore(300, 420, 600, 2) // Returns ~48 (lower than 4h)
 *
 * @example
 * // Good energy, reasonable hours, optimal focus = high score
 * calculateSustainabilityScore(240, 420, 600, 3) // Returns ~73
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

  // Workload: Sigmoid function centered at 8h (480 min)
  // Formula: 2 / (1 + exp(steepness × (minutes - inflection))) - 1
  // At 0h: ~1.0, at 8h: 0.0, at 16h: ~-1.0 (clamped to 0)
  // This provides smooth decay rather than harsh linear cutoff
  const sigmoidExponent = Math.exp(
    WORKLOAD_SIGMOID.STEEPNESS * (totalWorkMinutes - WORKLOAD_SIGMOID.INFLECTION_POINT),
  );
  // eslint-disable-next-line no-mixed-operators
  const sigmoidValue = 2 / (1 + sigmoidExponent) - 1;
  const workloadScore = clamp(sigmoidValue, 0, 1);

  // Focus Balance: Inverted-V curve with peak at optimal focus time
  // Up to optimal: linear increase rewards building focus
  // Beyond optimal: exponential decay penalizes excessive deep work
  let focusBalance: number;
  const peakMinutes = TIME_TARGETS.FOCUS_BALANCE_PEAK_MINUTES;
  if (focusedMinutes <= peakMinutes) {
    // Building up to optimal: 0h=0, peak=1 (linear growth)
    focusBalance = clamp(focusedMinutes / peakMinutes);
  } else {
    // Beyond optimal: exponential decay (matches non-linear fatigue)
    // Formula: exp(-β × (minutes - peak)²)
    // This approaches 0 asymptotically but never reaches it
    const excess = focusedMinutes - peakMinutes;
    focusBalance = Math.exp(-FOCUS_BALANCE_DECAY.BETA * excess * excess);
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
