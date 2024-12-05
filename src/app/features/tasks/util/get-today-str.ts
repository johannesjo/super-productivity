import { getWorklogStr } from '../../../util/get-work-log-str';

// NOTE: locale is important as it might break a lot of stuff for non arabic numbers
export const getTodayStr = (): string => getWorklogStr(new Date());
