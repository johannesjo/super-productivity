// Example of how the repeating subtasks feature works
// This is for documentation purposes only

// Example 1: Daily standup meeting with subtasks
const dailyStandupRepeatConfig = {
  id: 'daily-standup-repeat',
  title: 'Daily Standup Meeting',
  projectId: 'work-project',
  repeatCycle: 'DAILY',
  repeatEvery: 1,
  quickSetting: 'MONDAY_TO_FRIDAY',
  startTime: '09:00',
  defaultEstimate: 30 * 60 * 1000, // 30 minutes

  // NEW: Subtasks that will be created with each repeat
  subTasks: [
    {
      title: "Prepare yesterday's accomplishments",
      notes: 'Review what was completed yesterday',
      timeEstimate: 5 * 60 * 1000, // 5 minutes
      isDone: false,
    },
    {
      title: "Plan today's priorities",
      notes: 'Identify 2-3 key tasks for today',
      timeEstimate: 5 * 60 * 1000, // 5 minutes
      isDone: false,
    },
    {
      title: 'Identify blockers',
      notes: 'Note any impediments or help needed',
      timeEstimate: 5 * 60 * 1000, // 5 minutes
      isDone: false,
    },
  ],
};

// Example 2: Weekly code review with subtasks
const weeklyCodeReviewRepeatConfig = {
  id: 'weekly-code-review',
  title: 'Weekly Code Review',
  projectId: 'development-project',
  repeatCycle: 'WEEKLY',
  repeatEvery: 1,
  quickSetting: 'CUSTOM',
  friday: true, // Every Friday
  startTime: '14:00',
  defaultEstimate: 120 * 60 * 1000, // 2 hours

  subTasks: [
    {
      title: 'Review pending pull requests',
      notes: 'Check all PRs submitted this week',
      timeEstimate: 45 * 60 * 1000, // 45 minutes
      isDone: false,
    },
    {
      title: 'Update code style guide',
      notes: 'Document any new patterns or decisions',
      timeEstimate: 15 * 60 * 1000, // 15 minutes
      isDone: false,
    },
    {
      title: 'Plan refactoring tasks',
      notes: 'Identify code that needs improvement',
      timeEstimate: 30 * 60 * 1000, // 30 minutes
      isDone: false,
    },
    {
      title: 'Update team on decisions',
      notes: 'Share review outcomes with the team',
      timeEstimate: 30 * 60 * 1000, // 30 minutes
      isDone: false,
    },
  ],
};

// Example 3: Monthly project planning with detailed subtasks
const monthlyPlanningRepeatConfig = {
  id: 'monthly-planning',
  title: 'Monthly Project Planning',
  projectId: 'management-project',
  repeatCycle: 'MONTHLY',
  repeatEvery: 1,
  quickSetting: 'MONTHLY_CURRENT_DATE',
  startTime: '10:00',
  defaultEstimate: 240 * 60 * 1000, // 4 hours

  subTasks: [
    {
      title: "Review previous month's metrics",
      notes: 'Analyze KPIs, completed tasks, and time spent',
      timeEstimate: 60 * 60 * 1000, // 1 hour
      isDone: false,
    },
    {
      title: 'Stakeholder feedback collection',
      notes: 'Gather input from all project stakeholders',
      timeEstimate: 45 * 60 * 1000, // 45 minutes
      isDone: false,
    },
    {
      title: "Define next month's objectives",
      notes: 'Set clear, measurable goals for the upcoming month',
      timeEstimate: 60 * 60 * 1000, // 1 hour
      isDone: false,
    },
    {
      title: 'Resource allocation planning',
      notes: 'Assign team members and allocate time for each objective',
      timeEstimate: 45 * 60 * 1000, // 45 minutes
      isDone: false,
    },
    {
      title: 'Create timeline and milestones',
      notes: 'Break down objectives into weekly milestones',
      timeEstimate: 30 * 60 * 1000, // 30 minutes
      isDone: false,
    },
  ],
};

console.log('Example repeating task configurations with subtasks:');
console.log('1. Daily Standup:', dailyStandupRepeatConfig);
console.log('2. Weekly Code Review:', weeklyCodeReviewRepeatConfig);
console.log('3. Monthly Planning:', monthlyPlanningRepeatConfig);
