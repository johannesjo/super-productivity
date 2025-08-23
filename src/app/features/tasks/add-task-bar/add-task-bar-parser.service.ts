import { inject, Injectable } from '@angular/core';
import { Project } from '../../project/project.model';
import { Tag } from '../../tag/tag.model';
import { AddTaskBarStateService } from './add-task-bar-state.service';
import { shortSyntax } from '../short-syntax';
import { ShortSyntaxConfig } from '../../config/global-config.model';

interface PreviousParseResult {
  cleanText: string | null;
  projectId: string | null;
  tagIds: string[];
  newTagTitles: string[];
  timeEstimate: number | null;
  dueDate: Date | null;
  dueTime: string | null;
}

@Injectable()
export class AddTaskBarParserService {
  private readonly _stateService = inject(AddTaskBarStateService);
  private _previousParseResult: PreviousParseResult | null = null;

  private _arraysEqual<T>(a: T[], b: T[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  private _datesEqual(a: Date | null, b: Date | null): boolean {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return a.getTime() === b.getTime();
  }

  parseAndUpdateText(
    text: string,
    config: ShortSyntaxConfig | null,
    allProjects: Project[],
    allTags: Tag[],
    defaultProject: Project,
    defaultDate?: string,
    defaultTime?: string,
  ): void {
    if (!text || !config) {
      this._previousParseResult = null;
      return;
    }

    // Get current tags from state to pass as tagIds
    const parseResult = shortSyntax(
      { title: text, tagIds: [] },
      config,
      allTags,
      allProjects,
    );

    // Create current parse result data structure
    let currentResult: PreviousParseResult;

    if (!parseResult) {
      // No parse result means no short syntax found
      currentResult = {
        cleanText: text,
        projectId: this._stateService.isAutoDetected()
          ? defaultProject?.id || null
          : null,
        tagIds: [],
        newTagTitles: [],
        timeEstimate: null,
        dueDate: defaultDate ? new Date(defaultDate) : null,
        dueTime: defaultTime || null,
      };
    } else {
      // Extract parsed values
      const tagIds = parseResult.taskChanges.tagIds || [];
      const newTagTitles = parseResult.newTagTitles || [];

      let dueDate: Date | null = null;
      let dueTime: string | null = null;

      if (parseResult.taskChanges.dueWithTime) {
        dueDate = new Date(parseResult.taskChanges.dueWithTime);

        if (parseResult.taskChanges.hasPlannedTime !== false) {
          const hours = dueDate.getHours().toString().padStart(2, '0');
          const minutes = dueDate.getMinutes().toString().padStart(2, '0');
          const timeStr = `${hours}:${minutes}`;

          if (timeStr !== '00:00') {
            dueTime = timeStr;
          }
        }
      } else if (defaultDate) {
        dueDate = new Date(defaultDate);
        dueTime = defaultTime || null;
      }

      currentResult = {
        cleanText: parseResult.taskChanges.title || text,
        projectId: parseResult.projectId || null,
        tagIds: tagIds,
        newTagTitles: newTagTitles,
        timeEstimate: parseResult.taskChanges.timeEstimate || null,
        dueDate: dueDate,
        dueTime: dueTime,
      };
    }

    // Compare with previous result and only update changed values
    if (
      !this._previousParseResult ||
      this._previousParseResult.cleanText !== currentResult.cleanText
    ) {
      this._stateService.updateCleanText(currentResult.cleanText);
    }

    if (
      !this._previousParseResult ||
      this._previousParseResult.projectId !== currentResult.projectId
    ) {
      if (currentResult.projectId) {
        const foundProject = allProjects.find((p) => p.id === currentResult.projectId);
        if (foundProject) {
          this._stateService.setAutoDetectedProject(foundProject);
        }
      } else if (this._stateService.isAutoDetected()) {
        this._stateService.updateProject(defaultProject || null);
      }
    }

    if (
      !this._previousParseResult ||
      !this._arraysEqual(this._previousParseResult.tagIds, currentResult.tagIds)
    ) {
      const foundTags = allTags.filter((tag) => currentResult.tagIds.includes(tag.id));
      this._stateService.updateTags(foundTags);
    }

    if (
      !this._previousParseResult ||
      !this._arraysEqual(
        this._previousParseResult.newTagTitles,
        currentResult.newTagTitles,
      )
    ) {
      this._stateService.updateNewTagTitles(currentResult.newTagTitles);
    }

    if (
      !this._previousParseResult ||
      this._previousParseResult.timeEstimate !== currentResult.timeEstimate
    ) {
      this._stateService.updateEstimate(currentResult.timeEstimate);
    }

    const dateChanged =
      !this._previousParseResult ||
      !this._datesEqual(this._previousParseResult.dueDate, currentResult.dueDate) ||
      this._previousParseResult.dueTime !== currentResult.dueTime;

    if (dateChanged) {
      this._stateService.updateDate(currentResult.dueDate, currentResult.dueTime);
    }

    // Store current result as previous for next comparison
    this._previousParseResult = currentResult;
  }

  resetPreviousResult(): void {
    this._previousParseResult = null;
  }
}
