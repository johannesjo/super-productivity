import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store, select } from '@ngrx/store';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { map, withLatestFrom, filter, mergeMap } from 'rxjs/operators';
import { RootState } from '../../../root-store/root-state';
import { selectTaskEntities } from './task.selectors';
import { selectTimelineConfig } from '../../config/store/global-config.reducer';
import { selectTimelineTasks } from '../../work-context/store/work-context.selectors';
import { createBlockedBlocksByDayMap } from '../../schedule/map-schedule-data/create-blocked-blocks-by-day-map';
import { selectTaskRepeatCfgsWithAndWithoutStartTime } from '../../task-repeat-cfg/store/task-repeat-cfg.selectors';
import { CalendarIntegrationService } from '../../calendar-integration/calendar-integration.service';
import { findNextAvailableStart } from '../../schedule/util/find-next-available-start.util';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';
import { Task, TaskWithDueTime } from '../task.model';
import { remindOptionToMilliseconds } from '../util/remind-option-to-milliseconds';
import { TaskReminderOptionId } from '../task.model';
import { PlannerActions } from '../../planner/store/planner.actions';
import { SCHEDULE_TASK_MIN_DURATION_IN_MS } from '../../schedule/schedule.const';
import { BlockedBlock } from '../../schedule/schedule.model';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { TaskService } from '../task.service';

@Injectable()
export class TaskAutoScheduleEffects {
  private _actions$ = inject(Actions);
  private _store = inject<Store<RootState>>(Store);
  private _calendarIntegration = inject(CalendarIntegrationService);
  private _ticker = inject(GlobalTrackingIntervalService);
  private _taskService = inject(TaskService);

  private static readonly GAP_MS = 5 * 60 * 1000; // 任务间隔 5 分钟

  // 简单优先级：School 项目优先 → 截止更近（dueDay/dueWithTime 距离更小）→ 剩余时长更长
  private _sortByPriority = (a: Task, b: Task): number => {
    const prio = (t: Task): number => {
      const pid = (t.projectId || '').toString().toLowerCase();
      return pid.includes('school') ? 0 : 1;
    };
    const pa = prio(a);
    const pb = prio(b);
    if (pa !== pb) return pa - pb;

    const now = Date.now();
    const dist = (t: Task): number => {
      const dwt = (t as any).dueWithTime as number | undefined;
      if (typeof dwt === 'number') return Math.max(0, dwt - now);
      const dd = (t as any).dueDay as string | undefined;
      if (dd) {
        const d = new Date(dd);
        d.setHours(23, 59, 59, 999);
        return Math.max(0, d.getTime() - now);
      }
      return Number.POSITIVE_INFINITY;
    };
    const da = dist(a);
    const db = dist(b);
    if (da !== db) return da - db;

    const aLeft = Math.max(getTimeLeftForTask(a), SCHEDULE_TASK_MIN_DURATION_IN_MS);
    const bLeft = Math.max(getTimeLeftForTask(b), SCHEDULE_TASK_MIN_DURATION_IN_MS);
    return bLeft - aLeft;
  };

  private _scheduleSeqForToday(
    now: number,
    scheduleCfg: any,
    timelineTasks: { planned: TaskWithDueTime[]; unPlanned: Task[] },
    repeatCfgsWithStartTime: any[],
    icalEvents: any[],
    currentTaskId?: string | null,
  ): Array<ReturnType<typeof TaskSharedActions.scheduleTaskWithTime>> {
    const todayDate = new Date(now);
    todayDate.setHours(0, 0, 0, 0);
    const todayStr = new Date(todayDate).toISOString().slice(0, 10);

    // 仅针对“今天未排时间”的候选任务
    const candidates = [...(timelineTasks.unPlanned || [])]
      .filter((t) => !t.isDone && t.id !== currentTaskId)
      .sort(this._sortByPriority);

    if (candidates.length === 0) {
      return [] as any[];
    }

    // 初始 blocked map：基于已排期任务等
    // Parse custom blocks from schedule config (weekday/weekend)
    const parseCustomBlocks = (
      v?: string,
    ): { startTime: string; endTime: string }[] | undefined => {
      if (!v) return undefined;
      const items = v
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.includes('-'))
        .map((s) => {
          const [a, b] = s.split('-').map((x) => x.trim());
          return a && b ? ({ startTime: a, endTime: b } as const) : null;
        })
        .filter((x) => !!x) as { startTime: string; endTime: string }[];
      return items.length ? items : undefined;
    };

    const customWeekday = parseCustomBlocks(scheduleCfg?.customBlocksWeekdayStr);
    const customWeekend = parseCustomBlocks(scheduleCfg?.customBlocksWeekendStr);

    const blockedMap = createBlockedBlocksByDayMap(
      (timelineTasks.planned || []) as TaskWithDueTime[],
      repeatCfgsWithStartTime || [],
      icalEvents || [],
      scheduleCfg?.isWorkStartEndEnabled
        ? { startTime: scheduleCfg.workStart, endTime: scheduleCfg.workEnd }
        : undefined,
      scheduleCfg?.isWeekendHoursEnabled
        ? {
            startTime: scheduleCfg.weekendWorkStart || scheduleCfg?.workStart || '09:00',
            endTime: scheduleCfg.weekendWorkEnd || scheduleCfg?.workEnd || '17:00',
          }
        : undefined,
      scheduleCfg?.isLunchBreakEnabled
        ? { startTime: scheduleCfg.lunchBreakStart, endTime: scheduleCfg.lunchBreakEnd }
        : undefined,
      customWeekday,
      customWeekend,
      now,
      3,
    );

    const blocksToday = blockedMap[todayStr] || [];

    // 计算起始时间：工作开始或当前时间之后
    let startFrom = now;
    if (scheduleCfg?.isWorkStartEndEnabled) {
      const startStr = scheduleCfg.workStart || '09:00';
      const [sh, sm] = startStr.split(':').map((v: string) => parseInt(v, 10));
      const startToday = new Date(todayDate);
      startToday.setHours(sh || 0, sm || 0, 0, 0);
      startFrom = Math.max(now, startToday.getTime());
    }

    // 若当前时间处于 block 内，先将起点推至该 block 结束，避免把任务排到 block 里
    const bumpOutOfBlocks = (blocks: BlockedBlock[], from: number): number => {
      for (const b of blocks) {
        if (from >= b.start && from < b.end) {
          return b.end;
        }
      }
      return from;
    };
    // Repeatedly bump until outside all consecutive blocks
    for (;;) {
      const next = bumpOutOfBlocks(blocksToday, startFrom);
      if (next === startFrom) break;
      startFrom = next;
    }

    const actions: Array<ReturnType<typeof TaskSharedActions.scheduleTaskWithTime>> = [];
    const localBlocked: BlockedBlock[] = [];
    const getCombinedMap = (): any => ({
      ...blockedMap,
      [todayStr]: [...blocksToday, ...localBlocked].sort((a, b) => a.start - b.start),
    });

    for (const task of candidates) {
      const durationMs = Math.max(
        getTimeLeftForTask(task),
        SCHEDULE_TASK_MIN_DURATION_IN_MS,
      );
      const dueWithTime = findNextAvailableStart(getCombinedMap(), startFrom, durationMs);
      actions.push(
        TaskSharedActions.scheduleTaskWithTime({
          task,
          dueWithTime,
          remindAt: remindOptionToMilliseconds(dueWithTime, TaskReminderOptionId.AtStart),
          isMoveToBacklog: false,
        }),
      );

      // 将当前任务+间隔加入本地阻塞，确保后续任务不重叠且有 5 分钟间隔
      localBlocked.push({
        start: dueWithTime,
        end: dueWithTime + durationMs + TaskAutoScheduleEffects.GAP_MS,
        entries: [] as any,
      });
      startFrom = dueWithTime + durationMs + TaskAutoScheduleEffects.GAP_MS;
    }

    return actions;
  }

  // 当任务被创建：仅在“显式设置了 dueWithTime”的情况下，执行单点排程；
  // 其他情况交由整体重排（基于 dueDay 滚动前推）。
  autoScheduleOnAdd$ = createEffect(() =>
    this._actions$.pipe(
      ofType(TaskSharedActions.addTask),
      withLatestFrom(this._store.pipe(select(selectTaskEntities))),
      map(([{ task, isAddToBacklog }, entities]) => {
        const t = (entities as any)[task.id] as Task | undefined;
        const due = (t as any)?.dueWithTime as number | undefined;
        if (t && typeof due === 'number' && !t.isDone) {
          return TaskSharedActions.scheduleTaskWithTime({
            task: t,
            dueWithTime: due,
            remindAt: remindOptionToMilliseconds(due, TaskReminderOptionId.AtStart),
            isMoveToBacklog: !!isAddToBacklog,
          });
        }
        return null;
      }),
      filter((a): a is ReturnType<typeof TaskSharedActions.scheduleTaskWithTime> => !!a),
    ),
  );

  // 新增/计划到当天：对“今天未排时间”的任务整体重排（School 优先，任务间隔 5 分钟）
  reflowOnAddOrPlanForDay$ = createEffect(() =>
    this._actions$.pipe(
      ofType(TaskSharedActions.addTask, PlannerActions.planTaskForDay),
      withLatestFrom(
        this._store.pipe(select(selectTimelineConfig)),
        this._store.pipe(select(selectTimelineTasks)),
        this._store.pipe(select(selectTaskRepeatCfgsWithAndWithoutStartTime)),
        this._calendarIntegration.icalEvents$,
        this._taskService.currentTaskId$,
      ),
      map(
        ([action, scheduleCfg, timelineTasks, repeatCfgsObj, icalEvents, currentId]) => {
          const now = Date.now();
          return this._scheduleSeqForToday(
            now,
            scheduleCfg,
            timelineTasks,
            (repeatCfgsObj && repeatCfgsObj.withStartTime) || [],
            icalEvents,
            currentId || null,
          );
        },
      ),
      // 扁平化 action 数组
      mergeMap((acts) => acts),
    ),
  );

  // 定时检测：若有已过期但未完成的“已排时间”任务，则重排今天的未排任务 + 过期任务
  reflowOnTickForOverdue$ = createEffect(() =>
    this._ticker.tick$.pipe(
      withLatestFrom(
        this._store.pipe(select(selectTimelineConfig)),
        this._store.pipe(select(selectTimelineTasks)),
        this._store.pipe(select(selectTaskRepeatCfgsWithAndWithoutStartTime)),
        this._calendarIntegration.icalEvents$,
        this._taskService.currentTaskId$,
      ),
      map(([tick, scheduleCfg, timelineTasks, repeatCfgsObj, icalEvents, currentId]) => {
        const now = Date.now();
        const overdue = (timelineTasks.planned || []).filter((t) => {
          const start = (t as any).dueWithTime as number;
          if (typeof start !== 'number') return false;
          const dur = Math.max(getTimeLeftForTask(t), SCHEDULE_TASK_MIN_DURATION_IN_MS);
          return start + dur <= now && !t.isDone;
        });
        if (!overdue.length && !(timelineTasks.unPlanned || []).length) {
          return [] as any[];
        }
        // 简化处理：将过期任务交由统一重排逻辑
        return this._scheduleSeqForToday(
          now,
          scheduleCfg,
          timelineTasks,
          (repeatCfgsObj && repeatCfgsObj.withStartTime) || [],
          icalEvents,
          currentId || null,
        );
      }),
      mergeMap((acts) => acts),
    ),
  );
}
