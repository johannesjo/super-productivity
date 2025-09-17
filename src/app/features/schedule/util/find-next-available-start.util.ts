import { BlockedBlockByDayMap } from '../../schedule/schedule.model';
import { getDbDateStr } from '../../../util/get-db-date-str';

/**
 * 计算给定时长任务的下一个可用开始时间（避开所有 blocked blocks，支持跨天）。
 * - 输入为按天分组的 blocked blocks（已包含：工作时间外、午休、自定义 block、日历事件、已有排程等）。
 * - 算法：从给定时间开始，找到当前天的空闲片段；如果放不下则跳到下一个可用片段；若当天放不下则滚到下一天。
 * - 仅返回“开始时间戳”。结束时间 = 开始 + durationMs。
 */
export const findNextAvailableStart = (
  blockedBlocksByDay: BlockedBlockByDayMap,
  startFrom: number,
  durationMs: number,
  maxDaysToCheck: number = 14,
): number => {
  // 安全兜底：非正数时长直接返回 startFrom（上层应保证时长>0）
  if (!durationMs || durationMs <= 0) {
    return startFrom;
  }

  let candidate = startFrom;

  for (let dayOffset = 0; dayOffset < maxDaysToCheck; dayOffset++) {
    const dateForDay = new Date(candidate);
    dateForDay.setHours(0, 0, 0, 0);
    const dayStart = dateForDay.getTime();
    const dayEnd = new Date(dayStart).setHours(24, 0, 0, 0);
    const dayStr = getDbDateStr(dayStart);

    const blocksForDay = (blockedBlocksByDay[dayStr] || [])
      .slice()
      .sort((a, b) => a.start - b.start);

    // 从 candidate 开始在当天寻找空闲区间
    // 指针 cur 表示尝试的开始点
    let cur = Math.max(candidate, dayStart);

    // 遍历所有 block，将 cur 推进到不与 block 冲突的位置
    for (let i = 0; i < blocksForDay.length; i++) {
      const b = blocksForDay[i];

      // 如果当前指针在 block 之前，检查当前空闲段 [cur, b.start) 是否足够容纳任务。
      // 若足够则直接返回；若不足则把 cur 推到该 block 结束后继续找（即“跨过 block”）。
      if (cur <= b.start) {
        const freeUntil = Math.min(b.start, dayEnd);
        if (freeUntil - cur >= durationMs) {
          return cur;
        }
        // 放不下：把起点推进到 block 结束后
        cur = Math.max(cur, b.end);
      } else if (cur < b.end) {
        // cur 落在 block 内，直接跳到 block 结束
        cur = b.end;
      }

      // 若已到当天末尾，终止当日
      if (cur >= dayEnd) {
        break;
      }
    }

    // 遍历完 blocks 后，若当天尾段可用，则返回尾段起点（若超长则滚下一天）
    if (cur < dayEnd) {
      if (cur + durationMs <= dayEnd) {
        return cur;
      }
      // 超出当天，进入下一天
    }

    // 当天放不下，滚到下一天 00:00（实际可用开始时间由下一天 blocks 决定）
    candidate = dayEnd + 1;
  }

  // 超过 maxDaysToCheck：保守返回最后计算的 candidate
  return candidate;
};
