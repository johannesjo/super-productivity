import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { T } from 'src/app/t.const';
import { Task } from '../task.model';
import { unique } from '../../../util/unique';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, withLatestFrom } from 'rxjs/operators';
import { DateService } from '../../../core/date/date.service';
import { Store } from '@ngrx/store';
import { selectAllTags } from '../../tag/store/tag.reducer';
import { Tag } from '../../tag/tag.model';
import { getWorklogStr } from '../../../util/get-work-log-str';

interface TagWithTimeSpent {
  id: string;
  tag: Tag;
  timeSpentToday: number;
}

@Component({
  selector: 'tasks-by-tag',
  templateUrl: './tasks-by-tag.component.html',
  styleUrls: ['./tasks-by-tag.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class TasksByTagComponent {
  T: typeof T = T;
  @Input() dayStr: string = this._dateService.todayStr();
  @Input() isForToday: boolean = true;
  @Input() isShowYesterday: boolean = false;
  flatTasks: Task[] = [];
  todaysTasksTagIds$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  tagsWithTimeSpent$: Observable<TagWithTimeSpent[]> = this.todaysTasksTagIds$.pipe(
    withLatestFrom(this._store.select(selectAllTags)),
    map(([tagIds, allTags]) => {
      // NOTE: the order is like the ones in the menu
      const mappedTags = allTags
        .filter((tag) => tagIds.includes(tag.id))
        .map((tag) => this._mapToTagWithTasks(tag));
      return mappedTags.sort((a, b) => b.timeSpentToday - a.timeSpentToday);
    }),
  );

  @Input('flatTasks') set flatTasksIn(tasks: Task[]) {
    this.flatTasks = tasks;
    const tagIds: string[] = unique(
      tasks.reduce((acc, t) => [...acc, ...t.tagIds], [] as string[]),
    );
    this.todaysTasksTagIds$.next(tagIds);
  }

  constructor(
    private readonly _store: Store,
    private readonly _dateService: DateService,
  ) {}

  trackById(i: number, item: Tag): string {
    return item.id;
  }

  private _mapToTagWithTasks(tag: Tag): TagWithTimeSpent {
    // if (this.isShowYesterday && this.isForToday) {
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayDayStr = getWorklogStr(yesterdayDate);

    const tagWithTasks: TagWithTimeSpent = {
      id: tag.id,
      tag,
      timeSpentToday: this.flatTasks
        .filter((task) => task.tagIds.includes(tag.id))
        .reduce((acc, task) => {
          let v: number = task.timeSpentOnDay[this.dayStr] || 0;
          if (this.isShowYesterday && this.isForToday) {
            v = v + (task.timeSpentOnDay[yesterdayDayStr] || 0);
          }
          return acc + v;
        }, 0),
    };

    return tagWithTasks;
  }
}
