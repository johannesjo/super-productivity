import { inject, Injectable } from '@angular/core';
import { Project } from '../../project/project.model';
import { Tag } from '../../tag/tag.model';
import { AddTaskBarStateService } from './add-task-bar-state.service';
import { shortSyntax } from '../short-syntax';
import { ShortSyntaxConfig } from '../../config/global-config.model';

@Injectable()
export class AddTaskBarParserService {
  private readonly _stateService = inject(AddTaskBarStateService);

  parseAndUpdateText(
    text: string,
    config: ShortSyntaxConfig | null,
    allProjects: Project[],
    allTags: Tag[],
    defaultProject: Project,
    defaultDate?: string,
    defaultTime?: string,
  ): void {
    if (text && config) {
      // Get current tags from state to pass as tagIds
      const parseResult = shortSyntax(
        { title: text, tagIds: [] },
        config,
        allTags,
        allProjects,
      );

      // defaultProject is already passed as a Project object, no need to find it
      if (!parseResult) {
        // No parse result means no short syntax found - clear everything
        this._stateService.updateCleanText(text);
        if (this._stateService.isAutoDetected()) {
          this._stateService.updateProject(defaultProject);
        }
        this._stateService.updateTags([]);
        this._stateService.updateNewTagTitles([]);
        this._stateService.updateEstimate(null);
        this._stateService.updateDate(
          defaultDate ? new Date(defaultDate) : null,
          defaultTime,
        );
        return;
      }

      // Update clean text
      if (parseResult.taskChanges.title) {
        this._stateService.updateCleanText(parseResult.taskChanges.title);
      }

      // Update project if found
      if (parseResult.projectId) {
        const foundProject = allProjects.find((p) => p.id === parseResult.projectId);
        if (foundProject) {
          this._stateService.setAutoDetectedProject(foundProject);
        }
      } else if (this._stateService.isAutoDetected()) {
        // Clear auto-detected project if no project found in text
        if (defaultProject) {
          this._stateService.updateProject(defaultProject);
        } else {
          this._stateService.updateProject(null);
        }
      }

      // Update tags - always set to what was parsed (could be empty)
      if (parseResult.taskChanges.tagIds) {
        const foundTags = allTags.filter((tag) =>
          parseResult.taskChanges.tagIds?.includes(tag.id),
        );
        this._stateService.updateTags(foundTags);
      } else {
        // No tags found in text, clear them
        this._stateService.updateTags([]);
      }

      // Update new tag titles - always set to what was parsed
      this._stateService.updateNewTagTitles(parseResult.newTagTitles || []);

      // Update time estimate
      if ('timeEstimate' in parseResult.taskChanges) {
        this._stateService.updateEstimate(parseResult.taskChanges.timeEstimate || null);
      }

      // Update due date and time
      if (parseResult.taskChanges.dueWithTime) {
        const dueDate = new Date(parseResult.taskChanges.dueWithTime);

        // Check if time was specified
        if (parseResult.taskChanges.hasPlannedTime !== false) {
          const hours = dueDate.getHours().toString().padStart(2, '0');
          const minutes = dueDate.getMinutes().toString().padStart(2, '0');
          const timeStr = `${hours}:${minutes}`;

          // Only set time if it's not 00:00 (which indicates no time was specified)
          if (timeStr !== '00:00') {
            this._stateService.updateDate(dueDate, timeStr);
          } else {
            this._stateService.updateDate(dueDate, null);
          }
        } else {
          this._stateService.updateDate(dueDate, null);
        }
      } else {
        // No due date found in syntax, use default if provided
        if (defaultDate) {
          const date = new Date(defaultDate);
          this._stateService.updateDate(date, defaultTime || null);
        }
        // Otherwise keep current date (don't clear if set via UI)
      }
    }
  }
}
