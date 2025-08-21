import { Injectable, signal } from '@angular/core';
import { Project } from '../../../project/project.model';
import { Tag } from '../../../tag/tag.model';
import { shortSyntax } from '../../short-syntax';
import { ShortSyntaxConfig } from '../../../config/global-config.model';

export interface TaskInputState {
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

@Injectable()
export class TaskInputStateService {
  private state = signal<TaskInputState>({
    project: null,
    tags: [],
    date: null,
    time: null,
    estimate: null,
    rawText: '',
    cleanText: '',
    isUsingUI: false,
  });

  // Public readonly state
  readonly currentState = this.state.asReadonly();

  /**
   * Update state from text input
   * Parses short syntax and updates all related fields
   */
  updateFromText(
    text: string,
    config: ShortSyntaxConfig,
    allProjects: Project[],
    allTags: Tag[],
  ): void {
    // Parse the text for short syntax
    const parseResult = shortSyntax(
      { title: text, tagIds: [], projectId: undefined },
      config,
      allTags,
      allProjects,
    );

    // Extract clean text (without syntax markers)
    const cleanText = parseResult?.taskChanges?.title || text;

    // Build new state from parse results
    const newState: Partial<TaskInputState> = {
      rawText: text,
      cleanText: cleanText.trim(),
    };

    // Update project if found
    if (parseResult?.projectId) {
      const project = allProjects.find((p) => p.id === parseResult.projectId);
      if (project) {
        newState.project = project;
      }
    } else if (!this.state().isUsingUI) {
      // Only clear if we're not in UI mode (user is typing)
      newState.project = null;
    }

    // Update tags if found
    if (parseResult?.taskChanges?.tagIds && parseResult.taskChanges.tagIds.length > 0) {
      const tags = parseResult.taskChanges.tagIds
        .map((id) => allTags.find((t) => t.id === id))
        .filter(Boolean) as Tag[];
      newState.tags = tags;
    } else if (!this.state().isUsingUI) {
      newState.tags = [];
    }

    // Update date/time if found
    if (parseResult?.taskChanges?.dueWithTime) {
      const date = new Date(parseResult.taskChanges.dueWithTime);
      newState.date = date;

      if (parseResult.taskChanges.hasPlannedTime !== false) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        newState.time = `${hours}:${minutes}`;
      } else {
        newState.time = null;
      }
    } else if (!this.state().isUsingUI) {
      newState.date = null;
      newState.time = null;
    }

    // Update estimate if found
    if (parseResult?.taskChanges?.timeEstimate) {
      newState.estimate = parseResult.taskChanges.timeEstimate;
    } else if (!this.state().isUsingUI) {
      newState.estimate = null;
    }

    // Set isUsingUI to false when parsing from text
    newState.isUsingUI = false;

    // Apply state update
    this.state.update((s) => ({ ...s, ...newState }));
  }

  /**
   * Update project from UI selection
   * Cleans text input and switches to UI mode
   */
  updateProject(project: Project | null): void {
    this.state.update((s) => ({
      ...s,
      project,
      rawText: s.cleanText, // Remove ALL syntax, keep only clean text
      isUsingUI: true, // Switch to UI mode
    }));
  }

  /**
   * Update tags from UI selection
   * Cleans text input and switches to UI mode
   */
  updateTags(tags: Tag[]): void {
    this.state.update((s) => ({
      ...s,
      tags,
      rawText: s.cleanText, // Remove ALL syntax, keep only clean text
      isUsingUI: true,
    }));
  }

  /**
   * Toggle a single tag
   */
  toggleTag(tag: Tag): void {
    const currentTags = this.state().tags;
    const hasTag = currentTags.some((t) => t.id === tag.id);

    if (hasTag) {
      this.updateTags(currentTags.filter((t) => t.id !== tag.id));
    } else {
      this.updateTags([...currentTags, tag]);
    }
  }

  /**
   * Update date from UI selection
   * Cleans text input and switches to UI mode
   */
  updateDate(date: Date | null, time?: string | null): void {
    this.state.update((s) => ({
      ...s,
      date,
      time: time !== undefined ? time : s.time,
      rawText: s.cleanText, // Remove ALL syntax, keep only clean text
      isUsingUI: true,
    }));
  }

  /**
   * Update time from UI selection
   */
  updateTime(time: string | null): void {
    this.state.update((s) => ({
      ...s,
      time,
      rawText: s.cleanText, // Remove ALL syntax, keep only clean text
      isUsingUI: true,
    }));
  }

  /**
   * Update estimate from UI input
   * Cleans text input and switches to UI mode
   */
  updateEstimate(estimate: number | null): void {
    this.state.update((s) => ({
      ...s,
      estimate,
      rawText: s.cleanText, // Remove ALL syntax, keep only clean text
      isUsingUI: true,
    }));
  }

  /**
   * Clear all values and reset to initial state
   */
  reset(): void {
    this.state.set({
      project: null,
      tags: [],
      date: null,
      time: null,
      estimate: null,
      rawText: '',
      cleanText: '',
      isUsingUI: false,
    });
  }
}
