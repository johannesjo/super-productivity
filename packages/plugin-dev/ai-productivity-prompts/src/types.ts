// ============================================================================
// Interfaces
// ============================================================================

export interface PromptCategory {
  title: string;
  prompts: {
    title: string;
    template: string;
  }[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Renders a prompt template with optional tasks markdown
 */
export function renderPrompt(template: string, tasksMd?: string): string {
  return template.replace(/{{#if tasks_md}}([\s\S]*?){{\/if}}/g, (match, content) => {
    if (tasksMd) {
      return content.replace(/{{tasks_md}}/g, tasksMd);
    }
    return '';
  });
}

// ============================================================================
// Data
// ============================================================================

export const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    title: 'What should I do today?',
    prompts: [
      {
        title: 'Pick my Top 3 for today',
        template: `You are an executive function coach. Given my tasks, help me pick a realistic Top 3 for today. Consider:

- What has the highest impact?
- What's time-sensitive or has dependencies?  
- What can I realistically complete given my energy and schedule?
- Balance between urgent and important tasks

Provide specific reasoning for each choice and suggest a rough time estimate.

{{#if tasks_md}}
Here are my tasks:
{{tasks_md}}
{{/if}}`,
      },
      {
        title: '90-Minute Sprint',
        template: `Create a single 90-minute sprint plan from these tasks. Include:

- **One primary objective** (what success looks like)
- **3–5 atomic steps** (specific, actionable items)
- **Definition of done** (how you'll know it's complete)
- **5-minute warm-up ritual** (to get into flow)
- **5-minute cooldown + log** (to capture what you learned)

Focus on deep work that moves the needle forward.

{{#if tasks_md}}
Tasks:
{{tasks_md}}
{{/if}}`,
      },
      {
        title: 'Energy-Based Schedule',
        template: `Help me schedule my day based on my energy patterns and task requirements. Suggest:

- **High-energy tasks** for when I'm sharpest (usually morning)
- **Medium-energy tasks** for mid-day
- **Low-energy tasks** for when I'm tired
- **Buffer time** between demanding tasks
- **Recovery breaks** to maintain productivity

{{#if tasks_md}}
Tasks to schedule:
{{tasks_md}}
{{/if}}`,
      },
    ],
  },
  {
    title: 'Plan my week',
    prompts: [
      {
        title: 'Weekly Game Plan',
        template: `Plan my week with a strategic approach:

1. **1–3 weekly outcomes** (what must be accomplished this week)
2. **Required tasks** for each outcome
3. **Draft schedule** by weekday (considering energy and commitments)
4. **Risks and buffers** (what could go wrong, how to prepare)
5. **'One thing' fallback** (if everything goes sideways, what's the minimum viable success?)

Focus on outcomes over activities.

{{#if tasks_md}}
Candidate tasks:
{{tasks_md}}
{{/if}}`,
      },
      {
        title: 'Theme Days',
        template: `Organize my week using theme days to batch similar work and reduce context switching:

- **Monday**: Planning & Strategy
- **Tuesday**: Deep Work & Creation
- **Wednesday**: Communication & Meetings
- **Thursday**: Implementation & Building
- **Friday**: Review & Administrative Tasks

Assign my tasks to appropriate theme days and suggest how to batch related work.

{{#if tasks_md}}
Tasks to organize:
{{tasks_md}}
{{/if}}`,
      },
    ],
  },
  {
    title: "I'm procrastinating",
    prompts: [
      {
        title: 'Anti-Procrastination Coach',
        template: `I'm procrastinating. Help me identify the likely blockers and provide specific solutions:

**Common blockers to check:**
- **Fear** (of failure, judgment, or success)
- **Ambiguity** (unclear next steps)
- **Overwhelm** (task feels too big)
- **Boredom** (task feels tedious)
- **Perfectionism** (standards too high)

For each relevant blocker, give me:
1. A **tiny next action** (<10 minutes)
2. A **'first ugly draft' approach**
3. A specific **reframing** technique

{{#if tasks_md}}
Context:
{{tasks_md}}
{{/if}}`,
      },
      {
        title: '2-Minute Rule',
        template: `Apply the 2-minute rule to break through procrastination:

1. **Identify the absolute smallest step** I can take (under 2 minutes)
2. **Remove all barriers** to starting that step
3. **Set up the environment** for success
4. **Create momentum** with a micro-commitment

Remember: You're not committing to finish, just to start. Starting is often the hardest part.

{{#if tasks_md}}
Tasks I'm avoiding:
{{tasks_md}}
{{/if}}`,
      },
    ],
  },
  {
    title: 'I feel overwhelmed',
    prompts: [
      {
        title: 'Triage & Tame',
        template: `Help me triage these tasks and create a 2-hour rescue plan:

**Step 1: Triage into three buckets:**
- **Now** (must be done today, high impact)
- **Next** (important but can wait 24-48 hours)  
- **Not Now** (low priority or can be delayed/delegated)

**Step 2: Create a 2-hour rescue plan:**
- Pick ONE task from "Now" bucket
- Break it into 20-minute chunks
- Include 10-minute breaks between chunks
- End with a 15-minute planning session for tomorrow

Focus on progress over perfection.

{{#if tasks_md}}
Tasks:
{{tasks_md}}
{{/if}}`,
      },
      {
        title: 'Stress Audit',
        template: `Let's do a quick stress audit to identify what's really driving the overwhelm:

1. **Task overload** - Too many things on my plate?
2. **Time pressure** - Unrealistic deadlines?
3. **Skill gaps** - Missing knowledge or tools?
4. **Decision fatigue** - Too many choices to make?
5. **External pressure** - Others' expectations?

For each factor present, suggest one specific action to reduce its impact this week.

{{#if tasks_md}}
Current tasks and commitments:
{{tasks_md}}
{{/if}}`,
      },
    ],
  },
  {
    title: 'I am not motivated',
    prompts: [
      {
        title: 'Make It Attractive',
        template: `Rewrite my tasks to be more motivating and engaging:

For each task, help me:
1. **Add a why-statement** (connect to bigger purpose)
2. **Reframe the outcome** (focus on benefits, not effort)
3. **Suggest a reward** (something I'll enjoy after completion)
4. **Create a 5-minute starter ritual** (make beginning easier)
5. **Find the learning opportunity** (what skill will I develop?)

Transform tasks from chores into opportunities.

{{#if tasks_md}}
Tasks to make attractive:
{{tasks_md}}
{{/if}}`,
      },
      {
        title: 'Motivation Reset',
        template: `Help me reset my motivation by reconnecting with my deeper drivers:

1. **Values alignment** - How do these tasks connect to what I care about?
2. **Progress visualization** - What will completing this enable?
3. **Identity reinforcement** - What kind of person does this work?
4. **Energy audit** - When am I most naturally motivated?
5. **Environmental design** - How can I set up my space for success?

Create a personalized motivation plan based on my specific situation.

{{#if tasks_md}}
Current tasks and goals:
{{tasks_md}}
{{/if}}`,
      },
    ],
  },
  {
    title: "I can't focus",
    prompts: [
      {
        title: 'Focus Troubleshoot',
        template: `Let's diagnose and fix focus issues systematically:

**Common focus killers:**
- **Digital distractions** (notifications, social media)
- **Mental clutter** (unfinished tasks, decisions)
- **Physical environment** (noise, clutter, comfort)
- **Energy state** (hunger, fatigue, stress)
- **Task design** (too vague, too big, too boring)

For each relevant issue, I'll provide:
1. A **quick fix** for right now
2. A **system** to prevent it recurring
3. A **focus ritual** to get back on track

{{#if tasks_md}}
Tasks requiring focus:
{{tasks_md}}
{{/if}}`,
      },
      {
        title: 'Deep Work Block',
        template: `Design a deep work block for maximum focus and productivity:

**Pre-work setup (5 minutes):**
- Clear physical and digital space
- Set specific intention and outcome
- Eliminate distractions and notifications

**Work block structure:**
- 25-45 minute focused sprint
- Clear start and stop signals
- Single task focus (no multitasking)

**Recovery (10 minutes):**
- Note progress and insights
- Physical movement or fresh air
- Prepare for next session

Customize this framework for your specific needs and tasks.

{{#if tasks_md}}
Tasks for deep work:
{{tasks_md}}
{{/if}}`,
      },
    ],
  },
  {
    title: 'Review and reflect',
    prompts: [
      {
        title: 'Daily Review',
        template: `Guide me through a productive daily review:

**What happened today:**
1. What did I complete? (celebrate wins, even small ones)
2. What didn't get done? (without judgment, just facts)
3. What surprised me? (unexpected challenges or insights)

**Learning and adjustment:**
4. What worked well? (systems, approaches, decisions to repeat)
5. What would I do differently? (specific adjustments for tomorrow)
6. What patterns do I notice? (energy, focus, productivity trends)

**Tomorrow's setup:**
7. What are my top 3 priorities?
8. What potential obstacles should I prepare for?

{{#if tasks_md}}
Today's tasks and activities:
{{tasks_md}}
{{/if}}`,
      },
      {
        title: 'Weekly Retrospective',
        template: `Conduct a comprehensive weekly retrospective:

**Week in review:**
1. **Wins and accomplishments** (what am I proud of?)
2. **Challenges and obstacles** (what was harder than expected?)
3. **Progress toward goals** (am I on track with bigger objectives?)

**Systems and processes:**
4. **What's working well?** (tools, habits, routines to keep)
5. **What needs adjustment?** (pain points to address next week)
6. **What experiments should I try?** (one small thing to test)

**Next week preparation:**
7. **Key outcomes** (what success looks like)
8. **Potential risks** (what could derail progress)
9. **Energy management** (how to maintain sustainable productivity)

{{#if tasks_md}}
This week's tasks and outcomes:
{{tasks_md}}
{{/if}}`,
      },
    ],
  },
  {
    title: 'Prepare for meetings',
    prompts: [
      {
        title: 'Meeting Prep Assistant',
        template: `Help me prepare for productive meetings:

**Before the meeting:**
1. **Clear objective** - What specific outcome do we need?
2. **My role** - How can I contribute most effectively?
3. **Key questions** - What do I need to ask or clarify?
4. **Preparation needed** - What should I review or bring?

**During the meeting:**
5. **Focus points** - What are the most important items?
6. **Decision needs** - What requires resolution today?
7. **Action items** - Who does what by when?

**After the meeting:**
8. **Follow-up actions** - What are my next steps?
9. **Communication** - Who needs to be updated?

{{#if tasks_md}}
Meeting context and related tasks:
{{tasks_md}}
{{/if}}`,
      },
      {
        title: 'Difficult Conversation Prep',
        template: `Prepare for a challenging conversation with confidence and clarity:

**Preparation framework:**
1. **Objective** - What outcome do I want? (be specific and realistic)
2. **Their perspective** - What might they be thinking/feeling?
3. **Common ground** - Where do our interests align?
4. **Key points** - What are my 2-3 most important messages?
5. **Evidence** - What facts support my position?
6. **Compromise options** - Where can I be flexible?
7. **Worst case plan** - How will I handle pushback or conflict?

Focus on mutual problem-solving rather than winning.

{{#if tasks_md}}
Context and background:
{{tasks_md}}
{{/if}}`,
      },
    ],
  },
];
