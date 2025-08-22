import { computed, Injectable, signal } from '@angular/core';
import { Project } from '../../../project/project.model';
import { Tag } from '../../../tag/tag.model';
import { shortSyntax } from '../../short-syntax';
import { ShortSyntaxConfig } from '../../../config/global-config.model';
import { unique } from '../../../../util/unique';

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
  // Track which fields were set via UI vs short syntax
  fieldSources: {
    project: 'ui' | 'syntax' | null;
    tags: 'ui' | 'syntax' | null;
    date: 'ui' | 'syntax' | null;
    estimate: 'ui' | 'syntax' | null;
  };
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
    fieldSources: {
      project: null,
      tags: null,
      date: null,
      estimate: null,
    },
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
    const inboxProject = allProjects.find((p) => p.id === 'INBOX_PROJECT');
    const current = this.state();

    // Extract parsed values safely
    const parsedProject = parseResult?.projectId
      ? allProjects.find((p) => p.id === parseResult.projectId)
      : null;
    const parsedTags = parseResult?.taskChanges?.tagIds
      ? (parseResult.taskChanges.tagIds
          .map((id) => allTags.find((t) => t.id === id))
          .filter(Boolean) as Tag[])
      : [];
    const parsedDate = parseResult?.taskChanges?.dueWithTime
      ? new Date(parseResult.taskChanges.dueWithTime)
      : null;
    const parsedTime = parseResult?.taskChanges?.dueWithTime
      ? this.extractTimeFromDate(
          parseResult.taskChanges.dueWithTime,
          parseResult.taskChanges.hasPlannedTime,
        )
      : null;
    const parsedEstimate = parseResult?.taskChanges?.timeEstimate ?? null;

    this.state.update(() => ({
      rawText: text,
      cleanText,
      isUsingUI: false,

      project:
        this.getValueOrKeepUI(
          parsedProject,
          current.project,
          current.fieldSources.project,
        ) ||
        inboxProject ||
        null,

      tags: unique(
        this.getValueOrKeepUI(parsedTags, current.tags, current.fieldSources.tags) || [],
      ),

      newTagTitles: unique(parseResult?.newTagTitles || []),

      date: this.getValueOrKeepUI(parsedDate, current.date, current.fieldSources.date),

      time: this.getValueOrKeepUI(parsedTime, current.time, current.fieldSources.date),

      estimate: this.getValueOrKeepUI(
        parsedEstimate,
        current.estimate,
        current.fieldSources.estimate,
      ),

      fieldSources: {
        project: parsedProject ? 'syntax' : current.fieldSources.project,
        tags: parsedTags.length > 0 ? 'syntax' : current.fieldSources.tags,
        date: parsedDate ? 'syntax' : current.fieldSources.date,
        estimate: parsedEstimate !== null ? 'syntax' : current.fieldSources.estimate,
      },
    }));
  }

  private getValueOrKeepUI<T>(
    syntaxValue: T | null,
    currentValue: T | null,
    fieldSource: 'ui' | 'syntax' | null,
  ): T | null {
    if (syntaxValue !== null) return syntaxValue;
    return fieldSource === 'ui' ? currentValue : null;
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
    this.state.update((current) => ({
      ...current,
      project,
      isUsingUI: true,
      fieldSources: {
        ...current.fieldSources,
        project: 'ui',
      },
    }));
  }

  updateTags(tags: Tag[]): void {
    this.state.update((current) => ({
      ...current,
      tags,
      // Clear new tag titles when clearing tags
      newTagTitles: tags.length === 0 ? [] : current.newTagTitles,
      isUsingUI: true,
      fieldSources: {
        ...current.fieldSources,
        tags: 'ui',
      },
    }));
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
    this.state.update((current) => ({
      ...current,
      date,
      ...(time !== undefined && { time }),
      isUsingUI: true,
      fieldSources: {
        ...current.fieldSources,
        date: 'ui',
      },
    }));
  }

  updateTime(time: string | null): void {
    this.state.update((current) => ({
      ...current,
      time,
      isUsingUI: true,
      fieldSources: {
        ...current.fieldSources,
        date: 'ui', // Time is part of date
      },
    }));
  }

  updateEstimate(estimate: number | null): void {
    this.state.update((current) => ({
      ...current,
      estimate,
      isUsingUI: true,
      fieldSources: {
        ...current.fieldSources,
        estimate: 'ui',
      },
    }));
  }

  clearDate(): void {
    this.state.update((current) => ({
      ...current,
      date: null,
      time: null,
      fieldSources: {
        ...current.fieldSources,
        date: null,
      },
    }));
  }

  clearTags(): void {
    this.state.update((current) => ({
      ...current,
      tags: [],
      newTagTitles: [],
      fieldSources: {
        ...current.fieldSources,
        tags: null,
      },
    }));
  }

  clearEstimate(): void {
    this.state.update((current) => ({
      ...current,
      estimate: null,
      fieldSources: {
        ...current.fieldSources,
        estimate: null,
      },
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
      fieldSources: {
        project: current.fieldSources.project,
        tags: current.fieldSources.tags,
        date: current.fieldSources.date,
        estimate: current.fieldSources.estimate,
      },
    });
  }
}
