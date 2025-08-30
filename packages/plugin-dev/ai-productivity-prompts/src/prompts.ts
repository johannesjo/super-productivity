import { PromptCategory } from './types';

export const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    title: 'What to do now?',
    prompts: [
      {
        title: 'Next Best Action',
        template: `I need to decide what to work on right now. Analyze my tasks and recommend the SINGLE best thing to do next.

Consider:
1. Current time of day and my likely energy level
2. Dependencies - what's blocking other work?
3. Deadlines - what's truly urgent?
4. Impact - what moves the needle most?
5. Context - what can I realistically complete now?

Give me:
- ONE specific task to focus on
- Why this task (2-3 bullet points)
- First concrete action to start (under 2 minutes)
- Expected time to complete`,
      },
      {
        title: '90-Minute Power Block',
        template: `Help me structure the next 90 minutes for maximum productivity.

Review my tasks and create:

**The ONE Thing** (15 words max)
What single outcome would make this block a success?

**Action Steps** (3-5 specific tasks)
- [Exact action verb + specific deliverable]
- Include time estimates for each

**Success Metrics**
How will I know I've succeeded? Be specific.

**Potential Blockers**
What might stop me? How do I prevent/handle it?

Format as a flat markdown checklist I can follow without thinking.`,
      },
      {
        title: 'Quick Win Hunter',
        template: `Find me 1-2 tasks I can complete in the next 30 minutes that will give me momentum.

Criteria:
- Can be FULLY completed (not just started)
- Requires no external input or waiting
- Has visible/tangible output
- Moves a project forward OR removes a mental burden

For each task, tell me:
1. The specific task
2. Time estimate (be realistic)
3. What I'll have when done
4. Why this creates momentum

Give as a markdown checklist.`,
      },
    ],
  },
  {
    title: 'Plan my day',
    prompts: [
      {
        title: 'Daily Blueprint',
        template: `Create my daily plan. Be specific and realistic.

**Non-Negotiables** (max 3)
What MUST happen today no matter what?
1. [Task] - [Time needed] - [When]
2. 
3. 

**Energy Matching**
Morning (high energy): [Which complex/creative task?]
Afternoon (medium): [Which routine work?]
Late day (low): [Which admin/cleanup task?]

**Time Blocks**
[Start-End]: [Specific task/outcome]
Include 15-min buffers between major tasks

**End-of-Day Win**
One small task to complete last that will feel satisfying

**Contingency**
If I only have 2 hours today, which ONE task gets done?

Output as a flat markdown checklist (- [ ] Task name) that I can paste into my task manager.`,
      },
      {
        title: 'Reality-Based Schedule',
        template: `Build a schedule that actually works with my real life.

First, identify:
- Fixed commitments (meetings, appointments)
- Realistic work windows between them
- My actual (not ideal) energy patterns today

Now create:

**Protected Time** (1-2 blocks max)
[Time]: [Most important work] - phone off, door closed

**Batch Windows**
[Time]: Communications (email, messages, calls)
[Time]: Quick tasks under 15 min each
[Time]: Admin/planning/review

**Flex Buffer**
30-60 minutes unscheduled for the unexpected

Give me exact times and specific tasks, not categories.
Output as a flat markdown checklist (- [ ] Task name) I can paste into my task manager.`,
      },
      {
        title: 'Minimum Viable Day',
        template: `I'm overwhelmed. Help me plan the absolute minimum for a successful day.

**The ONE Thing**
If only one task gets done today, which creates the most relief or progress?
Task: [Specific task]
Time needed: [Realistic estimate]
When: [Specific time block]

**Two Supporting Tasks**
What two smaller tasks would most support the main one?
1. [15-30 min task]
2. [15-30 min task]

**Maintenance Minimum**
What's the bare minimum to keep things from falling apart?
- [5-10 min critical check-in]
- [5-10 min critical response]

Total time commitment: [Should be under 4 focused hours]

Everything else can wait.
Output as a simple markdown checklist.`,
      },
    ],
  },
  {
    title: 'Plan my week',
    prompts: [
      {
        title: 'Weekly Big Rocks',
        template: `Define my week's priorities using the Big Rocks principle.

**Three Big Rocks** (major outcomes)
What three things, if completed, would make this a successful week?
1. [Specific, measurable outcome] - Due: [Day]
2. [Specific, measurable outcome] - Due: [Day]
3. [Specific, measurable outcome] - Due: [Day]

**Rock Schedule**
Monday: [Which rock gets focus? How many hours?]
Tuesday: [Which rock gets focus? How many hours?]
Wednesday: [Which rock gets focus? How many hours?]
Thursday: [Which rock gets focus? How many hours?]
Friday: [Wrap-up, review, or overflow?]

**Pebbles** (important but smaller)
5-7 tasks that support the big rocks or maintain momentum
- [Task]: [Which day, how long?]

**Sand** (nice if time)
Tasks to do ONLY after rocks and pebbles are handled

What gets cut if I lose a day this week?

Provide as a flat markdown checklist for my task manager.`,
      },
      {
        title: 'Realistic Week Planner',
        template: `Plan a week that accounts for how weeks actually go.

**Reality Check**
- Actual available hours: [Subtract meetings, commute, breaks]
- Energy reality: [When am I actually productive?]
- Interruption buffer: [How much time gets eaten by unexpected?]

**Must-Win Battles**
Maximum 3 things that MUST be done this week:
1. [Task] - [Hours needed] - [Spread across which days?]
2. 
3. 

**Daily Minimums**
What's the ONE thing for each day that defines success?
Mon: [30-90 min task]
Tue: [30-90 min task]
Wed: [30-90 min task]
Thu: [30-90 min task]
Fri: [30-90 min task]

**Overflow Plan**
Where does unfinished work go?
What can be dropped without consequence?

Give me a flat markdown checklist for the week.`,
      },
    ],
  },
  {
    title: "Help, I'm procrastinating",
    prompts: [
      {
        title: 'Procrastination Buster',
        template: `I'm stuck. Get me unstuck with ONE specific action.

Looking at my tasks, identify:

**The Real Blocker** (pick the most likely)
□ Fear: "What if I fail/succeed/get judged?"
□ Confusion: "I don't know where to start"
□ Overwhelm: "This is too big"
□ Perfectionism: "It won't be good enough"
□ Boredom: "This feels pointless"

**The Antidote**
Based on the blocker, give me:
1. The absolute smallest next step (under 2 minutes)
2. Exact words/action to take (not concepts)
3. What to do immediately after that step

**Permission Slip**
Write me a 1-sentence permission to do this imperfectly.

**Momentum Builder**
If this works, what's the next 10-minute task?

Output as a simple markdown checklist.`,
      },
      {
        title: '2-Minute Momentum',
        template: `Pick ONE task I'm avoiding. Break it down to start NOW.

**The Task:** [Identify the specific task I'm avoiding most]

**2-Minute Start** 
Not "work on X" but the EXACT first action:
- Open [specific file/app/website]
- Write [specific first sentence/line]
- Send [specific message to specific person]
- Move [specific thing to specific place]

**Remove Friction**
What do I need to close/hide/prepare right now?
- Close: [Specific tabs/apps]
- Prepare: [Specific materials/files]
- Set timer for: [Exactly 2 minutes]

**The Deal**
"Do ONLY this 2-minute task. Permission to stop after. No commitment beyond that."

**If Momentum Happens**
Next 2-minute task ready: [Specific action]

Give me ultra-specific 2-minute actions as a markdown checklist.`,
      },
      {
        title: 'Pattern Interrupt',
        template: `I'm in a procrastination spiral. Break the pattern.

**Physical Reset** (pick one, do now)
□ Stand up and stretch for 30 seconds
□ Get a glass of water
□ Walk to a different room
□ Do 5 push-ups or jumping jacks

**Mental Reset**
Answer: "What would this look like if it were easy?"
[Your response]

**The Ridiculous Version**
What's the laughably small version of this task?
Example: Instead of "write report" → "write the title"
Your task: [Make it absurdly small]

**Time Boxing**
"I'll work on this for exactly 10 minutes, then I'm free."
Start time: [Now]
End time: [Now + 10 min]
Task: [The ridiculous version]

**Reward Ready**
What will you do immediately after those 10 minutes?
[Specific reward/break activity]`,
      },
    ],
  },
  {
    title: 'Better Habits',
    prompts: [
      {
        title: 'Micro Habit Designer',
        template: `Design a habit so small it's impossible to fail.

**The Habit I Want:** [End goal habit]

**The 2-Minute Version:** [Scale it down to 2 minutes max]

**The Stack Formula:**
"After I [existing habit], I will [new 2-min habit]"

**Make It Obvious**
□ Visual cue: [What will I see?]
□ Phone reminder at: [Specific time]
□ Physical prep: [What to set out tonight?]

**The First Week Plan**
Days 1-3: [Even tinier version - 30 seconds]
Days 4-7: [The 2-minute version]
Week 2: [Slightly expanded - 3-5 minutes]

**Track It Simply**
□ Check off on: [Calendar/app/paper - pick ONE]
□ Celebration: [5-second celebration after doing it]

**If I Miss a Day**
"Never miss twice. Do 30-second version to maintain chain."`,
      },
      {
        title: 'Keystone Habit Finder',
        template: `Identify the ONE habit that will trigger positive chain reactions.

**Potential Keystone Habits**
Analyze which ONE of these would impact the most areas:
□ Morning movement (affects: energy, mood, discipline)
□ Evening planning (affects: next day, sleep, anxiety)
□ Meal prep (affects: health, time, decisions)
□ Daily reading (affects: learning, wind-down, screen time)
□ Time blocking (affects: productivity, boundaries, focus)

**Your Keystone Selection**
The ONE to focus on: [Choose from above or identify your own]

**Ripple Effects**
If I do this consistently, what else improves?
1. [Secondary benefit]
2. [Secondary benefit]
3. [Secondary benefit]

**30-Day Experiment**
Start date: [Specific date]
Minimum daily dose: [5-15 minutes max]
Success metric: [What changes am I tracking?]

Focus ONLY on this one habit for 30 days.`,
      },
      {
        title: 'Bad Habit Replacer',
        template: `Replace a bad habit with a better one using the same trigger.

**The Habit to Change:** [Specific bad habit]

**The Trigger Audit**
When does this happen?
- Time: [When in the day?]
- Location: [Where am I?]
- Emotion: [What am I feeling?]
- Preceding action: [What happens right before?]

**The Need It Meets**
What am I really seeking?
□ Stress relief
□ Stimulation/excitement
□ Connection
□ Escape/numbing
□ Energy boost
□ Reward/pleasure

**The Replacement**
New behavior that meets the SAME need:
[Specific alternative action]

**Implementation**
When [trigger] happens,
Instead of [bad habit],
I will [replacement behavior],
Because it gives me [same reward].

**Friction Design**
Make bad habit harder: [Specific action]
Make good habit easier: [Specific action]`,
      },
    ],
  },
  {
    title: 'Various',
    prompts: [
      {
        title: 'Quick Decision Maker',
        template: `I need to make a decision. Help me choose in the next 5 minutes.

**The Decision:** [State it in one sentence]

**Real Options** (2-4 max)
A: [Option]
B: [Option]
C: [Option if applicable]

**10-10-10 Test**
How will I feel about each option:
- In 10 minutes?
- In 10 months?
- In 10 years?

**Gut Check**
If I had to decide in 10 seconds: [Which option?]
What's my hesitation about that choice?

**The Decider**
Which option:
- Aligns with my values? [A/B/C]
- I'd recommend to a friend? [A/B/C]
- I'll regret NOT trying? [A/B/C]
- Is reversible if wrong? [A/B/C]

**Decision:** [Choose now]
**First action:** [What do I do in next hour?]`,
      },
      {
        title: 'Problem Solver Express',
        template: `Solve my problem in 5 steps or less.

**Problem in one sentence:** [What's wrong?]

**Why this matters:** [Impact if unsolved]

**Root Cause** (pick most likely)
□ Resource issue (time/money/tools)
□ Knowledge gap (don't know how)
□ System failure (process broken)
□ People issue (communication/alignment)
□ External blocker (waiting on others)

**Three Solutions** (brainstorm fast)
1. Quick fix: [Band-aid solution for now]
2. Proper fix: [Real solution, more effort]
3. Workaround: [Different approach entirely]

**The Choice**
Going with: [Pick one]
Because: [One reason]
First step: [Specific action today]
Success looks like: [Measurable outcome]`,
      },
      {
        title: 'Stuck → Unstuck',
        template: `I'm stuck on something. Get me moving in any direction.

**Where I'm Stuck:** [Describe in 1-2 sentences]

**Pattern Breaker** (do one now)
□ Explain it to a rubber duck
□ Draw it instead of writing
□ Work backwards from the end
□ Do the opposite for 5 minutes
□ Ask "What would [expert] do?"
□ List 10 bad solutions quickly

**New Angle**
What if:
- This were easy? [What would I do?]
- I had unlimited resources? [What would I do?]
- I had only 1 hour? [What would I do?]
- Someone else had to do it? [What would I tell them?]

**Minimum Viable Progress**
Smallest step that's still progress: [Define it]
Time needed: [5-15 minutes max]
Do it when: [Specific time today]

**If Still Stuck**
Who can help: [Specific person]
What to ask: [Specific question]`,
      },
      {
        title: 'Weekly Review Template',
        template: `Quick weekly review. Keep it under 15 minutes.

**Last Week's Wins** (3 max)
1. [What went well?]
2. [What went well?]
3. [What went well?]

**Lessons Learned** (2 max)
1. [What didn't work?] → [What to try instead]
2. [What surprised me?] → [How to adapt]

**Progress Check**
Main goal progress: [X%]
On track? [Yes/No]
If no, what ONE thing needs to change?

**Next Week's Focus**
THE priority: [One main outcome]
Supporting tasks: [2-3 that enable the priority]
What I'm saying NO to: [Specifically]

**System Tweaks**
One small process improvement: [What and how]

**Energy Management**
When was I most productive? [Day/time]
When was I least productive? [Day/time]
Schedule adjustment: [What to change]`,
      },
    ],
  },
];
