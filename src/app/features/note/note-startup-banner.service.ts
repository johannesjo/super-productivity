import { inject, Injectable } from '@angular/core';
import { NoteService } from './note.service';
import { BannerService } from '../../core/banner/banner.service';
import { BannerId } from '../../core/banner/banner.model';
import { take } from 'rxjs/operators';
import { Note } from './note.model';
import { getDbDateStr } from '../../util/get-db-date-str';
import { LS } from '../../core/persistence/storage-keys.const';
import { devError } from '../../util/dev-error';
import { T } from '../../t.const';

interface LastViewedNote {
  noteId: string;
  day: string;
}

@Injectable({ providedIn: 'root' })
export class NoteStartupBannerService {
  private readonly _noteService = inject(NoteService);
  private readonly _bannerService = inject(BannerService);

  async showLastNoteIfNeeded(): Promise<void> {
    const notes = await this._noteService.notes$.pipe(take(1)).toPromise();
    if (!notes?.length) {
      return;
    }

    const latestNote = this._getLatestNote(notes);
    if (!latestNote) {
      return;
    }

    const todayStr = getDbDateStr();
    const createdDay = getDbDateStr(latestNote.created);

    if (todayStr > createdDay) {
      return;
    }

    const lastViewed = this._getLastViewedNote();
    if (lastViewed?.noteId === latestNote.id && lastViewed.day === todayStr) {
      return;
    }

    const content = this._getContent(latestNote.content);
    const createdDate = new Date(latestNote.created).toLocaleDateString();

    this._bannerService.open({
      id: BannerId.StartupNote,
      msg: T.F.REFLECTION_NOTE.MSG,
      ico: 'note',
      translateParams: {
        content,
        date: createdDate,
      },
      action: {
        label: T.F.REFLECTION_NOTE.ACTION_DISMISS,
        fn: () => this._setLastViewed(latestNote.id, todayStr),
      },
      isHideDismissBtn: true,
    });
  }

  private _getContent(content: string): string {
    return content.replace(/\s+/g, ' ').trim();
  }

  private _getLatestNote(notes: Note[]): Note | undefined {
    return notes.reduce<Note | undefined>((acc, note) => {
      if (!acc) {
        return note;
      }
      return note.created > acc.created ? note : acc;
    }, undefined);
  }

  private _getLastViewedNote(): LastViewedNote | null {
    const raw = localStorage.getItem(LS.LAST_NOTE_BANNER_DAY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as LastViewedNote;
      if (!parsed.noteId || !parsed.day) {
        throw new Error('Invalid last note banner local storage value');
      }
      return parsed;
    } catch (e) {
      devError(e);
      return null;
    }
  }

  private _setLastViewed(noteId: string, day: string): void {
    localStorage.setItem(
      LS.LAST_NOTE_BANNER_DAY,
      JSON.stringify({
        noteId,
        day,
      }),
    );
  }
}
