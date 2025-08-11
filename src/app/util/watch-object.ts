// TODO untested

export const watchObject = <T extends object>(
  obj: T,
  onChange: (prop: string, value: unknown) => void,
): T =>
  new Proxy(obj, {
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    set(target, prop, value): boolean {
      // Log.log(`Property ${String(prop)} changed from ${target[prop]} to ${value}`);
      onChange(String(prop), value);
      return Reflect.set(target, prop, value);
    },
  });
