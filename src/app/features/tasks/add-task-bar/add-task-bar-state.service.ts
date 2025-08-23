import { Injectable, signal, WritableSignal } from '@angular/core';
import { Project } from '../../project/project.model';
import { Tag } from '../../tag/tag.model';
import { AddTaskBarState, INITIAL_ADD_TASK_BAR_STATE } from './add-task-bar.const';

@Injectable()
export class AddTaskBarStateService {
  private readonly _taskInputState: WritableSignal<AddTaskBarState> = signal({
    ...INITIAL_ADD_TASK_BAR_STATE,
  });

  readonly state = this._taskInputState.asReadonly();
  readonly isAutoDetected = signal(false);

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

  clearTags(): void {
    this._taskInputState.update((state) => ({ ...state, tags: [], newTagTitles: [] }));
  }

  clearDate(): void {
    this._taskInputState.update((state) => ({ ...state, date: null, time: null }));
  }

  clearEstimate(): void {
    this._taskInputState.update((state) => ({ ...state, estimate: null }));
  }

  resetState(): void {
    this._taskInputState.set({
      ...INITIAL_ADD_TASK_BAR_STATE,
    });
    this.isAutoDetected.set(false);
  }

  setAutoDetectedProject(project: Project): void {
    this.updateProject(project);
    this.isAutoDetected.set(true);
  }
}
