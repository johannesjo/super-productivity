import { defer, Observable, Subscriber } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { Log } from '../core/log';

export const obsLogAll$ = <T>(
  sourceOrName: Observable<T> | string,
  source?: Observable<T>,
): Observable<T> => {
  const name = typeof sourceOrName === 'string' ? sourceOrName : 'obs$';
  const usedSource = typeof sourceOrName === 'string' ? source : sourceOrName;
  return subscriberCount$(obsLog$(usedSource, name), name);
};

export const obsLog$ = <T>(source: Observable<T>, name: string = 'obs$'): Observable<T> =>
  defer(() => {
    Log.log(`_o_ ${name}: subscribed ++`);
    return source.pipe(
      tap({
        next: (value) => Log.log(`_o_ ${name}: ${value}`),
        complete: () => Log.log(`_o_ ${name}: $$$ complete $$$`),
      }),
      finalize(() => Log.log(`_o_ ${name}: unsubscribed --`)),
    );
  });

export const subscriberCount$ = <T>(
  sourceObservable: Observable<T>,
  name: string = 'obs$',
): Observable<T> => {
  let counter = 0;
  return new Observable((subscriber: Subscriber<T>) => {
    const subscription = sourceObservable.subscribe(subscriber);
    counter++;
    Log.log(`_o_ ${name} subs: ${counter}`);

    return () => {
      subscription.unsubscribe();
      counter--;
      Log.log(`_o_ ${name} subs: ${counter}`);
    };
  });
};
