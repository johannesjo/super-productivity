import { inject, Injectable, Injector } from '@angular/core';
import { PfapiService } from '../../pfapi/pfapi.service';
import { ArchiveTask, TimeSpentOnDayCopy } from '../tasks/task.model';
import { ArchiveModel } from './time-tracking.model';

export interface CompressionPreview {
  subtasksToDelete: number;
  notesToClear: number;
  issueFieldsToClear: number;
  estimatedSavingsKB: number;
}

@Injectable({
  providedIn: 'root',
})
export class ArchiveCompressionService {
  private _injector = inject(Injector);
  private _pfapiService?: PfapiService;

  private get pfapiService(): PfapiService {
    if (!this._pfapiService) {
      this._pfapiService = this._injector.get(PfapiService);
    }
    return this._pfapiService;
  }

  /**
   * Calculate compression preview statistics for UI display.
   */
  async getCompressionPreview(oneYearAgoTimestamp: number): Promise<CompressionPreview> {
    const [archiveYoung, archiveOld] = await Promise.all([
      this.pfapiService.m.archiveYoung.load(),
      this.pfapiService.m.archiveOld.load(),
    ]);

    const allTasks = [
      ...Object.values(archiveYoung.task.entities),
      ...Object.values(archiveOld.task.entities),
    ].filter((t): t is ArchiveTask => !!t);

    const subtasksToDelete = allTasks.filter((t) => !!t.parentId).length;

    const notesToClear = allTasks.filter(
      (t) => !t.parentId && !!t.notes && (t.doneOn || 0) < oneYearAgoTimestamp,
    ).length;

    const issueFieldsToClear = allTasks.filter(
      (t) =>
        !t.parentId &&
        (t.doneOn || 0) < oneYearAgoTimestamp &&
        (!!t.issueProviderId ||
          t.issueWasUpdated !== undefined ||
          t.issueLastUpdated !== undefined ||
          t.issueAttachmentNr !== undefined ||
          t.issuePoints !== undefined ||
          t.issueTimeTracked !== undefined),
    ).length;

    const estimatedSavingsKB = this._estimateSavings(
      allTasks,
      subtasksToDelete,
      notesToClear,
      oneYearAgoTimestamp,
    );

    return {
      subtasksToDelete,
      notesToClear,
      issueFieldsToClear,
      estimatedSavingsKB,
    };
  }

  /**
   * Execute compression on archive data.
   * DETERMINISTIC: Same input produces same output across all clients.
   */
  async compressArchive(
    oneYearAgoTimestamp: number,
    isIgnoreDBLock: boolean = false,
  ): Promise<void> {
    const [archiveYoung, archiveOld] = await Promise.all([
      this.pfapiService.m.archiveYoung.load(),
      this.pfapiService.m.archiveOld.load(),
    ]);

    const newArchiveYoung = this._compressArchiveData(archiveYoung, oneYearAgoTimestamp);
    const newArchiveOld = this._compressArchiveData(archiveOld, oneYearAgoTimestamp);

    await Promise.all([
      this.pfapiService.m.archiveYoung.save(newArchiveYoung, {
        isUpdateRevAndLastUpdate: true,
        isIgnoreDBLock: isIgnoreDBLock ? true : undefined,
      }),
      this.pfapiService.m.archiveOld.save(newArchiveOld, {
        isUpdateRevAndLastUpdate: true,
        isIgnoreDBLock: isIgnoreDBLock ? true : undefined,
      }),
    ]);
  }

  private _compressArchiveData(
    archive: ArchiveModel,
    oneYearAgoTimestamp: number,
  ): ArchiveModel {
    const taskEntities: { [id: string]: ArchiveTask } = {};
    const subtaskIds: string[] = [];

    // Step 1: Copy all tasks and identify subtasks
    for (const id of archive.task.ids) {
      const task = archive.task.entities[id];
      if (!task) continue;

      if (task.parentId) {
        subtaskIds.push(task.id);
      }
      taskEntities[id] = task;
    }

    // Step 2: Merge subtask time to parents and mark for deletion
    for (const subtaskId of subtaskIds) {
      const subtask = taskEntities[subtaskId];
      if (!subtask?.parentId) continue;

      const parent = taskEntities[subtask.parentId];
      if (!parent) continue;

      // Merge timeSpent
      const newTimeSpent = parent.timeSpent + subtask.timeSpent;

      // Merge timeSpentOnDay
      const newTimeSpentOnDay: TimeSpentOnDayCopy = { ...parent.timeSpentOnDay };
      for (const [dateStr, time] of Object.entries(subtask.timeSpentOnDay)) {
        newTimeSpentOnDay[dateStr] = (newTimeSpentOnDay[dateStr] || 0) + time;
      }

      // Update parent with merged time and remove subtask from subTaskIds
      taskEntities[subtask.parentId] = {
        ...parent,
        timeSpent: newTimeSpent,
        timeSpentOnDay: newTimeSpentOnDay,
        subTaskIds: parent.subTaskIds.filter((id) => id !== subtaskId),
      };

      // Delete subtask
      delete taskEntities[subtaskId];
    }

    // Step 3: Clear notes and issue fields from old tasks
    for (const id of Object.keys(taskEntities)) {
      const task = taskEntities[id];
      if (!task || task.parentId) continue; // Skip if deleted or is subtask

      const isOldTask = (task.doneOn || 0) < oneYearAgoTimestamp;
      if (!isOldTask) continue;

      let updatedTask = task;

      // Clear notes
      if (task.notes) {
        updatedTask = { ...updatedTask, notes: undefined };
      }

      // Clear issue fields (keep issueId and issueType for reference)
      if (
        task.issueProviderId ||
        task.issueWasUpdated !== undefined ||
        task.issueLastUpdated !== undefined ||
        task.issueAttachmentNr !== undefined ||
        task.issuePoints !== undefined ||
        task.issueTimeTracked !== undefined
      ) {
        updatedTask = {
          ...updatedTask,
          issueProviderId: undefined,
          issueWasUpdated: undefined,
          issueLastUpdated: undefined,
          issueAttachmentNr: undefined,
          issuePoints: undefined,
          issueTimeTracked: undefined,
        };
      }

      if (updatedTask !== task) {
        taskEntities[id] = updatedTask;
      }
    }

    // Update ids array to remove deleted subtasks
    const newIds = archive.task.ids.filter((id) => !!taskEntities[id]);

    return {
      ...archive,
      task: {
        ids: newIds,
        entities: taskEntities,
      },
    };
  }

  private _estimateSavings(
    allTasks: ArchiveTask[],
    subtasksToDelete: number,
    notesToClear: number,
    oneYearAgoTimestamp: number,
  ): number {
    // Estimate actual savings based on data
    let totalBytes = 0;

    // Subtask savings: estimate ~300 bytes per subtask
    totalBytes += subtasksToDelete * 300;

    // Notes savings: calculate actual note lengths for old tasks
    for (const task of allTasks) {
      if (!task.parentId && task.notes && (task.doneOn || 0) < oneYearAgoTimestamp) {
        totalBytes += task.notes.length;
      }
    }

    // Issue fields savings: ~100 bytes per task
    for (const task of allTasks) {
      if (
        !task.parentId &&
        (task.doneOn || 0) < oneYearAgoTimestamp &&
        (task.issueProviderId ||
          task.issueWasUpdated !== undefined ||
          task.issueLastUpdated !== undefined ||
          task.issueAttachmentNr !== undefined ||
          task.issuePoints !== undefined ||
          task.issueTimeTracked !== undefined)
      ) {
        totalBytes += 100;
        // Add extra for issueTimeTracked if present
        if (task.issueTimeTracked) {
          totalBytes += JSON.stringify(task.issueTimeTracked).length;
        }
      }
    }

    return Math.round(totalBytes / 1024);
  }
}
