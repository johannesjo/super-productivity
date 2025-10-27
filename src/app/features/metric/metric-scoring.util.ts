/**
 * Utility functions for calculating productivity and sustainability metrics.
 * These scores help evaluate daily work effectiveness and long-term sustainability.
 */

/**
 * Calculates a productivity score (0-100) based on focus quality, work impact, and deep work time.
 *
 * The score emphasizes quality and impact over raw time spent:
 * - 40% Focus Quality: How well you maintained concentration during work sessions
 * - 40% Impact: The significance and value of the work completed
 * - 20% Deep Work Ratio: Progress toward your deep work time target
 *
 * This weighting prioritizes meaningful, focused work over simply logging hours.
 *
 * @param focusQuality - User's self-assessment of focus quality (1-5 scale)
 * @param impact - User's assessment of work impact (1-5 scale)
 * @param deepWorkMinutes - Total time spent in deep work (in minutes)
 * @param targetMinutes - Target deep work time goal (in minutes, default 240 = 4 hours)
 * @returns Productivity score from 0-100
 *
 * @example
 * // High focus, high impact, met target = excellent score
 * calculateProductivityScore(5, 5, 240, 240) // Returns 100
 *
 * @example
 * // Medium focus/impact, half of target = moderate score
 * calculateProductivityScore(3, 3, 120, 240) // Returns ~50
 */
export const calculateProductivityScore = (
  focusQuality: number,
  impact: number,
  deepWorkMinutes: number,
  targetMinutes: number = 240,
): number => {
  // Normalize inputs to 0-1 range for consistent weighting
  const focusQualityNorm = focusQuality / 5; // Convert 1-5 scale to 0-1
  const impactNorm = impact / 5; // Convert 1-5 scale to 0-1
  const deepWorkRatio = Math.min(deepWorkMinutes / targetMinutes, 1); // Cap at 1 (100%)

  // Apply weighted sum (0.4 + 0.4 + 0.2 = 1.0)
  const focusComponent = focusQualityNorm * 0.4;
  const impactComponent = impactNorm * 0.4;
  const deepWorkComponent = deepWorkRatio * 0.2;
  const score = focusComponent + impactComponent + deepWorkComponent;

  // Scale to 0-100 range
  return Math.round(score * 100);
};

/**
 * Calculates a sustainability score (0-100) to assess work-life balance and burnout risk.
 *
 * This score rewards balanced, sustainable work patterns over unsustainable intensity:
 * - 40% Low Exhaustion: Energy levels and avoiding burnout
 * - 30% Deep Work Ratio: Quality focus time vs total work time
 * - 30% Reasonable Workload: Not exceeding recommended daily work hours
 *
 * A high sustainability score indicates you can maintain this pace long-term without burnout.
 * The score intentionally penalizes overwork, even if productive short-term.
 *
 * @param exhaustion - User's exhaustion level (1-5 scale, higher = more exhausted)
 * @param deepWorkMinutes - Time spent in deep work (in minutes)
 * @param totalWorkMinutes - Total work time including meetings, emails, etc. (in minutes)
 * @param maxRecommendedDailyWork - Maximum sustainable daily work (in minutes, default 480 = 8 hours)
 * @returns Sustainability score from 0-100
 *
 * @example
 * // Low exhaustion, high focus ratio, reasonable hours = sustainable
 * calculateSustainabilityScore(2, 180, 360, 480) // Returns high score
 *
 * @example
 * // High exhaustion, working too many hours = unsustainable
 * calculateSustainabilityScore(5, 200, 600, 480) // Returns low score (burnout risk)
 */
export const calculateSustainabilityScore = (
  exhaustion: number,
  deepWorkMinutes: number,
  totalWorkMinutes: number,
  maxRecommendedDailyWork: number = 480,
): number => {
  // Component 1: Low exhaustion is good (invert the scale)
  // If no exhaustion data, assume neutral (0.5)
  const exhaustionRatio = exhaustion / 5;
  const exhaustionComponent = exhaustion > 0 ? 1 - exhaustionRatio : 0.5;

  // Component 2: High ratio of deep work to total work is good
  // Measures focus efficiency - are you spending time on meaningful work?
  const deepWorkRatio =
    totalWorkMinutes > 0 ? Math.min(deepWorkMinutes / totalWorkMinutes, 1) : 0;

  // Component 3: Not working excessive hours is good
  // Penalizes overwork even if productive - sustainability matters long-term
  const overworkRatio = totalWorkMinutes / maxRecommendedDailyWork;
  const workloadComponent = totalWorkMinutes > 0 ? Math.max(0, 1 - overworkRatio) : 0.5;

  // Apply weighted sum (0.4 + 0.3 + 0.3 = 1.0)
  const exhaustionScore = exhaustionComponent * 0.4;
  const deepWorkScore = deepWorkRatio * 0.3;
  const workloadScore = workloadComponent * 0.3;
  const score = exhaustionScore + deepWorkScore + workloadScore;

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
