import { Injectable, signal, computed } from '@angular/core';
import { Project } from '../../../project/project.model';
import { Tag } from '../../../tag/tag.model';
import { shortSyntax } from '../../short-syntax';
import { ShortSyntaxConfig } from '../../../config/global-config.model';

export interface TaskInputState {
  project: Project | null;
  tags: Tag[];
  newTagTitles: string[];
  date: Date | null;
  time: string | null;
  estimate: number | null;
  rawText: string;
  cleanText: string;
  isUsingUI: boolean;
}

@Injectable()
export class TaskInputStateService {
  private state = signal<TaskInputState>({
    project: null,
    tags: [],
    newTagTitles: [],
    date: null,
    time: null,
    estimate: null,
    rawText: '',
    cleanText: '',
    isUsingUI: false,
  });

  // Public readonly state and computed values
  readonly currentState = this.state.asReadonly();
  readonly isAutoDetected = computed(() => !this.state().isUsingUI);
  readonly hasValues = computed(() => {
    const s = this.state();
    return !!(s.project || s.tags.length || s.date || s.estimate);
  });
  readonly hasNewTags = computed(() => this.state().newTagTitles.length > 0);

  updateFromText(
    text: string,
    config: ShortSyntaxConfig,
    allProjects: Project[],
    allTags: Tag[],
  ): void {
    const parseResult = shortSyntax(
      { title: text, tagIds: [], projectId: undefined },
      config,
      allTags,
      allProjects,
    );

    const cleanText = parseResult?.taskChanges?.title?.trim() || text.trim();
    const isInUIMode = this.state().isUsingUI;
    const inboxProject = allProjects.find((p) => p.id === 'INBOX_PROJECT');

    this.state.update((current) => ({
      ...current,
      rawText: text,
      cleanText,
      isUsingUI: false,

      // Always ensure a project is selected - default to inbox if none found
      project: parseResult?.projectId
        ? allProjects.find((p) => p.id === parseResult.projectId) ||
          current.project ||
          inboxProject ||
          null
        : isInUIMode
          ? current.project
          : current.project || inboxProject || null,

      tags: parseResult?.taskChanges?.tagIds?.length
        ? (parseResult.taskChanges.tagIds
            .map((id) => allTags.find((t) => t.id === id))
            .filter(Boolean) as Tag[])
        : current.tags, // Always keep current tags if not parsed from text

      newTagTitles: parseResult?.newTagTitles || [],

      date: parseResult?.taskChanges?.dueWithTime
        ? new Date(parseResult.taskChanges.dueWithTime)
        : isInUIMode
          ? current.date
          : null,

      time: parseResult?.taskChanges?.dueWithTime
        ? this.extractTimeFromDate(
            parseResult.taskChanges.dueWithTime,
            parseResult.taskChanges.hasPlannedTime,
          )
        : current.time, // Always keep current time if not parsed from text

      estimate: parseResult?.taskChanges?.timeEstimate || current.estimate, // Always keep current estimate if not parsed
    }));
  }

  private extractTimeFromDate(
    timestamp: number,
    hasPlannedTime?: boolean,
  ): string | null {
    if (hasPlannedTime === false) return null;

    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  updateProject(project: Project | null): void {
    this.updateUI({ project });
  }

  updateTags(tags: Tag[]): void {
    this.updateUI({ tags });
  }

  toggleTag(tag: Tag): void {
    const currentTags = this.state().tags;
    const hasTag = currentTags.some((t) => t.id === tag.id);
    const newTags = hasTag
      ? currentTags.filter((t) => t.id !== tag.id)
      : [...currentTags, tag];
    this.updateTags(newTags);
  }

  updateDate(date: Date | null, time?: string | null): void {
    this.updateUI({
      date,
      ...(time !== undefined && { time }),
    });
  }

  updateTime(time: string | null): void {
    this.updateUI({ time });
  }

  updateEstimate(estimate: number | null): void {
    this.updateUI({ estimate });
  }

  private updateUI(changes: Partial<TaskInputState>): void {
    this.state.update((current) => ({
      ...current,
      ...changes,
      rawText: current.cleanText, // Clean text when using UI
      isUsingUI: true,
    }));
  }

  reset(inboxProject?: Project | null): void {
    // Keep tags, time, date, and estimate for convenience
    const current = this.state();

    this.state.set({
      project: inboxProject || current.project || null,
      tags: current.tags, // Keep tags
      newTagTitles: [], // Clear new tag titles on reset
      date: current.date, // Keep date preference for batch task creation
      time: current.time, // Keep time preference
      estimate: current.estimate, // Keep estimate preference
      rawText: '',
      cleanText: '',
      isUsingUI: false,
    });
  }
}
