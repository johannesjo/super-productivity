// ============================================================================
// Constants and Enums
// ============================================================================

/**
 * Plugin message types sent from the iframe to the plugin.
 * These are the actions that the procrastination buster can trigger.
 */
export enum PluginMessageType {
  ADD_STRATEGY_TASK = 'ADD_STRATEGY_TASK',
  START_POMODORO = 'START_POMODORO',
  START_FOCUS_MODE = 'START_FOCUS_MODE',
  QUICK_ADD_TASK = 'QUICK_ADD_TASK',
}

/**
 * Super Productivity action types used by the plugin.
 * These are the native SP actions that our plugin dispatches.
 */
export enum SPActionType {
  SHOW_ADD_TASK_BAR = '[Layout] Show AddTaskBar',
  SET_CURRENT_TASK = '[Task] SetCurrentTask',
  START_POMODORO = '[Pomodoro] Start Pomodoro',
  SHOW_FOCUS_OVERLAY = '[FocusMode] Show Focus Overlay',
}

/**
 * Snack notification types for user feedback.
 */
export enum SnackType {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  INFO = 'INFO',
}

/**
 * Window message types for iframe communication.
 * Used for postMessage between the plugin iframe and the main app.
 */
export enum WindowMessageType {
  PLUGIN_MESSAGE = 'PLUGIN_MESSAGE',
  PLUGIN_MESSAGE_RESPONSE = 'PLUGIN_MESSAGE_RESPONSE',
  PLUGIN_MESSAGE_ERROR = 'PLUGIN_MESSAGE_ERROR',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Represents a type of procrastination with associated strategies.
 */
export interface ProcrastinationType {
  id: string;
  title: string;
  emotion: string;
  strategies: string[];
}

// ============================================================================
// Data
// ============================================================================

/**
 * Available procrastination types with their strategies.
 * Each type represents a common reason for procrastination.
 */
export const procrastinationTypes: ProcrastinationType[] = [
  {
    id: 'overwhelm',
    title: 'Overwhelm',
    emotion: 'Too much at once',
    strategies: [
      'Create micro-tasks (5 min steps)',
      'Start Pomodoro timer (25 min)',
      'Implementation Intentions (If X, then Y)',
      'Pick just one thing',
    ],
  },
  {
    id: 'perfectionism',
    title: 'Perfectionism',
    emotion: "It's not perfect enough",
    strategies: [
      'Time-box your first draft (30 min)',
      'Journal: What is "good enough"?',
      'Practice self-compassion',
      'Progress over perfection',
    ],
  },
  {
    id: 'unclear',
    title: 'Unclear',
    emotion: "I don't know what to do",
    strategies: [
      'Define next concrete step',
      'Talk to someone about it',
      'Create a mind map',
      'Write down questions',
    ],
  },
  {
    id: 'boring',
    title: 'Boredom',
    emotion: "It's boring",
    strategies: [
      'Add gamification',
      'Combine with music/podcast',
      'Plan a reward',
      'Break into smaller parts',
    ],
  },
  {
    id: 'fear',
    title: 'Fear',
    emotion: 'I might fail',
    strategies: [
      'Think through worst case',
      'Run small experiments',
      'Activate support system',
      'Document successes',
    ],
  },
  {
    id: 'energy',
    title: 'Low Energy',
    emotion: "I'm too tired",
    strategies: [
      '5-minute movement break',
      'Drink water',
      'Easiest task first',
      'Power nap (20 min)',
    ],
  },
  {
    id: 'distraction',
    title: 'Distraction',
    emotion: 'Other things are more interesting',
    strategies: [
      'Block distractions',
      'Schedule deep work block',
      'Clear work environment',
      'Start focus ritual',
    ],
  },
  {
    id: 'resistance',
    title: 'Resistance',
    emotion: "I don't want to do this",
    strategies: [
      'Why is it important?',
      'Pair with something pleasant',
      'Consider delegating',
      'Reframe: What will I learn?',
    ],
  },
];
