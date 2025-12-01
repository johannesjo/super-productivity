import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'sort', standalone: true })
export class SortPipe implements PipeTransform {
  transform<T>(
    array: readonly T[] | null | undefined,
    field: keyof T,
    reverse: boolean = false,
  ): T[] {
    if (!Array.isArray(array) || array.length === 0) {
      return [];
    }

    const factor = reverse ? -1 : 1;
    const arr = [...array];

    arr.sort((a, b) => {
      const aValue = a[field] as unknown;
      const bValue = b[field] as unknown;

      if (aValue == null && bValue == null) {
        return 0;
      }
      if (aValue == null) {
        return -1 * factor;
      }
      if (bValue == null) {
        return 1 * factor;
      }

      if (aValue < bValue) {
        return -1 * factor;
      }
      if (aValue > bValue) {
        return 1 * factor;
      }
      return 0;
    });

    return arr;
  }
}
