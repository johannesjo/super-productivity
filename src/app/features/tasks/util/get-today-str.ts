import { getLocalDateStr } from '../../../util/get-local-date-str';

// NOTE: locale is important as it might break a lot of stuff for non arabic numbers
export const getTodayStr = (): string => getLocalDateStr(new Date());
