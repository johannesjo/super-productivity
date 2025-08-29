import { PromptCategory } from './types';

export const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    title: 'What to do now?',
    prompts: [
      {
        title: 'Pick my Top 3 right now',
        template: `You are an executive function coach. Help me identify exactly what to focus on right now. Consider:

- What's the most impactful thing I can do in the next 2 hours?
- What's blocking other important work?
- What matches my current energy level and context?
- What will give me momentum for the rest of the day?

Give me 3 specific options ranked by impact and feasibility for my current situation.`,
      },
      {
        title: '90-Minute Deep Work Sprint',
        template: `Design a focused 90-minute sprint for maximum impact:

**Sprint Setup:**
- One clear objective (what success looks like)
- 3-5 specific steps (actionable items)
- Definition of done (how I'll know it's complete)

**Execution Framework:**
- 5-minute setup ritual (clear space, set intention)
- 75 minutes focused work (no interruptions)
- 10-minute wrap-up (capture insights, next actions)

Focus on work that moves the needle forward.`,
      },
      {
        title: 'Quick Win Selection',
        template: `Help me identify quick wins I can accomplish in the next 30-60 minutes:

Look for tasks that are:
- High visibility or impact relative to effort
- Remove blockers for other work
- Give me energy and momentum
- Can be completed with my current tools/context

Rank by effort vs impact and suggest the best 1-2 to tackle now.`,
      },
    ],
  },
  {
    title: 'Plan my day',
    prompts: [
      {
        title: 'Daily Game Plan',
        template: `Create a strategic plan for today that sets me up for success:

**Morning Priority:**
- What's the ONE thing that would make today a win?
- When will I tackle this (time block)?

**Energy Management:**
- High-energy tasks (for when I'm sharp)
- Medium-energy tasks (for mid-day)
- Low-energy tasks (for when I'm tired)

**Realistic Schedule:**
- Include buffer time between tasks
- Plan for interruptions and unexpected items
- End with a small win to build momentum for tomorrow`,
      },
      {
        title: 'Time-Blocked Schedule',
        template: `Help me create a time-blocked schedule for maximum productivity:

**Time Blocking Principles:**
- Batch similar tasks together
- Protect deep work with longer blocks
- Include transition time between different types of work
- Schedule breaks and buffer time

**Schedule Framework:**
- 9-11 AM: Deep work block
- 11-12 PM: Communications & quick tasks  
- 1-3 PM: Meetings or collaborative work
- 3-5 PM: Implementation & follow-ups

Adapt this framework to fit my specific tasks and energy patterns.`,
      },
      {
        title: 'Energy-Based Planning',
        template: `Plan my day around my natural energy rhythms:

**High Energy (typically morning):**
- Complex problem-solving
- Creative work
- Important decisions
- Challenging tasks

**Medium Energy (mid-day):**
- Routine work
- Planning and organizing
- Less demanding meetings

**Low Energy (afternoon/evening):**
- Administrative tasks
- Email and communications
- Review and cleanup work

Match my tasks to my energy levels for optimal productivity.`,
      },
    ],
  },
  {
    title: 'Plan my week',
    prompts: [
      {
        title: 'Weekly Strategic Plan',
        template: `Create a strategic weekly plan focused on outcomes:

**Week's Big Picture:**
- 1-3 key outcomes (what success looks like)
- Major milestones or deadlines
- Available time and energy capacity

**Daily Themes:**
- Monday: Planning & Setup
- Tuesday: Deep Work & Creation  
- Wednesday: Communication & Collaboration
- Thursday: Implementation & Building
- Friday: Review & Wrap-up

**Risk Management:**
- What could derail progress?
- Where do I need buffers?
- What's my minimum viable week if things go sideways?`,
      },
      {
        title: 'Weekly Sprint Planning',
        template: `Plan my week like a sprint with clear objectives and deliverables:

**Sprint Goal:**
- What's the primary outcome for this week?
- How will I measure success?

**Sprint Backlog:**
- Must-do items (non-negotiable)
- Should-do items (important but flexible timing)
- Could-do items (nice to have if time permits)

**Daily Structure:**
- Morning standup ritual (daily priorities)
- Focused work blocks
- Evening review (progress and adjustments)

**Sprint Review:**
- Friday afternoon: What got done?
- What's carrying over to next week?
- What did I learn about my process?`,
      },
    ],
  },
  {
    title: "Help, I'm procrastinating",
    prompts: [
      {
        title: 'Procrastination Diagnosis',
        template: `Let's figure out why I'm procrastinating and fix it:

**Quick Diagnosis:**
What's really going on here?
- **Fear** (of failure, judgment, or success)
- **Ambiguity** (unclear what to do next)
- **Overwhelm** (task feels too big)
- **Boredom** (task feels tedious or meaningless)
- **Perfectionism** (standards are impossibly high)
- **Wrong time** (energy/context doesn't match task)

**Targeted Solutions:**
For each blocker you identify, I'll give you:
1. A tiny next step (under 5 minutes)
2. A "good enough" approach 
3. A mental reframe to shift perspective`,
      },
      {
        title: '2-Minute Rule',
        template: `Break through procrastination with the 2-minute rule:

**The Approach:**
1. **Find the tiniest possible step** (literally 2 minutes or less)
2. **Remove ALL barriers** to starting that step right now
3. **Set up your environment** to make it ridiculously easy
4. **Commit only to the tiny step** (not the whole project)

**Examples of 2-minute starts:**
- Open the document and write one sentence
- Gather the materials I need
- Write down 3 bullet points
- Send a quick message to get started

Starting creates momentum. Momentum defeats procrastination.`,
      },
      {
        title: 'Procrastination Reset',
        template: `When I'm stuck in a procrastination loop, help me reset:

**The Reset Process:**
1. **Acknowledge without judgment** - "I'm procrastinating, and that's human"
2. **Get curious, not critical** - What's this resistance telling me?
3. **Change something physical** - Different location, posture, or time
4. **Lower the bar** - What would "good enough" look like?
5. **Find the path of least resistance** - What feels easiest right now?

**Quick Wins to Build Momentum:**
- One tiny action that moves me forward
- Clear something small off my list
- Do a completely different task for 15 minutes, then return`,
      },
    ],
  },
  {
    title: 'Better Habits',
    prompts: [
      {
        title: 'Habit Stack Builder',
        template: `Help me build a new habit using the habit stacking technique:

**Current Habit + New Habit:**
"After I [current habit], I will [new habit]."

**Making it Stick:**
1. **Anchor to an existing strong habit** - What do I already do consistently?
2. **Start ridiculously small** - What's the tiniest version of this habit?
3. **Make it obvious** - How can I set up visual cues?
4. **Make it attractive** - How can I make this enjoyable?
5. **Remove friction** - What barriers can I eliminate?

**Track & Celebrate:**
- Simple tracking method (checkbox, app, etc.)
- Small reward for consistency
- Plan for missed days (how to get back on track)`,
      },
      {
        title: 'Morning Routine Optimizer',
        template: `Design a morning routine that sets me up for success:

**Core Elements:**
1. **Wake-up ritual** (consistent time, first actions)
2. **Physical activation** (movement, stretching, exercise)
3. **Mental clarity** (meditation, journaling, planning)
4. **Fuel** (hydration, nutrition)
5. **Intention setting** (priorities, mindset)

**Design Principles:**
- Start with 15-30 minutes total (build from there)
- Include only essentials that truly impact your day
- Make it flexible enough to work on different days
- Focus on how you want to FEEL, not just what you do

**Troubleshooting:**
- What if I'm not a morning person?
- How to maintain consistency when traveling?
- Backup plan for rushed mornings`,
      },
      {
        title: 'Habit Change Strategy',
        template: `Create a strategic approach to changing an existing habit:

**Understanding the Current Habit:**
1. **Cue** - What triggers this behavior?
2. **Routine** - What's the actual behavior?
3. **Reward** - What need does it satisfy?

**Designing the Replacement:**
4. **Keep the cue** - Same trigger
5. **Replace the routine** - New behavior that serves the same need
6. **Preserve the reward** - Same or better payoff

**Implementation Plan:**
- Start date and 30-day experiment mindset
- Environmental changes to support new habit
- Accountability system (person, app, tracker)
- Plan for obstacles and setbacks
- Weekly review and adjustment process`,
      },
    ],
  },
  {
    title: 'Various',
    prompts: [
      {
        title: 'Decision Making Framework',
        template: `Help me make a clear, confident decision using a structured approach:

**Decision Clarity:**
1. **What exactly am I deciding?** (be specific)
2. **What are my realistic options?** (usually 2-4 good choices)
3. **What matters most?** (key criteria for evaluation)

**Evaluation Process:**
4. **Pros and cons** for each option
5. **Long-term vs. short-term impact**
6. **Reversibility** - Can I change course later?
7. **Opportunity cost** - What am I giving up?

**Decision Filters:**
- What would I advise a friend in this situation?
- What aligns with my values and long-term goals?
- What would I regret NOT trying?`,
      },
      {
        title: 'Problem Solving Assistant',
        template: `Break down this problem using systematic problem-solving:

**Problem Definition:**
1. **What's the real problem?** (not just symptoms)
2. **Why does this matter?** (impact and consequences)
3. **What's the desired outcome?** (specific success criteria)

**Root Cause Analysis:**
4. **What's causing this problem?** (dig deeper than surface issues)
5. **What's within my control?** (vs. what isn't)
6. **What assumptions am I making?** (challenge these)

**Solution Generation:**
7. **Brainstorm options** (quantity over quality first)
8. **Evaluate feasibility** (time, resources, skills needed)
9. **Pick the best approach** (highest impact, lowest risk)
10. **Define next steps** (concrete actions to move forward)`,
      },
      {
        title: 'Creative Block Breaker',
        template: `Help me break through creative blocks and generate fresh ideas:

**Creative Warm-up:**
1. **Change perspective** - How would a child/expert/alien approach this?
2. **Combine unrelated things** - What if I merged [X] with [Y]?
3. **Reverse assumptions** - What if the opposite were true?
4. **Use constraints** - What if I had only [time/budget/materials]?

**Idea Generation Techniques:**
5. **Rapid brainstorming** - 20 ideas in 10 minutes (no editing)
6. **Building on "bad" ideas** - What could make this work?
7. **Random word association** - How does [random word] relate?
8. **Question everything** - Why does this have to be this way?

**Next Steps:**
- Pick 2-3 promising directions to explore
- Create quick prototypes or tests
- Get feedback early and often`,
      },
      {
        title: 'Learning Strategy',
        template: `Design an effective learning approach for new skills or knowledge:

**Learning Goals:**
1. **What exactly do I want to learn?** (specific, measurable)
2. **Why is this important?** (motivation and application)
3. **How will I know I've learned it?** (success criteria)

**Learning Strategy:**
4. **Break it down** - What are the core components?
5. **Find the 20%** - What fundamentals give 80% of the value?
6. **Active practice** - How can I apply this immediately?
7. **Spaced repetition** - How will I review and reinforce?

**Learning Plan:**
- Daily/weekly time commitment (realistic)
- Resources needed (books, courses, tools)
- Practice opportunities (projects, exercises)
- Progress tracking method
- Accountability system`,
      },
    ],
  },
];
