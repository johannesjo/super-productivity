import { Injectable, signal, computed } from '@angular/core';
import { Project } from '../../../project/project.model';
import { Tag } from '../../../tag/tag.model';
import { shortSyntax } from '../../short-syntax';
import { ShortSyntaxConfig } from '../../../config/global-config.model';

export interface TaskInputState {
  project: Project | null;
  tags: Tag[];
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

    this.state.update((current) => ({
      ...current,
      rawText: text,
      cleanText,
      isUsingUI: false,

      // Only update values if not in UI mode or if values are found
      project: parseResult?.projectId
        ? allProjects.find((p) => p.id === parseResult.projectId) || current.project
        : isInUIMode
          ? current.project
          : null,

      tags: parseResult?.taskChanges?.tagIds?.length
        ? (parseResult.taskChanges.tagIds
            .map((id) => allTags.find((t) => t.id === id))
            .filter(Boolean) as Tag[])
        : isInUIMode
          ? current.tags
          : [],

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
        : isInUIMode
          ? current.time
          : null,

      estimate:
        parseResult?.taskChanges?.timeEstimate || (isInUIMode ? current.estimate : null),
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
