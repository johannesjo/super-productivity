import { getDbDateStr } from '../../../util/get-db-date-str';

// NOTE: locale is important as it might break a lot of stuff for non arabic numbers
export const getTodayStr = (): string => getDbDateStr(new Date());
