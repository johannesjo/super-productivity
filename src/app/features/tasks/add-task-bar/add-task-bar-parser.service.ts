import { inject, Injectable, signal } from '@angular/core';
import { Project } from '../../project/project.model';
import { Tag } from '../../tag/tag.model';
import { AddTaskBarStateService } from './add-task-bar-state.service';
import { AddTaskBarRepeat } from './add-task-bar.const';
import {
  SHORT_SYNTAX_REPEAT_REMOVAL_REG_EX,
  SHORT_SYNTAX_TIME_REG_EX,
  shortSyntax,
  ShortSyntaxRange,
  ShortSyntaxTokenType,
} from '../short-syntax';
import { ShortSyntaxConfig } from '../../config/global-config.model';
import { getDbDateStr } from '../../../util/get-db-date-str';
import { rollWeekendDateForRepeat } from './roll-weekend-date-for-repeat';
import { TimeSpentOnDay, TaskReminderOptionId } from '../task.model';
import { TaskAttachment } from '../task-attachment/task-attachment.model';
import { millisecondsDiffToRemindOption } from '../util/remind-option-to-milliseconds';

interface PreviousParseResult {
  cleanText: string | null;
  projectId: string | null;
  tagIds: string[];
  newTagTitles: string[];
  timeSpentOnDay: TimeSpentOnDay | null;
  timeEstimate: number | null;
  dueDate: string | null;
  dueTime: string | null;
  attachments: TaskAttachment[];
  deadlineDate: string | null;
  deadlineTime: string | null;
  deadlineRemindOption: TaskReminderOptionId | null;
  isDeadlineFromSyntax: boolean;
  repeat: AddTaskBarRepeat | null;
  isRepeatFromSyntax: boolean;
}

const isSameRepeat = (
  a: AddTaskBarRepeat | null,
  b: AddTaskBarRepeat | null,
): boolean => {
  if (a === null || b === null) {
    return a === b;
  }
  if (a.type !== b.type) {
    return false;
  }
  if (a.type === 'INTERVAL' && b.type === 'INTERVAL') {
    return a.repeatCycle === b.repeatCycle && a.repeatEvery === b.repeatEvery;
  }
  if (a.type === 'PRESET' && b.type === 'PRESET') {
    return a.quickSetting === b.quickSetting;
  }
  // both DIALOG
  return true;
};

/**
 * A date change the bar made on the user's behalf, for the screen-reader
 * announcement — nothing else in this bar moves the date without being asked.
 *
 * Both days are named, and not for reading comfort: every weekend day rolls to
 * the same Monday, so the day moved *off* is the only thing that tells one
 * automatic move apart from the next. A live region re-set to the text it
 * already held announces nothing at all.
 */
export interface WorkdayDateMove {
  type: 'MOVED' | 'RESTORED';
  /** The day the date was on before this move. */
  from: string;
  /** The day the date holds now. */
  to: string;
}

@Injectable()
export class AddTaskBarParserService {
  private readonly _stateService = inject(AddTaskBarStateService);
  private _previousParseResult: PreviousParseResult | null = null;
  // The workday roll currently standing: the day a workday recurrence moved the
  // date off, and the day it moved it to. Only this service produces that move,
  // so only this service can take it back off — see dateBeforeWorkdayRoll.
  //
  // Deliberately not part of the parse result: the date the roll applies to
  // outlives any single parse (the user picks it in a control, and a parse of
  // text that names no date carries it over), so a parse rebuilding its result
  // must not be able to forget it.
  private readonly _workdayRoll = signal<{ from: string; to: string } | null>(null);
  private readonly _workdayDateMove = signal<WorkdayDateMove | null>(null);
  /** The last move of the date this service made by itself, for announcing it. */
  readonly workdayDateMove = this._workdayDateMove.asReadonly();
  private _parseRunId = 0;
  // Exactly which characters of which input the parser last consumed, so a
  // "clear"/"pick" can delete a token without a second grammar guessing at its
  // extent. Pinned to the text it was computed for; a mismatch means the parse
  // for the current input has not landed yet and callers fall back.
  private _lastParsedRanges: { forText: string; ranges: ShortSyntaxRange[] } | null =
    null;

  private _arraysEqual<T>(a: T[], b: T[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  private _datesEqual(a: string | null, b: string | null): boolean {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return a === b;
  }

  async parseAndUpdateText(
    text: string,
    config: ShortSyntaxConfig | null,
    allProjects: Project[],
    allTags: Tag[],
    defaultProject: Project,
    defaultDate?: string,
    defaultTime?: string,
  ): Promise<void> {
    const parseRunId = ++this._parseRunId;

    if (!text) {
      if (this._previousParseResult?.isDeadlineFromSyntax) {
        this._stateService.updateDeadline(null, null);
        this._stateService.updateDeadlineRemindOption(null);
      }
      if (this._previousParseResult?.isRepeatFromSyntax) {
        this._stateService.clearRepeatSetting();
      }
      this._stateService.updateSyntaxHighlight(null);
      this._previousParseResult = null;
      this._lastParsedRanges = null;
      return;
    }

    if (!config) {
      this._stateService.updateSyntaxHighlight(null);
      this._previousParseResult = null;
      this._lastParsedRanges = null;
      return;
    }

    // Get current tags from state to preserve pre-selected tags
    const parseResult = await shortSyntax(
      { title: text, tagIds: this._stateService.state().tagIdsFromTxt },
      config,
      allTags,
      allProjects,
      undefined,
      'replace',
      true,
    );

    if (parseRunId !== this._parseRunId) {
      return;
    }

    // Everything else is read after the await, not before it: a control pick
    // can land while the parse runs (the first one waits for the chrono-node
    // chunk), and a pick that leaves the text unchanged queues no parse to
    // supersede this one. A snapshot from before the await still holds the
    // values that pick replaced, and publishing them would undo it.
    const currentState = this._stateService.state();

    const parsedRanges = parseResult?.parsedRanges ?? [];
    this._lastParsedRanges = { forText: text, ranges: parsedRanges };
    this._stateService.updateSyntaxHighlight(
      parsedRanges.length
        ? {
            forText: text,
            ranges: parsedRanges,
          }
        : null,
    );

    // Create current parse result data structure
    let currentResult: PreviousParseResult;

    // On the first run _previousParseResult is null. Treat "no previous run"
    // as "user owns the deadline" so an existing user-set deadline isn't
    // wiped on first parse.
    const wasDeadlineFromSyntax =
      this._previousParseResult?.isDeadlineFromSyntax ?? false;
    // Same ownership rule for the repeat setting (menu-selected vs "@every ...")
    const wasRepeatFromSyntax = this._previousParseResult?.isRepeatFromSyntax ?? false;
    const isDateExplicitlyCleared = currentState.isDateExplicitlyCleared === true;
    const defaultDueDate = isDateExplicitlyCleared
      ? null
      : currentState.date || defaultDate || null;
    const defaultDueTime = isDateExplicitlyCleared
      ? null
      : currentState.time || defaultTime || null;

    if (!parseResult) {
      // No parse result means no short syntax found
      // Preserve current user-selected values instead of falling back to defaults

      currentResult = {
        cleanText: text,
        projectId: this._stateService.isAutoDetected()
          ? defaultProject?.id || null
          : null,
        tagIds: currentState.tagIdsFromTxt, // Preserve pre-selected tags
        newTagTitles: [],
        timeSpentOnDay: null,
        timeEstimate: null,
        // Preserve current date/time if user has selected them, otherwise use defaults.
        // But if the user explicitly cleared a default date, keep it cleared.
        dueDate: defaultDueDate,
        dueTime: defaultDueTime,
        attachments: [],
        deadlineDate: wasDeadlineFromSyntax ? null : currentState.deadlineDate || null,
        deadlineTime: wasDeadlineFromSyntax ? null : currentState.deadlineTime || null,
        deadlineRemindOption: wasDeadlineFromSyntax
          ? null
          : currentState.deadlineRemindOption || null,
        isDeadlineFromSyntax: false,
        repeat: wasRepeatFromSyntax ? null : currentState.repeat || null,
        isRepeatFromSyntax: false,
      };
    } else {
      // Extract parsed values
      const tagIds = parseResult.taskChanges.tagIds || currentState.tagIdsFromTxt;
      const newTagTitles = parseResult.newTagTitles || currentState.newTagTitles;

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
      } else if (defaultDueDate) {
        dueDate = defaultDueDate;
        dueTime = defaultDueTime;
      }

      let deadlineDate: string | null = null;
      let deadlineTime: string | null = null;
      let deadlineRemindOption: TaskReminderOptionId | null = null;
      const hasParsedDeadline =
        parseResult.taskChanges.deadlineWithTime !== undefined ||
        parseResult.taskChanges.deadlineDay !== undefined;

      if (parseResult.taskChanges.deadlineWithTime) {
        const deadlineDateObj = new Date(parseResult.taskChanges.deadlineWithTime);
        deadlineDate = getDbDateStr(deadlineDateObj);

        if (parseResult.taskChanges.hasDeadlineTime !== false) {
          const hours = deadlineDateObj.getHours().toString().padStart(2, '0');
          const minutes = deadlineDateObj.getMinutes().toString().padStart(2, '0');
          const timeStr = `${hours}:${minutes}`;

          if (timeStr !== '00:00') {
            deadlineTime = timeStr;
          }
        }

        if (parseResult.taskChanges.deadlineRemindAt) {
          deadlineRemindOption = millisecondsDiffToRemindOption(
            parseResult.taskChanges.deadlineWithTime,
            parseResult.taskChanges.deadlineRemindAt,
          );
        }
      } else if (parseResult.taskChanges.deadlineDay) {
        deadlineDate = parseResult.taskChanges.deadlineDay;
      } else if (!wasDeadlineFromSyntax) {
        deadlineDate = currentState.deadlineDate || null;
        deadlineTime = currentState.deadlineTime || null;
        deadlineRemindOption = currentState.deadlineRemindOption || null;
      }

      let repeat: AddTaskBarRepeat | null;
      if (parseResult.repeat) {
        repeat = parseResult.repeat;
      } else if (wasRepeatFromSyntax) {
        repeat = null;
      } else {
        repeat = currentState.repeat || null;
      }

      currentResult = {
        cleanText: parseResult.taskChanges.title || text,
        projectId: parseResult.projectId || null,
        tagIds: tagIds,
        newTagTitles: newTagTitles,
        timeSpentOnDay: parseResult.taskChanges.timeSpentOnDay || null,
        timeEstimate: parseResult.taskChanges.timeEstimate || null,
        dueDate: dueDate,
        dueTime: dueTime,
        attachments: parseResult.attachments || [],
        deadlineDate: deadlineDate,
        deadlineTime: deadlineTime,
        deadlineRemindOption: deadlineRemindOption,
        isDeadlineFromSyntax: hasParsedDeadline,
        repeat,
        isRepeatFromSyntax: !!parseResult.repeat,
      };
    }

    // The date and the recurrence can come from opposite sides — a typed
    // "@2027-03-27" with a menu-picked workday preset, or a date the bar was
    // opened on with a recurrence from the text — and only a pick goes through
    // applyUser*Pick. Reconciling the pair here as well covers every
    // combination, and keeps it reconciled: a due token stays in the text and
    // parses back to the excluded day on every following keystroke.
    //
    // A day the text names is the user stating their choice again, exactly like
    // a pick, so it is taken as given. Only a day carried over from the state
    // can be this service's own output, and only that one is unwound first —
    // otherwise editing the token to name the Monday would leave the roll
    // claiming a weekend day the text no longer mentions.
    const isDueDateFromText = !!parseResult?.taskChanges.dueWithTime;
    // Only the day is excluded, not the hour, so the time stays as parsed
    currentResult.dueDate = this._rollForRepeat(
      isDueDateFromText
        ? currentResult.dueDate
        : this.dateBeforeWorkdayRoll(currentResult.dueDate),
      currentResult.repeat,
    );

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
      this._stateService.updateTagIdsFromTxt(currentResult.tagIds);
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

    const prevTimeSpentOnDay = this._previousParseResult?.timeSpentOnDay || null;
    const currTimeSpentOnDay = currentResult.timeSpentOnDay;

    if (
      !this._previousParseResult ||
      // Check for field existence change
      (prevTimeSpentOnDay === null) !== (currTimeSpentOnDay === null) ||
      // Check for any discrepancy between all recorded time spent
      (prevTimeSpentOnDay !== null &&
        currTimeSpentOnDay !== null &&
        (Object.keys(prevTimeSpentOnDay).length !==
          Object.keys(currTimeSpentOnDay).length ||
          Object.keys(prevTimeSpentOnDay).some(
            (k) => prevTimeSpentOnDay[k] !== currTimeSpentOnDay[k],
          )))
    ) {
      this._stateService.updateSpent(currentResult.timeSpentOnDay);
    }

    if (
      (!this._previousParseResult && currentResult.timeEstimate !== null) ||
      (this._previousParseResult &&
        this._previousParseResult.timeEstimate !== currentResult.timeEstimate)
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

    if (
      !this._previousParseResult ||
      !this._arraysEqual(this._previousParseResult.attachments, currentResult.attachments)
    ) {
      this._stateService.updateAttachments(currentResult.attachments);
    }

    const deadlineChanged =
      !this._previousParseResult ||
      !this._datesEqual(
        this._previousParseResult.deadlineDate,
        currentResult.deadlineDate,
      ) ||
      this._previousParseResult.deadlineTime !== currentResult.deadlineTime;

    if (deadlineChanged) {
      this._stateService.updateDeadline(
        currentResult.deadlineDate,
        currentResult.deadlineTime,
      );
    }

    if (
      !this._previousParseResult ||
      this._previousParseResult.deadlineRemindOption !==
        currentResult.deadlineRemindOption ||
      currentState.deadlineRemindOption !== currentResult.deadlineRemindOption
    ) {
      this._stateService.updateDeadlineRemindOption(currentResult.deadlineRemindOption);
    }

    if (
      !this._previousParseResult ||
      !isSameRepeat(this._previousParseResult.repeat, currentResult.repeat)
    ) {
      if (currentResult.repeat) {
        this._stateService.updateRepeatSetting(currentResult.repeat);
      } else if (currentState.repeat) {
        this._stateService.clearRepeatSetting();
      }
    }

    // Store current result as previous for next comparison
    this._previousParseResult = currentResult;
  }

  /**
   * Forgets the parse history of the input that was just submitted.
   *
   * The date survives an add on purpose — it is sticky, so consecutive tasks
   * can be given the same day — which is exactly why a roll still standing has
   * to be taken back off here. The recurrence that moved the date is cleared by
   * the same reset, so leaving its Monday behind would hand the next,
   * non-recurring task a day the user never picked: the lie this roll exists to
   * prevent, one task later.
   *
   * Giving it back is a date change nobody asked for, exactly like the roll
   * itself, so it is announced the same way. The bar is reset here, not
   * dismissed — focus returns to its title field and the date button keeps
   * showing the day the next task will get.
   */
  resetPreviousResult(): void {
    this._parseRunId++;
    this._previousParseResult = null;
    const roll = this._workdayRoll();
    if (roll && roll.to === this._stateService.state().date) {
      this._stateService.updateDate(roll.from);
      this._workdayDateMove.set({ type: 'RESTORED', from: roll.to, to: roll.from });
    } else {
      // Nothing was given back, so the move the region still describes is over
      this._workdayDateMove.set(null);
    }
    this._workdayRoll.set(null);
  }

  /**
   * Applies a value the user picked in one of the add-bar's controls, and takes
   * the syntax that said otherwise out of the input.
   *
   * All four picks below go through the same three steps, which only work
   * together:
   *
   * 1. Strip the syntax the pick overrides, so the text cannot keep advertising
   *    a value the task will not get.
   * 2. Discard an in-flight parse when that strip changed the text. It was
   *    started for the pre-strip input, so its values are already stale, and it
   *    would otherwise land between here and the parse the strip queues —
   *    overwriting both the pick and the ownership record below. The queued
   *    parse recomputes everything it would have published.
   * 3. Record the pick as the previous parse result, so the queued parse reads
   *    the vanished syntax as "the user replaced it" rather than "the user
   *    deleted their syntax", which would clear the value instead of keeping it.
   */

  /** The recurrence picked in the menu, or null when the user cleared it. */
  applyUserRepeatPick(repeat: AddTaskBarRepeat | null): void {
    const cleanedInput = this._stripSyntaxForUserPick('repeat');
    // Every schedule is applied to the day the user actually chose, not to the
    // day a previous schedule rolled that one to. The date already on the chip
    // can be a day this schedule excludes; the task would then be created on
    // the following Monday and the chip would have advertised a first
    // occurrence it never gets. And the roll has to come back off when the new
    // schedule no longer excludes that day, or the bar keeps a Monday nobody
    // picked — until the next parse of the unchanged text puts the weekend day
    // back and quietly changes what submitting writes.
    const currentDate = this._stateService.state().date;
    const dueDate = this._rollForRepeat(this.dateBeforeWorkdayRoll(currentDate), repeat);
    this._recordUserPick({
      repeat,
      isRepeatFromSyntax: false,
      // Record the date too, so the parse the strip queues sees the state it is
      // about to read back as unchanged rather than as a reset.
      ...(dueDate === currentDate ? {} : { dueDate }),
    });
    if (repeat) {
      this._stateService.updateRepeatSetting(repeat, cleanedInput);
    } else {
      this._stateService.clearRepeatSetting(cleanedInput);
    }
    if (dueDate !== currentDate && dueDate !== null) {
      // Time is left as it is — only the day is excluded, not the hour
      this._stateService.updateDate(dueDate);
    }
  }

  applyUserDatePick(
    date: string,
    time: string | null,
    remindOption: TaskReminderOptionId | null,
  ): void {
    const cleanedInput = this._stripSyntaxForUserPick('date');
    // A recurrence phrase is due syntax, so the strip above may have taken one
    // with it — but the user changed the date, not the schedule. Keep the
    // recurrence by taking ownership of it too; it re-anchors to the new date.
    const repeat = this._stateService.state().repeat;
    // Reached from the other side than the repeat pick: an already-set workday
    // schedule excludes the day just picked, so the same roll applies. The day
    // picked here is the base by definition — it is not unwound, or picking the
    // Monday a previous roll produced would silently mean the Saturday behind
    // it.
    const dueDate = this._rollForRepeat(date, repeat);
    this._recordUserPick({
      dueDate,
      dueTime: time,
      ...(repeat ? { repeat, isRepeatFromSyntax: false } : {}),
    });
    this._stateService.updateDate(dueDate, time, cleanedInput);
    // No UI access to a reminder without a time being set
    this._stateService.updateRemindOption(remindOption);
  }

  applyUserDeadlinePick(
    date: string,
    time: string | null,
    remindOption: TaskReminderOptionId | null,
  ): void {
    const cleanedInput = this._stripSyntaxForUserPick('deadline');
    this._recordUserPick({
      deadlineDate: date,
      deadlineTime: time,
      deadlineRemindOption: remindOption,
      isDeadlineFromSyntax: false,
    });
    this._stateService.updateDeadline(date, time, cleanedInput);
    this._stateService.updateDeadlineRemindOption(remindOption);
  }

  applyUserEstimatePick(estimate: number): void {
    const cleanedInput = this._stripSyntaxForUserPick('estimate');
    // The estimate has no ownership flag — the parse simply reports what the
    // text says — so record the null a parse of the stripped input produces.
    // That makes the queued parse a no-op instead of a reset to null.
    this._recordUserPick({ timeEstimate: null });
    this._stateService.updateEstimate(estimate, cleanedInput);
  }

  /**
   * The day the workday recurrence in effect really starts on, given the day
   * the user chose — recording the move so a later change can take it back off.
   *
   * The single place `_workdayRoll` is written: every path that can change
   * either half of the pair (the date or the recurrence) goes through here, so
   * the record cannot describe a roll that is no longer the one standing.
   */
  private _rollForRepeat(base: string, repeat: AddTaskBarRepeat | null): string;
  private _rollForRepeat(
    base: string | null,
    repeat: AddTaskBarRepeat | null,
  ): string | null;
  private _rollForRepeat(
    base: string | null,
    repeat: AddTaskBarRepeat | null,
  ): string | null {
    const previous = this._workdayRoll();
    const rolled = base && rollWeekendDateForRepeat(base, repeat);
    const roll = base && rolled ? { from: base, to: rolled } : null;
    this._workdayRoll.set(roll);
    if (roll) {
      // Re-deriving the roll already standing on every keystroke is not a new
      // move, and announcing it again would talk over the user typing. The day
      // it moves off is part of that comparison, not decoration: choosing the
      // Sunday after the Saturday is a second automatic move, and both end on
      // the same Monday, so the destination alone reads as nothing happening.
      if (roll.from !== previous?.from || roll.to !== previous?.to) {
        this._workdayDateMove.set({ type: 'MOVED', ...roll });
      }
    } else if (previous && base === previous.from) {
      this._workdayDateMove.set({
        type: 'RESTORED',
        from: previous.to,
        to: previous.from,
      });
    }
    return rolled || base;
  }

  /**
   * The day `date` was chosen as, before any workday roll this service applied
   * to it — so a recurrence change re-derives from the day the user chose
   * rather than compounding on this service's own output.
   *
   * Public because it is also the anchor a recurrence *label* has to be built
   * from: every option in the repeat menu re-derives from the day the user
   * chose, so a label built from the rolled day offers "every week on Monday"
   * and saves a Saturday one.
   *
   * Only unwinds a roll that is still the one standing: a date set since
   * replaced it, and is returned as it is.
   */
  dateBeforeWorkdayRoll(date: string | null): string | null {
    const roll = this._workdayRoll();
    return roll && roll.to === date ? roll.from : date;
  }

  private _stripSyntaxForUserPick(
    type: 'date' | 'deadline' | 'estimate' | 'repeat',
  ): string {
    const currentInput = this._stateService.inputTxt();
    const cleanedInput = this.removeShortSyntaxFromInput(currentInput, type);
    if (cleanedInput !== currentInput) {
      // Only safe because the changed text queues a parse that supersedes the
      // discarded one; without a strip there is no such parse to rely on.
      this._parseRunId++;
    }
    return cleanedInput;
  }

  private _recordUserPick(fields: Partial<PreviousParseResult>): void {
    if (this._previousParseResult) {
      this._previousParseResult = { ...this._previousParseResult, ...fields };
    }
  }

  /**
   * Deletes the characters the last parse consumed for `type` from `text`.
   *
   * Returns null when the recorded ranges are not for this exact text, leaving
   * the caller on its regex fallback. The ranges are the only description of a
   * token's real extent: a whitespace-delimited fallback truncates every
   * multi-word one ("@next friday" → "friday", "@every 2 fridays" → "2
   * fridays"), which is worse than not clearing at all — the leftover words
   * stay in the task title.
   */
  private _removeParsedRanges(text: string, type: ShortSyntaxTokenType): string | null {
    if (!this._lastParsedRanges || this._lastParsedRanges.forText !== text) {
      return null;
    }
    const ranges = this._lastParsedRanges.ranges.filter((r) => r.type === type);
    if (!ranges.length) {
      return text;
    }
    // Back to front so an earlier deletion cannot shift a later range
    return [...ranges]
      .sort((a, b) => b.start - a.start)
      .reduce((acc, r) => acc.slice(0, r.start) + acc.slice(r.end), text);
  }

  /**
   * Text with the recurrence syntax taken out.
   *
   * A recurrence parsed from the text owns its whole due token: the phrase plus
   * any adjacent time the token absorbed ("@every friday 3pm"), which the
   * phrase grammar on its own cannot see. Deleting only the phrase orphans that
   * time, and it ends up in the title of both the task and its repeat config.
   *
   * Only the recurrence is this control's to remove, so a current parse that
   * found none leaves the text alone — a "@tomorrow" the user typed is a plain
   * date, not something a recurrence pick overrides. When no parse has landed
   * for this exact text, the derived grammar is the only description of the
   * phrase's extent available, and it can match the phrase alone.
   */
  private _removeRepeatSyntax(text: string): string {
    if (
      this._lastParsedRanges?.forText === text &&
      !this._previousParseResult?.isRepeatFromSyntax
    ) {
      return text;
    }
    return (
      this._removeParsedRanges(text, 'due') ??
      text.replace(SHORT_SYNTAX_REPEAT_REMOVAL_REG_EX, '')
    );
  }

  removeShortSyntaxFromInput(
    currentInput: string,
    type: 'tags' | 'date' | 'estimate' | 'deadline' | 'repeat',
    specificTag?: string,
  ): string {
    if (!currentInput) return currentInput;

    let cleanedInput = currentInput;

    switch (type) {
      case 'tags':
        if (specificTag) {
          // Remove specific tag (e.g., #tagname). Stays token-based: the ranges
          // record which characters were tags, not which tag they named.
          const tagRegex = new RegExp(`\\s*#${specificTag}\\b`, 'gi');
          cleanedInput = cleanedInput.replace(tagRegex, '');
        } else {
          // Remove all tags (e.g., #tag1 #tag2)
          cleanedInput =
            this._removeParsedRanges(cleanedInput, 'tag') ??
            cleanedInput.replace(/\s*#\w+/g, '');
        }
        break;

      case 'date':
        // Remove due syntax (e.g., @today, @next friday, @every 2 fridays). A
        // recurrence phrase is due syntax too — it is the token that set the
        // date — so clearing the date drops it as well; callers that mean to
        // keep the recurrence take ownership of it first.
        cleanedInput =
          this._removeParsedRanges(cleanedInput, 'due') ??
          cleanedInput.replace(/\s*@\S+/g, '');
        break;

      case 'deadline':
        // Remove deadline date and time syntax (e.g., !today !16:30 !2024-01-15)
        cleanedInput =
          this._removeParsedRanges(cleanedInput, 'deadline') ??
          cleanedInput.replace(/\s*!\S+/g, '');
        break;

      case 'repeat':
        // Remove recurrence syntax (e.g., @daily @every friday @every 2 weeks).
        cleanedInput = this._removeRepeatSyntax(cleanedInput);
        break;

      case 'estimate':
        // Remove estimate syntax (e.g., t30m, 1h, 30m/1h, t1.5h)
        cleanedInput =
          this._removeParsedRanges(cleanedInput, 'estimate') ??
          cleanedInput.replace(new RegExp(SHORT_SYNTAX_TIME_REG_EX.source, 'gi'), ' ');
        break;
    }

    // Clean up extra whitespace
    return cleanedInput.replace(/\s+/g, ' ').trim();
  }
}
