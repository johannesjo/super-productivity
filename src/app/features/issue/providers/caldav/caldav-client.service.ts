import { Injectable } from '@angular/core';
import { CaldavCfg } from './caldav.model';
// @ts-ignore
import DavClient, { namespaces as NS } from 'cdav-library';
// @ts-ignore
import Calendar from 'cdav-library/models/calendar';
// @ts-ignore
import ICAL from 'ical.js';

import { from, Observable, throwError } from 'rxjs';
import { CaldavIssue } from './caldav-issue/caldav-issue.model';
import { CALDAV_TYPE } from '../../issue.const';
import { SearchResultItem } from '../../issue.model';
import { SnackService } from '../../../../core/snack/snack.service';
import { T } from '../../../../t.const';
import { catchError } from 'rxjs/operators';
import { HANDLED_ERROR_PROP_STR } from '../../../../app.constants';
import { throwHandledError } from '../../../../util/throw-handled-error';

interface ClientCache {
  client: DavClient;
  calendars: Map<string, Calendar>;
}

@Injectable({
  providedIn: 'root',
})
export class CaldavClientService {
  private _clientCache = new Map<string, ClientCache>();

  constructor(private readonly _snackService: SnackService) {}

  private static _isValidSettings(cfg: CaldavCfg): boolean {
    return (
      !!cfg &&
      !!cfg.caldavUrl &&
      cfg.caldavUrl.length > 0 &&
      !!cfg.resourceName &&
      cfg.resourceName.length > 0 &&
      !!cfg.username &&
      cfg.username.length > 0 &&
      !!cfg.password &&
      cfg.password.length > 0
    );
  }

  private static _getCalendarUriFromUrl(url: string) {
    if (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }

    return url.substring(url.lastIndexOf('/') + 1);
  }

  private static async _getAllTodos(calendar: any, filterOpen: boolean) {
    const query = {
      name: [NS.IETF_CALDAV, 'comp-filter'],
      attributes: [['name', 'VCALENDAR']],
      children: [
        {
          name: [NS.IETF_CALDAV, 'comp-filter'],
          attributes: [['name', 'VTODO']],
        },
      ],
    };

    if (filterOpen) {
      // @ts-ignore
      query.children[0].children = [
        {
          name: [NS.IETF_CALDAV, 'prop-filter'],
          attributes: [['name', 'completed']],
          children: [
            {
              name: [NS.IETF_CALDAV, 'is-not-defined'],
            },
          ],
        },
      ];
    }

    return await calendar.calendarQuery([query]);
  }

  private static async _findTaskByUid(calendar: any, taskUid: string) {
    const query = {
      name: [NS.IETF_CALDAV, 'comp-filter'],
      attributes: [['name', 'VCALENDAR']],
      children: [
        {
          name: [NS.IETF_CALDAV, 'comp-filter'],
          attributes: [['name', 'VTODO']],
          children: [
            {
              name: [NS.IETF_CALDAV, 'prop-filter'],
              attributes: [['name', 'uid']],
              children: [
                {
                  name: [NS.IETF_CALDAV, 'text-match'],
                  value: taskUid,
                },
              ],
            },
          ],
        },
      ],
    };
    return await calendar.calendarQuery([query]);
  }

  private static _mapTask(task: any): CaldavIssue {
    const jCal = ICAL.parse(task.data);
    const comp = new ICAL.Component(jCal);
    const todo = comp.getFirstSubcomponent('vtodo');

    let categories: string[] = [];
    for (const cats of todo.getAllProperties('categories')) {
      if (cats) {
        categories = categories.concat(cats.getValues());
      }
    }

    const completed = todo.getFirstPropertyValue('completed');

    return {
      id: todo.getFirstPropertyValue('uid'),
      completed: !!completed,
      item_url: task.url,
      summary: todo.getFirstPropertyValue('summary') || '',
      due: todo.getFirstPropertyValue('due') || '',
      start: todo.getFirstPropertyValue('dtstart') || '',
      labels: categories,
      note: todo.getFirstPropertyValue('description') || '',
      etag_hash: this._hashEtag(task.etag),
    };
  }

  private static _hashEtag(etag: string): number {
    let hash = 0;
    let i;
    let chr;
    if (etag.length === 0) {
      return hash;
    }
    for (i = 0; i < this.length; i++) {
      chr = etag.charCodeAt(i);
      hash = (hash << 5) - hash + chr; //eslint-disable-line no-bitwise
      // Convert to 32bit integer
      hash |= 0; //eslint-disable-line no-bitwise
    }
    return hash;
  }

  async _get_client(cfg: CaldavCfg): Promise<ClientCache> {
    this._checkSettings(cfg);

    const client_key = `${cfg.caldavUrl}|${cfg.username}|${cfg.password}`;

    if (this._clientCache.has(client_key)) {
      return this._clientCache.get(client_key) as ClientCache;
    } else {
      const client = new DavClient(
        {
          rootUrl: cfg.caldavUrl,
        },
        this._getXhrProvider(cfg),
      );

      await client
        .connect({ enableCalDAV: true })
        .catch((err: any) => this._handleNetErr(err));

      const cache = {
        client,
        calendars: new Map(),
      };
      this._clientCache.set(client_key, cache);

      return cache;
    }
  }

  async _getCalendar(cfg: CaldavCfg) {
    const clientCache = await this._get_client(cfg);
    const resource = cfg.resourceName as string;

    if (clientCache.calendars.has(resource)) {
      return clientCache.calendars.get(resource);
    }

    const calendars = await clientCache.client.calendarHomes[0]
      .findAllCalendars()
      .catch((err: any) => this._handleNetErr(err));

    const calendar = calendars.find(
      (item: Calendar) =>
        (item.displayname || CaldavClientService._getCalendarUriFromUrl(item.url)) ===
        resource,
    );

    if (calendar !== undefined) {
      clientCache.calendars.set(resource, calendar);
      return calendar;
    }

    this._snackService.open({
      type: 'ERROR',
      translateParams: {
        calendarName: cfg.resourceName as string,
      },
      msg: T.F.CALDAV.S.CALENDAR_NOT_FOUND,
    });
    throw new Error('CALENDAR NOT FOUND: ' + cfg.resourceName);
  }

  getOpenTasks$(cfg: CaldavCfg): Observable<CaldavIssue[]> {
    return from(this._getTasks(cfg, true, true)).pipe(
      catchError((err) => throwError({ [HANDLED_ERROR_PROP_STR]: 'Caldav: ' + err })),
    );
  }

  searchOpenTasks$(text: string, cfg: CaldavCfg): Observable<SearchResultItem[]> {
    return from(
      this._getTasks(cfg, true, true).then((tasks) =>
        tasks
          .filter((todo) => todo.summary.includes(text))
          .map((todo) => {
            return {
              title: todo.summary,
              issueType: CALDAV_TYPE,
              issueData: todo,
            };
          }),
      ),
    ).pipe(
      catchError((err) => throwError({ [HANDLED_ERROR_PROP_STR]: 'Caldav: ' + err })),
    );
  }

  getById$(id: string | number, caldavCfg: CaldavCfg): Observable<CaldavIssue> {
    if (typeof id === 'number') {
      id = id.toString(10);
    }
    return from(this._getTask(caldavCfg, id)).pipe(
      catchError((err) => throwError({ [HANDLED_ERROR_PROP_STR]: 'Caldav: ' + err })),
    );
  }

  getByIds$(ids: string[], cfg: CaldavCfg): Observable<CaldavIssue[]> {
    return from(
      this._getTasks(cfg, false, false).then((tasks) =>
        tasks.filter((task) => task.id in ids),
      ),
    ).pipe(
      catchError((err) => throwError({ [HANDLED_ERROR_PROP_STR]: 'Caldav: ' + err })),
    );
  }

  updateCompletedState$(
    caldavCfg: CaldavCfg,
    issueId: string,
    completed: boolean,
  ): Observable<any> {
    return from(this._updateCompletedState(caldavCfg, issueId, completed)).pipe(
      catchError((err) => throwError({ [HANDLED_ERROR_PROP_STR]: 'Caldav: ' + err })),
    );
  }

  private _getXhrProvider(cfg: CaldavCfg) {
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    function xhrProvider(): XMLHttpRequest {
      const xhr = new XMLHttpRequest();
      const oldOpen = xhr.open;

      // override open() method to add headers
      xhr.open = function () {
        // @ts-ignore
        const result = oldOpen.apply(this, arguments);
        // @ts-ignore
        xhr.setRequestHeader('X-Requested-With', 'SuperProductivity');
        xhr.setRequestHeader(
          'Authorization',
          'Basic ' + btoa(cfg.username + ':' + cfg.password),
        );
        return result;
      };
      return xhr;
    }

    return xhrProvider;
  }

  private _handleNetErr(err: any) {
    this._snackService.open({
      type: 'ERROR',
      msg: T.F.CALDAV.S.ERR_NETWORK,
    });
    throw new Error('CALDAV NETWORK ERROR: ' + err);
  }

  private _checkSettings(cfg: CaldavCfg) {
    if (!CaldavClientService._isValidSettings(cfg)) {
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.CALDAV.S.ERR_NOT_CONFIGURED,
      });
      throwHandledError('CalDav: Not enough settings');
    }
  }

  private async _getTasks(
    cfg: CaldavCfg,
    filterOpen: boolean,
    filterCategory: boolean,
  ): Promise<CaldavIssue[]> {
    const cal = await this._getCalendar(cfg);
    const tasks = await CaldavClientService._getAllTodos(cal, filterOpen).catch(
      (err: any) => this._handleNetErr(err),
    );
    return tasks
      .map((t: any) => CaldavClientService._mapTask(t))
      .filter(
        (t: CaldavIssue) =>
          !filterCategory || !cfg.categoryFilter || t.labels.includes(cfg.categoryFilter),
      );
  }

  private async _getTask(cfg: CaldavCfg, uid: string): Promise<CaldavIssue> {
    const cal = await this._getCalendar(cfg);
    const task = await CaldavClientService._findTaskByUid(cal, uid).catch((err: any) =>
      this._handleNetErr(err),
    );

    if (task.length < 1) {
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.CALDAV.S.ISSUE_NOT_FOUND,
      });
      throw new Error('ISSUE NOT FOUND: ' + uid);
    }

    return CaldavClientService._mapTask(task[0]);
  }

  private async _updateCompletedState(cfg: CaldavCfg, uid: string, completed: boolean) {
    const cal = await this._getCalendar(cfg);

    if (cal.readOnly) {
      this._snackService.open({
        type: 'ERROR',
        translateParams: {
          calendarName: cfg.resourceName as string,
        },
        msg: T.F.CALDAV.S.CALENDAR_READ_ONLY,
      });
      throw new Error('CALENDAR READ ONLY: ' + cfg.resourceName);
    }

    const tasks = await CaldavClientService._findTaskByUid(cal, uid).catch((err: any) =>
      this._handleNetErr(err),
    );

    if (tasks.length < 1) {
      this._snackService.open({
        type: 'ERROR',
        translateParams: {
          issueId: uid,
        },
        msg: T.F.CALDAV.S.ISSUE_NOT_FOUND,
      });
      throw new Error('ISSUE NOT FOUND: ' + uid);
    }

    const task = tasks[0];
    const jCal = ICAL.parse(task.data);
    const comp = new ICAL.Component(jCal);
    const todo = comp.getFirstSubcomponent('vtodo');

    const oldCompleted = !!todo.getFirstPropertyValue('completed');

    if (completed === oldCompleted) {
      return;
    }

    const now = ICAL.Time.now();
    if (completed) {
      todo.updatePropertyWithValue('completed', now);
    } else {
      todo.removeProperty('completed');
    }
    todo.updatePropertyWithValue('last-modified', now);
    todo.updatePropertyWithValue('dtstamp', now);

    task.data = ICAL.stringify(jCal);
    await task.update().catch((err: any) => this._handleNetErr(err));
  }
}
