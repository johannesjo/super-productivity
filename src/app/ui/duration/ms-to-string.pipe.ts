import { Pipe, PipeTransform } from '@angular/core';

const S = 1000;
const M = S * 60;
const H = M * 60;

export const msToString = (
  value: any,
  isShowSeconds?: boolean,
  isHideEmptyPlaceholder?: boolean,
): string => {
  const hours = Math.floor(value / H);
  // prettier-ignore
  const minutes = Math.floor((value - (hours * H)) / M);
  // prettier-ignore
  const seconds = isShowSeconds ? Math.floor((value - (hours * H) - (minutes * M)) / S) : 0;

  const parsed =
    // ((+md.days() > 0) ? (md.days() + 'd ') : '')
    (hours > 0 ? hours + 'h ' : '') +
    (minutes > 0 ? minutes + 'm ' : '') +
    (isShowSeconds && seconds > 0 ? seconds + 's ' : '');

  if (!isHideEmptyPlaceholder && parsed.trim() === '') {
    return '-';
  }

  return parsed.trim();
};

@Pipe({ name: 'msToString' })
export class MsToStringPipe implements PipeTransform {
  transform: (
    value: any,
    isShowSeconds?: boolean,
    isHideEmptyPlaceholder?: boolean,
  ) => string = msToString;
}
