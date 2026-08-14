import { mapToScheduleDays } from './map-to-schedule-days';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import { getDbDateStr } from '../../../util/get-db-date-str';

const H = 60 * 60 * 1000;
const h = (hr: number): number => hr * H;

// Mid-day on the 1st. Month view's daysToShow[0] is the first *grid* cell --
// the start of the week containing the 1st -- so day 0 sits in the previous
// month while contextNow stays on the selected date. Week view has no such gap.
const NOW = new Date(1970, 0, 1, 9, 0, 0, 0).getTime();
const MONTH_GRID = ['1969-12-30', '1969-12-31', '1970-01-01', '1970-01-02'];

const repeatCfg = (add?: Partial<TaskRepeatCfg>): TaskRepeatCfg =>
  ({
    id: 'R_MONTHLY',
    startDate: '1969-01-01',
    startTime: undefined,
    lastTaskCreationDay: getDbDateStr(new Date(1969, 11, 31).getTime()),
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: true,
    repeatCycle: 'MONTHLY',
    repeatEvery: 1,
    defaultEstimate: h(1),
    ...add,
  }) as Partial<TaskRepeatCfg> as TaskRepeatCfg;

const projectionDays = (cfg: TaskRepeatCfg, dayDates: string[]): (string | undefined)[] =>
  mapToScheduleDays(
    NOW,
    dayDates,
    [],
    [],
    [],
    [cfg],
    [],
    null,
    {},
    undefined,
    undefined,
    NOW,
  )
    .flatMap((d) => d.entries)
    .filter((e) => e.type.startsWith('RepeatProjection'))
    .map((e) => e.plannedForDay);

describe('untimed repeat projections resolve to the day they are due', () => {
  // createScheduleDays looked up "which cfgs are due" with `startTime`, which is
  // `now` for day 0. That only equals day 0 while day 0 contains now -- true in
  // week view, false in month view. The monthly occurrence therefore also
  // rendered on grid cell 0, stamped plannedForDay of that cell, and the repeat
  // dialog resolves targetDate from plannedForDay -- so "skip instance" wrote
  // the grid cell's date into the synced deletedInstanceDates and left the real
  // occurrence in place.
  it('does not project a monthly occurrence onto month view grid cell 0', () => {
    expect(projectionDays(repeatCfg(), MONTH_GRID)).toEqual(['1970-01-01']);
  });

  // Guards the fix against being "corrected" back: week view's day 0 IS now's
  // day, and every other spec uses a midnight `now`, where the two anchors
  // coincide and the difference is invisible.
  it('still projects on week view day 0 when now is mid-day', () => {
    expect(
      projectionDays(repeatCfg({ id: 'R_DAILY', repeatCycle: 'DAILY' }), [
        '1970-01-01',
        '1970-01-02',
      ]),
    ).toEqual(['1970-01-01', '1970-01-02']);
  });
});
