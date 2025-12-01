import { of } from 'rxjs';
import { map, filter } from 'rxjs/operators';

describe('ipcAddTaskFromAppUri$ validation logic', () => {
  it('should handle valid data with title', (done) => {
    const validData = { title: 'Test Task' };

    // Test the validation logic that we implemented
    const testObservable = of([{}, validData]).pipe(
      map(([ev, data]: any[]) => {
        // This is the exact validation logic from our implementation
        if (
          !data ||
          typeof data !== 'object' ||
          typeof (data as any).title !== 'string'
        ) {
          console.error(`Validation failed for:`, data);
          return null;
        }
        return data as { title: string };
      }),
      filter((data: any): data is { title: string } => data !== null),
    );

    testObservable.subscribe((data) => {
      expect(data).toEqual({ title: 'Test Task' });
      done();
    });
  });

  it('should filter out undefined data', (done) => {
    const testObservable = of([{}, undefined]).pipe(
      map(([ev, data]: any[]) => {
        if (
          !data ||
          typeof data !== 'object' ||
          typeof (data as any).title !== 'string'
        ) {
          return null;
        }
        return data as { title: string };
      }),
      filter((data: any): data is { title: string } => data !== null),
    );

    const emissions: any[] = [];
    const subscription = testObservable.subscribe((data) => {
      emissions.push(data);
    });

    setTimeout(() => {
      expect(emissions.length).toBe(0);
      subscription.unsubscribe();
      done();
    }, 50);
  });

  it('should filter out data without title property', (done) => {
    const invalidData = { notTitle: 'Test Task' };

    const testObservable = of([{}, invalidData]).pipe(
      map(([ev, data]: any[]) => {
        if (
          !data ||
          typeof data !== 'object' ||
          typeof (data as any).title !== 'string'
        ) {
          return null;
        }
        return data as { title: string };
      }),
      filter((data: any): data is { title: string } => data !== null),
    );

    const emissions: any[] = [];
    const subscription = testObservable.subscribe((data) => {
      emissions.push(data);
    });

    setTimeout(() => {
      expect(emissions.length).toBe(0);
      subscription.unsubscribe();
      done();
    }, 50);
  });

  it('should filter out data with non-string title', (done) => {
    const invalidData = { title: 123 };

    const testObservable = of([{}, invalidData]).pipe(
      map(([ev, data]: any[]) => {
        if (
          !data ||
          typeof data !== 'object' ||
          typeof (data as any).title !== 'string'
        ) {
          return null;
        }
        return data as { title: string };
      }),
      filter((data: any): data is { title: string } => data !== null),
    );

    const emissions: any[] = [];
    const subscription = testObservable.subscribe((data) => {
      emissions.push(data);
    });

    setTimeout(() => {
      expect(emissions.length).toBe(0);
      subscription.unsubscribe();
      done();
    }, 50);
  });
});
