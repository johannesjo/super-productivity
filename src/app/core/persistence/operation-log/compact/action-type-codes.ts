/* eslint-disable @typescript-eslint/naming-convention */

/**
 * Short codes for action types in the compact operation format.
 *
 * Naming convention:
 * - First char = entity type prefix
 * - Second char = operation (A=Add, U=Update, D=Delete, M=Move)
 * - Optional third char = modifier
 *
 * Entity prefixes:
 * - T = Task
 * - P = Project
 * - G = taG (T already used)
 * - N = Note
 * - S = SimpleCounter
 * - R = TaskRepeatCfg
 * - K = TimeTracking
 * - A = Archive
 * - L = Planner
 * - C = GlobalConfig
 * - B = Board
 * - M = MenuTree
 * - I = IssueProvider
 * - X = TaskAttachment
 * - E = Metric
 * - W = WorkContextMeta
 * - U = Plugin
 * - H = Task Shared (multi-entity actions)
 *
 * IMPORTANT: Never change assigned codes - add new codes for new actions.
 */

export const ACTION_TYPE_TO_CODE: Record<string, string> = {
  // Archive actions (A)
  '[Archive] Compress Archive': 'AC',
  '[Archive] Flush Young to Old': 'AF',
  '[Archive] Remote Archive Data Applied': 'AR',

  // Board actions (B)
  '[Boards] Add Board': 'BA',
  '[Boards] Remove Board': 'BD',
  '[Boards] Update Board': 'BU',
  '[Boards] Update Panel Cfg': 'BP',
  '[Boards] Update Panel Cfg TaskIds': 'BT',

  // GlobalConfig actions (C)
  '[Global Config] Update Global Config Section': 'CU',

  // Metric actions (E)
  '[Metric] Add Metric': 'EA',
  '[Metric] Delete Metric': 'ED',
  '[Metric] Update Metric': 'EU',
  '[Metric] Upsert Metric': 'EX',
  '[Metric] Log Focus Session': 'EL',

  // Tag actions (G)
  '[Tag] Add Tag': 'GA',
  '[Tag] Update Tag': 'GU',
  '[Tag] Delete Tag': 'GD',
  '[Tag] Delete multiple Tags': 'GDM',
  '[Tag] Update Tag Order': 'GO',
  '[Tag] Update Advanced Config': 'GC',

  // Task Shared actions (H) - multi-entity
  '[Task Shared] addTask': 'HA',
  '[Task Shared] updateTask': 'HU',
  '[Task Shared] deleteTask': 'HD',
  '[Task Shared] deleteTasks': 'HDM',
  '[Task Shared] moveToArchive': 'HX',
  '[Task Shared] restoreTask': 'HR',
  '[Task Shared] restoreDeletedTask': 'HRD',
  '[Task Shared] convertToMainTask': 'HC',
  '[Task Shared] scheduleTaskWithTime': 'HS',
  '[Task Shared] reScheduleTaskWithTime': 'HSR',
  '[Task Shared] unscheduleTask': 'HSX',
  '[Task Shared] dismissReminderOnly': 'HRX',
  '[Task Shared] updateTasks': 'HUM',
  '[Task Shared] moveToOtherProject': 'HMP',
  '[Task Shared] deleteProject': 'HPD',
  '[Task Shared] planTasksForToday': 'HPT',
  '[Task Shared] removeTasksFromTodayTag': 'HRT',
  '[Task Shared] addTagToTask': 'HGT',
  '[Task Shared] removeTagsForAllTasks': 'HGR',
  '[Task Shared] moveTaskInTodayTagList': 'HMT',
  '[Task Shared] batchUpdateForProject': 'HBP',
  '[Task Shared] deleteIssueProvider': 'HID',
  '[Task Shared] deleteIssueProviders': 'HIM',
  '[Task Shared] deleteTaskRepeatCfg': 'HRC',
  '[Task Shared] applyShortSyntax': 'HSS',

  // IssueProvider actions (I)
  '[IssueProvider/API] Add IssueProvider': 'IA',
  '[IssueProvider/API] Update IssueProvider': 'IU',
  '[IssueProvider/API] Sort IssueProviders First': 'IS',

  // TimeTracking actions (K)
  '[TimeTracking] Sync sessions': 'KS',
  '[TimeTracking] Sync time spent': 'KT',
  '[TimeTracking] Update Work Context Data': 'KW',

  // Planner actions (L)
  '[Planner] Upsert Planner Day': 'LU',
  '[Planner] Transfer Task': 'LT',
  '[Planner] Move In List': 'LM',
  '[Planner] Move Before Task': 'LB',
  '[Planner] Plan Task for Day': 'LP',

  // MenuTree actions (M)
  '[MenuTree] Update Project Tree': 'MP',
  '[MenuTree] Update Tag Tree': 'MG',
  '[MenuTree] Update Folder': 'MU',
  '[MenuTree] Delete Folder': 'MD',

  // Note actions (N)
  '[Note] Add Note': 'NA',
  '[Note] Update Note': 'NU',
  '[Note] Delete Note': 'ND',
  '[Note] Update Note Order': 'NO',
  '[Note] Move to other project': 'NM',

  // Project actions (P)
  '[Project] Add Project': 'PA',
  '[Project] Update Project': 'PU',
  '[Project] Update Project Order': 'PO',
  '[Project] Update Project Advanced Cfg': 'PC',
  '[Project] Archive Project': 'PX',
  '[Project] Unarchive Project': 'PR',
  '[Project] Toggle hide from menu': 'PH',
  '[Project] Move Task in Backlog': 'PM',
  '[Project] Move Task Up in Backlog': 'PMU',
  '[Project] Move Task Down in Backlog': 'PMD',
  '[Project] Move Task to Top in Backlog': 'PMT',
  '[Project] Move Task to Bottom in Backlog': 'PMB',
  '[Project] Move Task from regular to backlog': 'PRB',
  '[Project] Move Task from backlog to regular': 'PBR',
  '[Project] Auto Move Task from regular to backlog': 'PAB',
  '[Project] Auto Move Task from backlog to regular': 'PAR',
  '[Project] Move all backlog tasks to regular': 'PBA',

  // TaskRepeatCfg actions (R)
  '[TaskRepeatCfg][Task] Add TaskRepeatCfg to Task': 'RA',
  '[TaskRepeatCfg] Update TaskRepeatCfg': 'RU',
  '[TaskRepeatCfg] Update multiple TaskRepeatCfgs': 'RUM',
  '[TaskRepeatCfg] Delete TaskRepeatCfg': 'RD',
  '[TaskRepeatCfg] Delete multiple TaskRepeatCfgs': 'RDM',
  '[TaskRepeatCfg] Delete Single Instance': 'RDI',
  '[TaskRepeatCfg] Upsert TaskRepeatCfg': 'RX',

  // SimpleCounter actions (S)
  '[SimpleCounter] Add SimpleCounter': 'SA',
  '[SimpleCounter] Update SimpleCounter': 'SU',
  '[SimpleCounter] Delete SimpleCounter': 'SD',
  '[SimpleCounter] Delete multiple SimpleCounters': 'SDM',
  '[SimpleCounter] Update all SimpleCounters': 'SUA',
  '[SimpleCounter] Set SimpleCounter Counter Today': 'ST',
  '[SimpleCounter] Increase SimpleCounter Counter Today': 'SI',
  '[SimpleCounter] Decrease SimpleCounter Counter Today': 'SX',
  '[SimpleCounter] Toggle SimpleCounter Counter': 'SG',
  '[SimpleCounter] Turn off all simple counters': 'SO',
  '[SimpleCounter] Set SimpleCounter Counter Off': 'SF',
  '[SimpleCounter] Set SimpleCounter Counter On': 'SN',
  '[Simple Counter] Set SimpleCounter Counter For Date': 'SFD',
  '[SimpleCounter] Sync counter time': 'SC',

  // Task actions (T)
  '[Task] Update multiple Tasks (simple)': 'TU',
  '[Task] Add SubTask': 'TA',
  '[Task] Move sub task': 'TMS',
  '[Task] Move up': 'TMU',
  '[Task] Move down': 'TMD',
  '[Task] Move to top': 'TMT',
  '[Task] Move to bottom': 'TMB',
  '[Task] Remove time spent': 'TR',
  '[Task] RoundTimeSpentForDay': 'TRD',
  '[Task] Add new tags from short syntax': 'TGS',

  // Plugin actions (U)
  '[Plugin] Upsert User Data': 'UU',
  '[Plugin] Delete User Data': 'UD',
  '[Plugin] Upsert Metadata': 'UM',
  '[Plugin] Delete Metadata': 'UDM',

  // WorkContextMeta actions (W)
  '[WorkContextMeta] Move Task Up in Today': 'WMU',
  '[WorkContextMeta] Move Task Down in Today': 'WMD',
  '[WorkContextMeta] Move Task To Top in Today': 'WMT',
  '[WorkContextMeta] Move Task To Bottom in Today': 'WMB',
  '[WorkContextMeta] Move Task in Today': 'WM',

  // TaskAttachment actions (X)
  '[TaskAttachment] Add TaskAttachment': 'XA',
  '[TaskAttachment] Update TaskAttachment': 'XU',
  '[TaskAttachment] Delete TaskAttachment': 'XD',
};

// Reverse mapping: code -> action type
export const CODE_TO_ACTION_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(ACTION_TYPE_TO_CODE).map(([k, v]) => [v, k]),
);

/**
 * Encode an action type to its short code.
 * Returns the original action type as-is if no short code is registered.
 * This allows the system to work with unknown action types while still
 * compressing known ones.
 */
export const encodeActionType = (actionType: string): string => {
  const code = ACTION_TYPE_TO_CODE[actionType];
  // Return the code if found, otherwise return the original action type
  return code ?? actionType;
};

/**
 * Decode a short code back to the full action type.
 * If the code is not found in the mapping, it's assumed to be a full
 * action type that was stored as-is (for unknown/future action types).
 */
export const decodeActionType = (code: string): string => {
  const actionType = CODE_TO_ACTION_TYPE[code];
  // Return the decoded action type if found, otherwise return the code as-is
  // (it's likely already a full action type that wasn't compressed)
  return actionType ?? code;
};
