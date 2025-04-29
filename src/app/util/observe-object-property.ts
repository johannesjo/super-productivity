import { BehaviorSubject, Observable } from 'rxjs';

export const observeObjectProperty = <T extends object, K extends keyof T>(
  obj: T,
  propertyKey: K,
): Observable<T[K]> => {
  // Create a subject with the initial value
  const subject = new BehaviorSubject<T[K]>(obj[propertyKey]);

  // Store the original value
  let value = obj[propertyKey];

  // Define a getter/setter for the property
  Object.defineProperty(obj, propertyKey, {
    configurable: true,
    enumerable: true,
    get: () => value,
    set: (newValue) => {
      value = newValue;
      subject.next(newValue);
    },
  });

  // Return the observable part of the subject
  return subject.asObservable();
};
