/* main advantages:
--------------------
 * less writes to a much smaller model
 * also likely good for performance in some cases, since view models are more granular
 * can be flushed to database less often while other data can be written whenever something is changed (maybe debounced to every 10s)
 * disk space should remain about the same (additional id props vs previous sub props like workStart etc. on every task and project)
 * theoretically we could also use the model to collect sessions to keep track of when time is spent during the day
 */

// we could maybe store time as seconds with 3 digits precision that can be rounded when being moved to archive

/* NEW SYNC MODEL OUTLINE

A
=======
3 +x files
frequent: main sync file and tasks
base: projects, tags, settings, boards, etc.
currentArchive: current year (min 365 days)
oldArchive: all previous years data

B
=======
2 +x files
main: as is
currentArchive: current year (min 365 + 2  days – +2 to work around timezone stuff)
oldArchive: all previous years data

How to handle flushing to oldArchive?
* keep track of last old archive update in main file
* if it's more than 1 year ago, flush to oldArchive
 */

export interface TrackingDay {
  // flushed to archive after 14 days
  // since apart from quick history and worklog we don't need more than that
  workStart: {
    [projectOrTagId: string]: number;
  };
  workEnd: {
    [projectOrTagId: string]: number;
  };
  breakTime: number;
}

export interface TrackingTaskState {
  // flushed to archive together with task
  [taskId: string]: {
    [dateStr: string]: number;
  };

  // ...merged with (rarely changing) archive data
}

export interface TrackingState {
  task: TrackingTaskState;
  other: {
    [dateStr: string]: TrackingDay;
    // ... merged with (rarely changing) archive data to map
  };
}

// ^ same for archive and non archive
