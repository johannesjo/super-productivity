import { PFLog } from '../../../core/log';

export class MiniObservable<T, E extends typeof Error = typeof Error> {
  private _value: T;
  private _listeners: Array<(value: T) => void> = [];
  private _closed = false;

  constructor(
    initialValue: T,
    private getOrErrorError?: E,
  ) {
    this._value = initialValue;
  }

  get value(): T {
    return this._value;
  }

  getOrError(): Exclude<T, null | undefined> {
    const v = this._value;
    if (v === undefined || v === null) {
      if (this.getOrErrorError) {
        throw new this.getOrErrorError();
      }
      throw new Error('Value is null or undefined');
    }
    return v as Exclude<T, null | undefined>;
  }

  next(value: T): void {
    if (this._closed) return;
    this._value = value;
    this._notify();
  }

  subscribe(listener: (value: T) => void): () => void {
    if (this._closed) {
      PFLog.err('Cannot subscribe to a closed observable');
      return () => {};
    }

    this._listeners.push(listener);
    listener(this._value);

    // Return unsubscribe function for this specific listener
    return () => this.unsubscribe(listener);
  }

  // Unsubscribe a specific listener
  unsubscribe(listener: (value: T) => void): void {
    this._listeners = this._listeners.filter((l) => l !== listener);
  }

  // Add a complete method to handle closing the observable
  complete(): void {
    if (!this._closed) {
      this._listeners = [];
      this._closed = true;
    }
  }

  private _notify(): void {
    this._listeners.forEach((listener) => listener(this._value));
  }
}
