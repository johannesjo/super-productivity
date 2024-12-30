import { Pipe, PipeTransform } from '@angular/core';
import { roundDurationVanilla } from '../../util/round-duration';

@Pipe({ name: 'roundDuration' })
export class RoundDurationPipe implements PipeTransform {
  transform(value: number, ...args: unknown[]): number | undefined {
    if (value) {
      return roundDurationVanilla(value, '5M');
    }
    return undefined;
  }
}
