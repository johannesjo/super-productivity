import { Injectable, signal, WritableSignal } from '@angular/core';
import { Project } from '../../project/project.model';
import { Tag } from '../../tag/tag.model';
import { AddTaskBarState } from './add-task-bar.const';
// Using custom storage keys since they don't exist in the main const file

@Injectable()
export class AddTaskBarStateService {
  // TODO to const
  private readonly _initialState: AddTaskBarState = {
    project: null,
    tags: [],
    date: null,
    time: null,
    estimate: null,
    newTagTitles: [],
    cleanText: null,
  };

  private readonly _taskInputState: WritableSignal<AddTaskBarState> = signal(
    this._loadPersistedState(),
  );

  readonly state = this._taskInputState.asReadonly();
  readonly isAutoDetected = signal(false);

  private _loadPersistedState(): AddTaskBarState {
    try {
      const savedState = sessionStorage.getItem('SUP_TASK_INPUT_STATE');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        // Restore dates as Date objects
        if (parsed.date) {
          parsed.date = new Date(parsed.date);
        }
        return { ...this._initialState, ...parsed };
      }
    } catch (e) {
      console.error('Failed to load persisted task input state', e);
    }
    return { ...this._initialState };
  }

  private _persistState(): void {
    try {
      sessionStorage.setItem(
        'SUP_TASK_INPUT_STATE',
        JSON.stringify(this._taskInputState()),
      );
    } catch (e) {
      console.error('Failed to persist task input state', e);
    }
  }

  updateProject(project: Project | null): void {
    this._taskInputState.update((state) => ({ ...state, project }));
    // Clear auto-detected flag when manually changing project
    this.isAutoDetected.set(false);
    this._persistState();
  }

  updateDate(date: Date | null, time?: string | null): void {
    this._taskInputState.update((state) => ({
      ...state,
      date,
      time: time !== undefined ? time : state.time,
    }));
    this._persistState();
  }

  updateTime(time: string | null): void {
    this._taskInputState.update((state) => ({ ...state, time }));
    this._persistState();
  }

  updateEstimate(estimate: number | null): void {
    this._taskInputState.update((state) => ({ ...state, estimate }));
    this._persistState();
  }

  toggleTag(tag: Tag): void {
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
    this._persistState();
  }

  updateTags(tags: Tag[]): void {
    this._taskInputState.update((state) => ({ ...state, tags }));
    this._persistState();
  }

  updateNewTagTitles(newTagTitles: string[]): void {
    this._taskInputState.update((state) => ({ ...state, newTagTitles }));
    this._persistState();
  }

  updateCleanText(cleanText: string | null): void {
    this._taskInputState.update((state) => ({ ...state, cleanText }));
    this._persistState();
  }

  clearTags(): void {
    this._taskInputState.update((state) => ({ ...state, tags: [], newTagTitles: [] }));
    this._persistState();
  }

  clearDate(): void {
    this._taskInputState.update((state) => ({ ...state, date: null, time: null }));
    this._persistState();
  }

  clearEstimate(): void {
    this._taskInputState.update((state) => ({ ...state, estimate: null }));
    this._persistState();
  }

  resetState(defaultProject: Project | null): void {
    this._taskInputState.set({
      ...this._initialState,
      project: defaultProject,
    });
    this.isAutoDetected.set(false);
    this._persistState();
  }

  setAutoDetectedProject(project: Project): void {
    this.updateProject(project);
    this.isAutoDetected.set(true);
  }

  getValue(): AddTaskBarState {
    return this._taskInputState();
  }
}
