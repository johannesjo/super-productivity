import { inject, Injectable } from '@angular/core';
import { Project } from '../../project/project.model';
import { Tag } from '../../tag/tag.model';
import { AddTaskBarStateService } from './add-task-bar-state.service';
import { shortSyntax } from '../short-syntax';
import { ShortSyntaxConfig } from '../../config/global-config.model';
import { getDbDateStr } from '../../../util/get-db-date-str';

interface PreviousParseResult {
  cleanText: string | null;
  projectId: string | null;
  tagIds: string[];
  newTagTitles: string[];
  timeEstimate: number | null;
  dueDate: string | null;
  dueTime: string | null;
}

@Injectable()
export class AddTaskBarParserService {
  private readonly _stateService = inject(AddTaskBarStateService);
  private _previousParseResult: PreviousParseResult | null = null;

  private _arraysEqual<T>(a: T[], b: T[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  private _datesEqual(a: string | null, b: string | null): boolean {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return a === b;
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
      // Preserve current user-selected values instead of falling back to defaults
      const currentState = this._stateService.state();

      currentResult = {
        cleanText: text,
        projectId: this._stateService.isAutoDetected()
          ? defaultProject?.id || null
          : null,
        tagIds: [],
        newTagTitles: [],
        timeEstimate: null,
        // Preserve current date/time if user has selected them, otherwise use defaults
        dueDate: currentState.date || (defaultDate ? defaultDate : null),
        dueTime: currentState.time || defaultTime || null,
      };
    } else {
      // Extract parsed values
      const tagIds = parseResult.taskChanges.tagIds || [];
      const newTagTitles = parseResult.newTagTitles || [];

      let dueDate: string | null = null;
      let dueTime: string | null = null;

      if (parseResult.taskChanges.dueWithTime) {
        const dueDateObj = new Date(parseResult.taskChanges.dueWithTime);
        dueDate = getDbDateStr(dueDateObj);

        if (parseResult.taskChanges.hasPlannedTime !== false) {
          const hours = dueDateObj.getHours().toString().padStart(2, '0');
          const minutes = dueDateObj.getMinutes().toString().padStart(2, '0');
          const timeStr = `${hours}:${minutes}`;

          if (timeStr !== '00:00') {
            dueTime = timeStr;
          }
        }
      } else if (defaultDate) {
        dueDate = defaultDate;
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
          this._stateService.setAutoDetectedProjectId(foundProject.id);
        }
      } else if (this._stateService.isAutoDetected()) {
        if (defaultProject?.id) {
          this._stateService.updateProjectId(defaultProject.id);
        }
      }
    }

    if (
      !this._previousParseResult ||
      !this._arraysEqual(this._previousParseResult.tagIds, currentResult.tagIds)
    ) {
      this._stateService.updateTagIds(currentResult.tagIds);
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

  removeShortSyntaxFromInput(
    currentInput: string,
    type: 'tags' | 'date' | 'estimate',
    specificTag?: string,
  ): string {
    if (!currentInput) return currentInput;

    let cleanedInput = currentInput;

    switch (type) {
      case 'tags':
        if (specificTag) {
          // Remove specific tag (e.g., #tagname)
          const tagRegex = new RegExp(`\\s*#${specificTag}\\b`, 'gi');
          cleanedInput = cleanedInput.replace(tagRegex, '');
        } else {
          // Remove all tags (e.g., #tag1 #tag2)
          cleanedInput = cleanedInput.replace(/\s*#\w+/g, '');
        }
        break;

      case 'date':
        // Remove date and time syntax (e.g., @today @16:30 @2024-01-15)
        cleanedInput = cleanedInput.replace(/\s*@\S+/g, '');
        break;

      case 'estimate':
        // Remove estimate syntax (e.g., t30m, 1h, 30m/1h, t1.5h)
        // This matches the SHORT_SYNTAX_TIME_REG_EX from short-syntax.ts
        cleanedInput = cleanedInput.replace(
          /(?:\s|^)t?((\d+(?:\.\d+)?[mhd])(?:\s*\/\s*(\d+(?:\.\d+)?[mhd]))?)/gi,
          ' ',
        );
        break;
    }

    // Clean up extra whitespace
    return cleanedInput.replace(/\s+/g, ' ').trim();
  }
}
