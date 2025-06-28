import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'durationToString' })
export class DurationToStringPipe implements PipeTransform {
  transform: (value: any, ...args: any[]) => any = durationToString;
}

/* eslint-disable no-mixed-operators */
export const durationToString = (value: any, args?: any): any => {
  if (!value) {
    return '';
  }

  let milliseconds = 0;

  // Handle number (milliseconds)
  if (typeof value === 'number') {
    milliseconds = value;
  }
  // Handle SimpleDuration object with asMilliseconds method
  else if (value.asMilliseconds && typeof value.asMilliseconds === 'function') {
    milliseconds = value.asMilliseconds();
  }
  // Handle object with _milliseconds property (moment-like)
  else if (value._milliseconds) {
    milliseconds = value._milliseconds;
  }
  // Handle object with _data property (moment duration internal structure)
  else if (value._data) {
    const dd = value._data;
    milliseconds =
      (dd.milliseconds || 0) +
      (dd.seconds || 0) * 1000 +
      (dd.minutes || 0) * 60 * 1000 +
      (dd.hours || 0) * 60 * 60 * 1000 +
      (dd.days || 0) * 24 * 60 * 60 * 1000;
  }
  // Handle ISO 8601 duration string
  else if (typeof value === 'string') {
    // Basic ISO 8601 duration parsing
    const match = value.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const days = parseInt(match[1]) || 0;
      const hours = parseInt(match[2]) || 0;
      const minutes = parseInt(match[3]) || 0;
      const seconds = parseInt(match[4]) || 0;
      milliseconds =
        seconds * 1000 +
        minutes * 60 * 1000 +
        hours * 60 * 60 * 1000 +
        days * 24 * 60 * 60 * 1000;
    } else {
      return '';
    }
  } else {
    return '';
  }

  if (milliseconds <= 0) {
    return '';
  }

  // Convert milliseconds to readable format
  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  let result = '';
  if (days > 0) result += days + 'd ';
  if (hours > 0) result += hours + 'h ';
  if (minutes > 0) result += minutes + 'm ';
  if (seconds > 0) result += seconds + 's ';

  return result.trim();
};
/* eslint-enable no-mixed-operators */
