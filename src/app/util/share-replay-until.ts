import { Observable, SchedulerLike } from 'rxjs';
import { shareReplay, takeUntil } from 'rxjs/operators';

// taken from: https://stackblitz.com/edit/rxjs-sharereplayuntil
export const shareReplayUntil =
  <T>(
    end$: Observable<void>,
    bufferSize?: number,
    windowTime?: number,
    scheduler?: SchedulerLike,
  ) =>
  (source: Observable<T>): Observable<T> =>
    source.pipe(takeUntil(end$), shareReplay(bufferSize, windowTime, scheduler));
