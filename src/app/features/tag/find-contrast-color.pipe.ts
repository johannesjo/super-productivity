import {Pipe, PipeTransform} from '@angular/core';

@Pipe({name: 'findContrastColor'})
export class FindContrastColorPipe implements PipeTransform {
  transform(color: string): string {
    if (!color) {
      return 'black';
    }
    color = color.replace('#', '');
    const digitLength = color.length === 6 ? 2 : 1;
    const colorSum = color
      .match(new RegExp(`.{1,${digitLength}}`, 'g'))
      .map(hex => parseInt(hex, 16))
      .reduce((sum, val) => sum + val, 0);
    return colorSum > (128 * 3) ? 'black' : 'white';
  }
}
