import { Observable } from 'rxjs';

export const observeMutation = (
  target: HTMLElement,
  config,
): Observable<MutationRecord[]> => {
  return new Observable((observer) => {
    const mutation = new MutationObserver((mutations, instance) => {
      observer.next(mutations);
    });
    mutation.observe(target, config);
    return () => {
      mutation.disconnect();
    };
  });
};
