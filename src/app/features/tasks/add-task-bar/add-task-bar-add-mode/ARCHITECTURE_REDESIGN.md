# Add Task Bar Architecture Redesign

## Problem Statement

Current implementation has inconsistent behavior between short syntax and UI controls:

- Short syntax updates UI controls but not vice versa
- Manual selections don't clean up the text input
- Complex state management with separate tracking for auto-detected vs manual values
- Mixed input methods create confusion

## Design Goals

1. **Simplified Synchronization**: Text input updates UI controls, UI interactions clean text input
2. **Uniform Behavior**: All form elements work consistently
3. **Single Source of Truth**: One state model for all values
4. **Clean Architecture**: Clear separation between parsing, state, and UI

## Proposed Architecture

### Core Concepts

#### 1. Unified State Model

```typescript
interface TaskInputState {
  // Core values - single source of truth
  project: Project | null;
  tags: Tag[];
  date: Date | null;
  time: string | null;
  estimate: number | null;

  // Text representations
  rawText: string; // Full text including syntax
  cleanText: string; // Text without syntax markers

  // Input mode tracking
  isUsingUI: boolean; // Track if user switched to UI controls
}
```

#### 2. Simplified Sync Strategy

##### Text → UI (Parse Direction)

- User types in text field with short syntax
- Short syntax parser extracts values and clean text
- Update state model with parsed values
- UI controls reflect new values
- Keep original text with syntax intact
- Set `isUsingUI = false`

##### UI → Text (Clean Direction)

- User clicks/selects any UI control
- Update the specific control's value
- Replace text input with clean text only (remove ALL syntax)
- Set `isUsingUI = true`
- User continues with visual controls or can return to typing

### Implementation Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Component Layer                    │
├─────────────────────────────────────────────────────┤
│  TextInput  │  ProjectBtn  │  TagsBtn  │  DateBtn   │
└──────┬──────┴──────┬────────┴─────┬─────┴─────┬─────┘
       │             │              │           │
       ▼             ▼              ▼           ▼
┌─────────────────────────────────────────────────────┐
│               State Manager (Signal)                 │
│  - Single TaskInputState instance                    │
│  - Handles parsing and UI-triggered cleaning         │
└─────────────────────────────────────────────────────┘
       ▲
       │
┌──────┴────────┐
│ Text Parser   │
│ (text → state)│
└───────────────┘
```

### Key Services

#### 1. TaskInputStateService

```typescript
class TaskInputStateService {
  private state = signal<TaskInputState>(initialState);

  // Parse text and update UI controls
  updateFromText(text: string): void {
    const parsed = this.parseText(text);
    this.state.update((s) => ({
      ...s,
      ...parsed,
      rawText: text,
      isUsingUI: false, // User is typing, not using UI
    }));
  }

  // UI control updates - all clean the text input
  updateProject(project: Project | null): void {
    this.state.update((s) => ({
      ...s,
      project,
      rawText: s.cleanText, // Remove ALL syntax, keep only clean text
      isUsingUI: true, // User switched to UI mode
    }));
  }

  updateTags(tags: Tag[]): void {
    this.state.update((s) => ({
      ...s,
      tags,
      rawText: s.cleanText, // Remove ALL syntax, keep only clean text
      isUsingUI: true,
    }));
  }

  updateDate(date: Date | null): void {
    this.state.update((s) => ({
      ...s,
      date,
      rawText: s.cleanText, // Remove ALL syntax, keep only clean text
      isUsingUI: true,
    }));
  }

  updateEstimate(estimate: number | null): void {
    this.state.update((s) => ({
      ...s,
      estimate,
      rawText: s.cleanText, // Remove ALL syntax, keep only clean text
      isUsingUI: true,
    }));
  }

  private parseText(text: string): Partial<TaskInputState> {
    // Use existing short syntax parser
    const result = shortSyntax(text, config, allTags, allProjects);

    return {
      cleanText: result?.taskChanges?.title || text,
      project: result?.projectId ? findProject(result.projectId) : null,
      tags: result?.taskChanges?.tagIds ? findTags(result.taskChanges.tagIds) : [],
      date: result?.taskChanges?.dueWithTime
        ? new Date(result.taskChanges.dueWithTime)
        : null,
      estimate: result?.taskChanges?.timeEstimate || null,
    };
  }
}
```

#### 2. Enhanced Parser Integration

The existing `shortSyntax` function already handles parsing. We just need to extract the clean text alongside the parsed values:

```typescript
interface ParseResult {
  cleanText: string; // Text without any syntax markers
  project?: Project;
  tags?: Tag[];
  date?: Date;
  estimate?: number;
}

function enhancedParse(
  text: string,
  config: ShortSyntaxConfig,
  allProjects: Project[],
  allTags: Tag[],
): ParseResult {
  const result = shortSyntax(
    { title: text, tagIds: [], projectId: undefined },
    config,
    allTags,
    allProjects,
  );

  return {
    cleanText: result?.taskChanges?.title?.trim() || text.trim(),
    project: result?.projectId
      ? allProjects.find((p) => p.id === result.projectId)
      : undefined,
    tags: result?.taskChanges?.tagIds
      ? result.taskChanges.tagIds
          .map((id) => allTags.find((t) => t.id === id))
          .filter(Boolean)
      : [],
    date: result?.taskChanges?.dueWithTime
      ? new Date(result.taskChanges.dueWithTime)
      : undefined,
    estimate: result?.taskChanges?.timeEstimate,
  };
}
```

### Update Flow Examples

#### Example 1: User Types Short Syntax

1. User types: "Fix bug #urgent +ProjectA @tomorrow 2h"
2. Text change triggers `updateFromText()`
3. Parser extracts:
   - cleanText: "Fix bug"
   - tags: [urgent]
   - project: ProjectA
   - date: tomorrow's date
   - estimate: 2 hours
4. State updates with all values
5. UI controls update to show selected values
6. Text remains: "Fix bug #urgent +ProjectA @tomorrow 2h"

#### Example 2: User Clicks Project Button

1. User has typed: "Fix bug #urgent +ProjectA @tomorrow 2h"
2. UI controls show: urgent tag, ProjectA, tomorrow, 2h estimate
3. User clicks project button, selects "ProjectB"
4. UI triggers `updateProject(ProjectB)`
5. State manager:
   - Updates project to ProjectB
   - Cleans text input to just: "Fix bug"
   - Sets `isUsingUI = true`
6. User now continues with UI controls for other selections

#### Example 3: Mixed Workflow

1. User types: "Important task #urgent @today"
2. UI shows: urgent tag selected, today date selected
3. User clicks estimate button, selects "2h"
4. Text input becomes: "Important task" (all syntax removed)
5. User can continue using UI controls or type more text
6. If user types more: "Important task - needs review", the clean text updates
7. All UI selections remain active

### Benefits of This Simplified Architecture

1. **Clear Intent Separation**: Text input = syntax mode, UI clicks = visual mode
2. **No Syntax Conflicts**: UI interactions clean the text, preventing mixed syntax states
3. **Simple Mental Model**: Users understand that clicking controls removes syntax
4. **Reduced Complexity**: No need for complex text rebuilding or cursor management
5. **Maintainable**: Single direction of complexity (parsing only, no generation)
6. **Extensible**: Easy to add new UI controls without syntax generation logic

### Implementation Steps

1. **Phase 1: State Service**

   - Create simplified TaskInputStateService
   - Implement parsing integration with existing shortSyntax function
   - Add UI update methods that clean text input

2. **Phase 2: Component Integration**

   - Update component to use new service
   - Remove complex auto-detected tracking logic
   - Wire all UI controls to clean text on interaction

3. **Phase 3: Text Handling**

   - Ensure clean text extraction works correctly
   - Handle edge cases in parsing
   - Test with various syntax combinations

4. **Phase 4: User Experience**

   - Add smooth transitions between modes
   - Consider visual feedback for mode switches
   - Handle rapid user interactions gracefully

5. **Phase 5: Testing & Rollout**
   - Unit tests for state service
   - Integration tests for user workflows
   - Feature flag for gradual rollout

### Considerations

1. **Mode Transitions**: Provide clear visual feedback when switching from syntax to UI mode
2. **Debouncing**: Debounce text parsing to avoid excessive updates during typing
3. **Partial Syntax**: Handle incomplete syntax gracefully (e.g., "#" without tag name)
4. **Performance**: Use signals for efficient change detection
5. **User Education**: Consider showing hints about syntax → UI mode transitions

### Migration Strategy

1. Create new implementation alongside existing
2. Add feature flag to toggle between old/new
3. Test with subset of users
4. Gradually roll out
5. Remove old implementation

## Conclusion

This simplified architecture provides a clean, maintainable solution for consistent behavior between short syntax and UI controls. The key insight is that users have two distinct interaction modes:

- **Syntax Mode**: Type with short syntax, UI reflects the values
- **UI Mode**: Click controls to switch to visual interaction, text gets cleaned

This approach eliminates complexity while providing predictable, intuitive behavior. Users can easily switch between typing syntax and using visual controls without confusion about mixed states or conflicting input methods.
