import { inject, Injectable } from '@angular/core';
import { TaskWithSubTasks } from '../tasks/task.model';
import { flattenTasks } from '../tasks/store/task.selectors';
import { createEmptyEntity } from '../../util/create-empty-entity';
import { taskAdapter } from '../tasks/store/task.adapter';
import { PfapiService } from '../../pfapi/pfapi.service';
import { sortDataToFlush } from './sort-data-to-flush';

@Injectable({
  providedIn: 'root',
})
export class ArchiveService {
  private readonly _pfapiService = inject(PfapiService);

  // TODO
  public taskArchive$: any;

  // NOTE: we choose this method as trigger to check for flushing to archive, since
  // it is usually triggered every work-day once
  async moveTasksToArchive(tasks: TaskWithSubTasks[]): Promise<void> {
    const now = Date.now();
    const flatTasks = flattenTasks(tasks);
    if (!flatTasks.length) {
      return;
    }

    const currentArchive = await this._pfapiService.m.archive.load();
    const taskArchiveState = currentArchive.task || createEmptyEntity();

    const newTaskArchive = taskAdapter.addMany(
      flatTasks.map(({ subTasks, ...task }) => ({
        ...task,
        reminderId: undefined,
        isDone: true,
        plannedAt: undefined,
        doneOn:
          task.isDone && task.doneOn
            ? task.doneOn
            : task.parentId
              ? flatTasks.find((t) => t.id === task.parentId)?.doneOn || now
              : now,
      })),
      taskArchiveState,
    );

    await this._pfapiService.m.archive.save(
      {
        ...currentArchive,
        task: newTaskArchive,
      },
      {
        isUpdateRevAndLastUpdate: true,
      },
    );

    // if is more than 14 days since last flush, flush the archive
    if (now - currentArchive.lastFlush > 1000 * 60 * 60 * 24 * 14) {
      await this._flushToArchive();
    }
  }

  private async _flushToArchive(): Promise<void> {
    const timeTracking = await this._pfapiService.m.timeTracking.load();
    const archive = await this._pfapiService.m.archive.load();
    const archiveOld = await this._pfapiService.m.archiveOld.load();

    const newVals = sortDataToFlush({
      archive,
      archiveOld,
      timeTracking,
    });
    console.log(newVals);
    // TODO save
  }
}
