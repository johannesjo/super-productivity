import { computed, Injectable, signal } from '@angular/core';
import { Project } from '../../../project/project.model';
import { Tag } from '../../../tag/tag.model';
import { shortSyntax } from '../../short-syntax';
import { ShortSyntaxConfig } from '../../../config/global-config.model';
import { unique } from '../../../../util/unique';

export interface TaskInputState {
  project: Project | null;
  tags: Tag[];
  date: Date | null;
  time: string | null;
  estimate: number | null;
  newTagTitles: string[];
  rawText: string;
  cleanText: string;
  // Track only tags that came from syntax (so we can remove them when UI changes)
  syntaxTags: Tag[];
}

@Injectable()
export class TaskInputStateService {
  private state = signal<TaskInputState>({
    project: null,
    tags: [],
    date: null,
    time: null,
    estimate: null,
    newTagTitles: [],
    rawText: '',
    cleanText: '',
    syntaxTags: [],
  });

  // Public readonly state and computed values
  readonly currentState = this.state.asReadonly();
  readonly isAutoDetected = computed(() => {
    const s = this.state();
    // Auto-detected if all current tags are syntax tags
    return s.syntaxTags.length > 0 && s.tags.every((tag) => s.syntaxTags.includes(tag));
  });
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

    // Extract syntax values
    const syntaxProject = parseResult?.projectId
      ? allProjects.find((p) => p.id === parseResult.projectId) || null
      : null;
    const syntaxTags = parseResult?.taskChanges?.tagIds
      ? (parseResult.taskChanges.tagIds
          .map((id) => allTags.find((t) => t.id === id))
          .filter(Boolean) as Tag[])
      : [];
    const syntaxDate = parseResult?.taskChanges?.dueWithTime
      ? new Date(parseResult.taskChanges.dueWithTime)
      : null;
    const syntaxTime = parseResult?.taskChanges?.dueWithTime
      ? this.extractTimeFromDate(
          parseResult.taskChanges.dueWithTime,
          parseResult.taskChanges.hasPlannedTime,
        )
      : null;
    const syntaxEstimate = parseResult?.taskChanges?.timeEstimate ?? null;

    this.state.update((current) => ({
      ...current,
      rawText: text,
      cleanText,
      // Always update with parsed values (last assigned wins)
      project: syntaxProject || current.project || inboxProject || null,
      tags: unique([
        ...current.tags.filter((t) => !current.syntaxTags.includes(t)),
        ...syntaxTags,
      ]),
      date: syntaxDate || current.date,
      time: syntaxTime || current.time,
      estimate: syntaxEstimate || current.estimate,
      syntaxTags, // Track which tags came from syntax
      newTagTitles: unique(parseResult?.newTagTitles || []),
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
    this.state.update((current) => ({
      ...current,
      project,
      rawText: this.removeSyntaxFromText(current.rawText, 'project'),
    }));
  }

  updateTags(tags: Tag[]): void {
    this.state.update((current) => {
      // Find which tags were removed
      const removedTags = current.tags.filter((t) => !tags.includes(t));

      // Only remove syntax for tags that were actually removed AND were syntax tags
      const removedSyntaxTags = removedTags.filter((t) => current.syntaxTags.includes(t));

      // Keep syntax tags that weren't removed
      const remainingSyntaxTags = current.syntaxTags.filter(
        (t) => !removedTags.includes(t),
      );

      let cleanedText = current.rawText;

      // Only remove syntax from text for the specific tags that were removed
      for (const removedTag of removedSyntaxTags) {
        cleanedText = cleanedText.replace(
          new RegExp(`\\s*#${removedTag.title}\\b`, 'g'),
          '',
        );
      }

      return {
        ...current,
        tags,
        syntaxTags: remainingSyntaxTags,
        newTagTitles: tags.length === 0 ? [] : current.newTagTitles,
        rawText: cleanedText.trim(),
      };
    });
  }

  toggleTag(tag: Tag): void {
    const current = this.state();
    const hasTag = current.tags.some((t) => t.id === tag.id);
    const newTags = hasTag
      ? current.tags.filter((t) => t.id !== tag.id)
      : [...current.tags, tag];
    this.updateTags(newTags);
  }

  updateDate(date: Date | null, time?: string | null): void {
    this.state.update((current) => ({
      ...current,
      date,
      time: time !== undefined ? time : current.time,
      rawText: this.removeSyntaxFromText(current.rawText, 'date'),
    }));
  }

  updateTime(time: string | null): void {
    this.state.update((current) => ({
      ...current,
      time,
      rawText: this.removeSyntaxFromText(current.rawText, 'date'),
    }));
  }

  updateEstimate(estimate: number | null): void {
    this.state.update((current) => ({
      ...current,
      estimate,
      rawText: this.removeSyntaxFromText(current.rawText, 'estimate'),
    }));
  }

  clearDate(): void {
    this.state.update((current) => ({
      ...current,
      date: null,
      time: null,
      rawText: this.removeSyntaxFromText(current.rawText, 'date'),
    }));
  }

  clearTags(): void {
    this.state.update((current) => {
      let cleanedText = current.rawText;

      // Only remove syntax from text for syntax tags
      for (const syntaxTag of current.syntaxTags) {
        cleanedText = cleanedText.replace(
          new RegExp(`\\s*#${syntaxTag.title}\\b`, 'g'),
          '',
        );
      }

      return {
        ...current,
        tags: [],
        syntaxTags: [],
        newTagTitles: [],
        rawText: cleanedText.trim(),
      };
    });
  }

  clearEstimate(): void {
    this.state.update((current) => ({
      ...current,
      estimate: null,
      rawText: this.removeSyntaxFromText(current.rawText, 'estimate'),
    }));
  }

  private removeSyntaxFromText(
    text: string,
    type: 'project' | 'tags' | 'date' | 'estimate',
  ): string {
    let cleanedText = text;

    switch (type) {
      case 'project':
        // Remove project syntax like "+project"
        cleanedText = cleanedText.replace(/\s*\+\S+/g, '');
        break;
      case 'tags':
        // Remove tag syntax like "#tag"
        cleanedText = cleanedText.replace(/\s*#\S+/g, '');
        break;
      case 'date':
        // Remove date/time syntax like "@Tomorrow", "@16:00"
        cleanedText = cleanedText.replace(/\s*@\S+/g, '');
        break;
      case 'estimate':
        // Remove estimate syntax like "2h", "30m"
        cleanedText = cleanedText.replace(/\s*\d+[hm]\b/g, '');
        break;
    }

    return cleanedText.trim();
  }

  reset(inboxProject?: Project | null): void {
    // Keep current values for convenience
    const current = this.state();

    this.state.set({
      project: inboxProject || current.project || null,
      tags: current.tags, // Keep current tags
      date: current.date, // Keep current date
      time: current.time, // Keep current time
      estimate: current.estimate, // Keep current estimate
      syntaxTags: [], // Clear syntax tracking on reset
      newTagTitles: [], // Clear new tag titles on reset
      rawText: '',
      cleanText: '',
    });
  }
}
