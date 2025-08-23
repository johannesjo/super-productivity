import { Injectable, inject } from '@angular/core';
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
  ): void {
    if (text && config) {
      // Get current tags from state to pass as tagIds
      const currentTags = this._stateService.state().tags;
      const currentTagIds = currentTags.map((t) => t.id);

      const parseResult = shortSyntax(
        { title: text, tagIds: currentTagIds },
        config,
        allTags,
        allProjects,
      );

      if (parseResult) {
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
        }

        // Update tags if found
        if (parseResult.taskChanges.tagIds) {
          const foundTags = allTags.filter((tag) =>
            parseResult.taskChanges.tagIds?.includes(tag.id),
          );
          if (foundTags.length > 0) {
            this._stateService.updateTags(foundTags);
          }
        }

        // Update new tag titles
        if (parseResult.newTagTitles.length > 0) {
          this._stateService.updateNewTagTitles(parseResult.newTagTitles);
        }

        // Update time estimate
        if (parseResult.taskChanges.timeEstimate) {
          this._stateService.updateEstimate(parseResult.taskChanges.timeEstimate);
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
        }
      }
    }
  }
}
