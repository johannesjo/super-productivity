import { effect, Injectable, signal, WritableSignal } from '@angular/core';
import { Project } from '../../project/project.model';
import { Tag } from '../../tag/tag.model';
import { AddTaskBarState, INITIAL_ADD_TASK_BAR_STATE } from './add-task-bar.const';
import { toObservable } from '@angular/core/rxjs-interop';
import { SS } from '../../../core/persistence/storage-keys.const';

@Injectable()
export class AddTaskBarStateService {
  private readonly _taskInputState: WritableSignal<AddTaskBarState> = signal({
    ...INITIAL_ADD_TASK_BAR_STATE,
  });

  readonly inputTxt = signal(sessionStorage.getItem(SS.ADD_TASK_BAR_TXT) || '');
  readonly inputTxt$ = toObservable(this.inputTxt);
  readonly state = this._taskInputState.asReadonly();
  readonly isAutoDetected = signal(false);

  constructor() {
    effect(() => {
      sessionStorage.setItem(SS.ADD_TASK_BAR_TXT, this.inputTxt());
    });
  }

  updateProject(project: Project | null): void {
    this._taskInputState.update((state) => ({ ...state, project }));
    // Clear auto-detected flag when manually changing project
    this.isAutoDetected.set(false);
  }

  updateDate(date: Date | null, time?: string | null): void {
    this._taskInputState.update((state) => ({
      ...state,
      date,
      time: time !== undefined ? time : state.time,
    }));
  }

  updateTime(time: string | null): void {
    this._taskInputState.update((state) => ({ ...state, time }));
  }

  updateEstimate(estimate: number | null): void {
    this._taskInputState.update((state) => ({ ...state, estimate }));
  }

  toggleTag(tag: Tag, cleanedInputTxt?: string): void {
    this._taskInputState.update((state) => {
      const existingIndex = state.tags.findIndex((t) => t.id === tag.id);
      if (existingIndex >= 0) {
        // Remove tag
        return {
          ...state,
          tags: state.tags.filter((_, index) => index !== existingIndex),
        };
      } else {
        // Add tag
        return {
          ...state,
          tags: [...state.tags, tag],
        };
      }
    });
    if (cleanedInputTxt !== undefined) {
      this.inputTxt.set(cleanedInputTxt);
    }
  }

  updateTags(tags: Tag[]): void {
    this._taskInputState.update((state) => ({ ...state, tags }));
  }

  updateNewTagTitles(newTagTitles: string[]): void {
    this._taskInputState.update((state) => ({ ...state, newTagTitles }));
  }

  updateCleanText(cleanText: string | null): void {
    this._taskInputState.update((state) => ({ ...state, cleanText }));
  }

  updateInputTxt(inputTxt: string): void {
    this.inputTxt.set(inputTxt);
  }

  clearTags(cleanedInputTxt?: string): void {
    this._taskInputState.update((state) => ({ ...state, tags: [], newTagTitles: [] }));
    if (cleanedInputTxt !== undefined) {
      this.inputTxt.set(cleanedInputTxt);
    }
  }

  clearDate(cleanedInputTxt?: string): void {
    this._taskInputState.update((state) => ({ ...state, date: null, time: null }));
    if (cleanedInputTxt !== undefined) {
      this.inputTxt.set(cleanedInputTxt);
    }
  }

  clearEstimate(cleanedInputTxt?: string): void {
    this._taskInputState.update((state) => ({ ...state, estimate: null }));
    if (cleanedInputTxt !== undefined) {
      this.inputTxt.set(cleanedInputTxt);
    }
  }

  resetAfterAdd(): void {
    // Only clear input text and tags, preserve project, date, and estimate
    this._taskInputState.update((state) => ({
      ...state,
      tags: [],
      newTagTitles: [],
      cleanText: null,
    }));
    this.inputTxt.set('');
    // Keep isAutoDetected as is to preserve project selection
  }

  setAutoDetectedProject(project: Project): void {
    this.updateProject(project);
    this.isAutoDetected.set(true);
  }
}
