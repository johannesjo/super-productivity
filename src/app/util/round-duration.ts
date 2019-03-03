import * as moment from 'moment-mini';
import { Duration } from 'moment-mini';
import { RoundTimeOption } from '../features/project/project.model';

export const roundDuration = (val: Duration | number, roundTo: RoundTimeOption, isRoundUp): Duration => {
  let rounded;
  const value = (typeof val === 'number')
    ? moment.duration({millisecond: val})
    : val;

  switch (roundTo) {
    case 'QUARTER':
      rounded = Math.round(value.asMinutes() / 15) * 15;
      if (isRoundUp) {
        rounded = Math.ceil(value.asMinutes() / 15) * 15;
      }
      return moment.duration({minutes: rounded});

    case 'HALF':
      rounded = Math.round(value.asMinutes() / 30) * 30;
      if (isRoundUp) {
        rounded = Math.ceil(value.asMinutes() / 30) * 30;
      }
      return moment.duration({minutes: rounded});

    case 'HOUR':
      rounded = Math.round(value.asMinutes() / 60) * 60;
      if (isRoundUp) {
        rounded = Math.ceil(value.asMinutes() / 60) * 60;
      }
      return moment.duration({minutes: rounded});

    default:
      return value;
  }
};
