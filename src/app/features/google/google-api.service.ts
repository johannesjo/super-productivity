import {Injectable} from '@angular/core';
import {GOOGLE_DEFAULT_FIELDS_FOR_DRIVE, GOOGLE_DISCOVERY_DOCS, GOOGLE_SCOPES, GOOGLE_SETTINGS} from './google.const';
import * as moment from 'moment-mini';
import {IS_ELECTRON} from '../../app.constants';
import {MultiPartBuilder} from './util/multi-part-builder';
import {HttpClient, HttpHeaders, HttpParams, HttpRequest} from '@angular/common/http';
import {SnackService} from '../../core/snack/snack.service';
import {SnackType} from '../../core/snack/snack.model';
import {ConfigService} from '../config/config.service';
import {GoogleSession} from '../config/config.model';
import {catchError, concatMap, filter, map, shareReplay, switchMap, take} from 'rxjs/operators';
import {combineLatest, EMPTY, from, merge, Observable, of, throwError, timer} from 'rxjs';
import {
  IPC_GOOGLE_AUTH_TOKEN,
  IPC_GOOGLE_AUTH_TOKEN_ERROR,
  IPC_TRIGGER_GOOGLE_AUTH
} from '../../../../electron/ipc-events.const';
import {ElectronService} from 'ngx-electron';
import {BannerService} from '../../core/banner/banner.service';

const EXPIRES_SAFETY_MARGIN = 5 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class GoogleApiService {
  private _session$: Observable<GoogleSession> = this._configService.googleSession$;

  private _onTokenExpire$: Observable<number> = this._session$.pipe(
    switchMap((session) => {
      if (!session.accessToken) {
        return EMPTY;
      }

      const expiresAt = session && session.expiresAt || 0;
      const expiresIn = expiresAt - (moment().valueOf() + EXPIRES_SAFETY_MARGIN);
      return this._isTokenExpired(session)
        ? timer(expiresIn)
        : EMPTY;
    })
  );

  public isLoggedIn: boolean;
  public isLoggedIn$: Observable<boolean> = merge(
    this._session$,
    this._onTokenExpire$,
  ).pipe(
    map((session_: GoogleSession | number) => {
      if (session_ === 0) {
        console.log('GOOGLE API: SESSION EXPIRED, expiresAt', this._session.expiresAt);
        return false;
      }
      const session = session_ as GoogleSession;
      return session && !!session.accessToken;
    }),
    shareReplay(),
  );

  private _isScriptLoaded = false;
  private _isGapiInitialized = false;
  private _gapi: any;

  constructor(
    private readonly _http: HttpClient,
    private readonly _configService: ConfigService,
    private readonly _electronService: ElectronService,
    private readonly _snackService: SnackService,
    private readonly _bannerService: BannerService,
  ) {
    this.isLoggedIn$.subscribe((isLoggedIn) => this.isLoggedIn = isLoggedIn);
  }

  private get _session(): GoogleSession {
    return this._configService.cfg && this._configService.cfg._googleSession;
  }

  login(isSkipSuccessMsg = false): Promise<any> {
    const showSuccessMsg = () => {
      if (!(isSkipSuccessMsg)) {
        this._snackIt('SUCCESS', 'GoogleApi: Login successful');
      }
    };

    if (IS_ELECTRON) {
      const session = this._session;
      if (this.isLoggedIn && !this._isTokenExpired(session)) {
        return new Promise((resolve) => resolve(true));
      }
      console.log('GOOGLE_LOGIN: logging in via refresh token', session.refreshToken);

      this._electronService.ipcRenderer.send(IPC_TRIGGER_GOOGLE_AUTH, session.refreshToken);
      return new Promise((resolve, reject) => {
        this._electronService.ipcRenderer.on(IPC_GOOGLE_AUTH_TOKEN, (ev, data: any) => {
          console.log('GOOGLE_LOGIN: ELECTRON LOGIN RESPONSE', data);
          this._updateSession({
            accessToken: data.access_token,
            expiresAt: data.expiry_date,
            refreshToken: data.refresh_token,
          });
          showSuccessMsg();
          resolve(data);
        });
        this._electronService.ipcRenderer.on(IPC_GOOGLE_AUTH_TOKEN_ERROR, (err, hmm) => {
          console.log('GOOGLE_LOGIN: ELECTRON ERROR', err, hmm);
          reject(err);
        });
      });
    } else {
      return this._initClientLibraryIfNotDone()
        .then((user: any) => {
          // TODO implement offline access
          // const authInstance = this._gapi.auth2.getAuthInstance();
          // authInstance.grantOfflineAccess()
          //   .then((res) => {
          //     this._updateSession({
          //       refreshToken: res.code
          //     });
          //   });
          const successHandler = (res) => {
            this._saveToken(res);
            showSuccessMsg();
          };

          if (user && user.Zi && user.Zi.access_token) {
            successHandler(user);
          } else {
            return this._gapi.auth2.getAuthInstance().currentUser.get().reloadAuthResponse().then(successHandler.bind(this))
              .catch(() => {
                return this._gapi.auth2.getAuthInstance().signIn()
                  .then(successHandler.bind(this));
              });
          }
        });
    }
  }

  // Other interaction

  logout() {
    this._updateSession({
      accessToken: null,
      expiresAt: null,
      // refreshToken: null,
    });

    if (IS_ELECTRON) {
      return new Promise((resolve) => {
        resolve();
      });
    } else {
      if (this._gapi) {
        return this._gapi.auth2.getAuthInstance().signOut();
      } else {
        return new Promise((resolve) => {
          resolve();
        });
      }
    }
  }

  // -----------------
  appendRow(spreadsheetId, row): Observable<any> {
    // @see: https://developers.google.com/sheets/api/reference/rest/
    const range = 'A1:Z99';
    return this._mapHttp({
      method: 'POST',
      url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
        insertDataOption: 'INSERT_ROWS',
        valueInputOption: 'USER_ENTERED'
      },
      data: {values: [row]}
    });
  }

  getSpreadsheetData(spreadsheetId, range): Observable<any> {
    // @see: https://developers.google.com/sheets/api/reference/rest/
    return this._mapHttp({
      method: 'GET',
      url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
      },
    });
  }

  getSpreadsheetHeadingsAndLastRow(spreadsheetId): Observable<{ headings: any, lastRow: any } | Observable<never>> {
    return this.getSpreadsheetData(spreadsheetId, 'A1:Z99')
      .pipe(map((response: any) => {
        const range = response.body || response;

        if (range && range.values && range.values[0]) {
          return {
            headings: range.values[0],
            lastRow: range.values[range.values.length - 1],
          };
        } else {
          this._handleError('No data found');
          return throwError({handledError: 'No data found'});
        }
      }));
  }

  getFileInfo(fileId): Observable<any> {
    if (!fileId) {
      this._snackIt('ERROR', 'GoogleApi: No file id specified');
      throwError({handledError: 'No file id given'});
    }

    return this._mapHttp({
      method: 'GET',
      url: `https://content.googleapis.com/drive/v2/files/${encodeURIComponent(fileId)}`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
        supportsTeamDrives: true,
        fields: GOOGLE_DEFAULT_FIELDS_FOR_DRIVE
      },
    });
  }

  findFile(fileName): Observable<any> {
    if (!fileName) {
      this._snackIt('ERROR', 'GoogleApi: No file name specified');
      return throwError({handledError: 'No file name given'});
    }

    return this._mapHttp({
      method: 'GET',
      url: `https://content.googleapis.com/drive/v2/files`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
        // should be called name officially instead of title
        q: `title='${fileName}' and trashed=false`,
      },
    });
  }

  // NOTE: file will always be returned as text (makes sense)
  loadFile(fileId): Observable<any> {
    if (!fileId) {
      this._snackIt('ERROR', 'GoogleApi: No file id specified');
      throwError({handledError: 'No file id given'});
    }

    const loadFile = this._mapHttp({
      method: 'GET',
      url: `https://content.googleapis.com/drive/v2/files/${encodeURIComponent(fileId)}`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
        supportsTeamDrives: true,
        alt: 'media',
      },
      responseType: 'text',
    });
    const metaData = this.getFileInfo(fileId);

    return combineLatest(metaData, loadFile)
      .pipe(
        map((res) => {
          return {
            backup: res[1],
            meta: res[0],
          };
        }),
      );
  }

  saveFile(content: any, metadata: any = {}): Observable<{}> {
    if ((typeof content !== 'string')) {
      content = JSON.stringify(content);
    }

    let path;
    let method;

    if (metadata.id) {
      path = '/upload/drive/v2/files/' + encodeURIComponent(metadata.id);
      method = 'PUT';
    } else {
      path = '/upload/drive/v2/files/';
      method = 'POST';
    }

    if (!metadata.mimeType) {
      metadata.mimeType = 'application/json';
    }

    const multipart = new MultiPartBuilder()
      .append('application/json', JSON.stringify(metadata))
      .append(metadata.mimeType, content)
      .finish();

    return this._mapHttp({
      method: method,
      url: `https://content.googleapis.com${path}`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
        uploadType: 'multipart',
        supportsTeamDrives: true,
        fields: GOOGLE_DEFAULT_FIELDS_FOR_DRIVE
      },
      headers: {
        'Content-Type': multipart.type
      },
      data: multipart.body
    });
  }

  private _updateSession(sessionData: Partial<GoogleSession>) {
    if (!sessionData.accessToken) {
      console.warn('GoogleApiService: Logged out willingly???');
    }
    this._configService.updateSection('_googleSession', sessionData, true);
  }

  private initClient() {
    return this._gapi.client.init({
      apiKey: GOOGLE_SETTINGS.API_KEY,
      clientId: GOOGLE_SETTINGS.CLIENT_ID,
      discoveryDocs: GOOGLE_DISCOVERY_DOCS,
      scope: GOOGLE_SCOPES
    });
  }

  private _initClientLibraryIfNotDone() {
    const getUser = () => {
      const GoogleAuth = this._gapi.auth2.getAuthInstance();
      this._isGapiInitialized = true;
      // used to determine and handle if user is already signed in
      return GoogleAuth.currentUser.get();
    };

    if (this._isGapiInitialized) {
      return Promise.resolve(getUser());
    }

    return new Promise((resolve, reject) => {
      this._loadJs(() => {
        this._gapi = window['gapi'];
        this._gapi.load('client:auth2', () => {
          this.initClient()
            .then(() => {
              resolve(getUser());
            });
        });
      });
    });
  }

  private _saveToken(res) {
    const accessToken = res.accessToken || res.access_token || res.Zi.access_token;
    const expiresAt = res.expiresAt || res.expires_at || res.Zi.expires_at;

    if (accessToken !== this._session.accessToken || expiresAt !== this._session.expiresAt) {
      this._updateSession({accessToken, expiresAt});
    }
  }

  private _handleUnAuthenticated(err) {
    this.logout();
    this._bannerService.open({
      msg: 'GoogleApi: Failed to authenticate please try logging in again!',
      ico: 'cloud_off',
      id: 'GOOGLE_LOGIN',
      action: {
        label: 'Login',
        fn: () => this.login()
      }
    });
    console.error(err);
  }

  private _handleError(err) {
    let errStr = '';

    if (typeof err === 'string') {
      errStr = err;
    } else if (err && err.error && err.error.error) {
      errStr = err.error.error.message;
    }

    if (errStr) {
      errStr = ': ' + errStr;
    }

    if (err && err.status === 401) {
      this._handleUnAuthenticated(err);
    } else {
      console.warn(err);
      this._snackIt('ERROR', 'GoogleApi Error' + errStr);
    }
  }

  private _snackIt(snackType: SnackType, msg: string) {
    this._snackService.open({
      msg: msg,
      type: snackType,
    });
  }

  private _mapHttp(params_: HttpRequest<string> | any): Observable<any> {
    const loginObs = this._session$.pipe(
      take(1),
      concatMap((session) => {
        const isRefreshNecessary = !session.accessToken || this._isTokenExpired(session);
        console.log('isRefreshNecessary', isRefreshNecessary, !session.accessToken, this._isTokenExpired(session));
        if (isRefreshNecessary) {
          return this.login(true);
        } else {
          return of(true);
        }
      })
    );

    return from(loginObs)
      .pipe(
        concatMap(() => {
          const p: any = {
            ...params_,
            headers: {
              ...(params_.headers || {}),
              'Authorization': `Bearer ${this._session.accessToken}`,
            }
          };

          const bodyArg = p.data ? [p.data] : [];
          const allArgs = [...bodyArg, {
            headers: new HttpHeaders(p.headers),
            params: new HttpParams({fromObject: p.params}),
            reportProgress: false,
            observe: 'response',
            responseType: params_.responseType,
          }];
          const req = new HttpRequest(p.method, p.url, ...allArgs);
          return this._http.request(req);
        }),

        // TODO remove type: 0 @see https://brianflove.com/2018/09/03/angular-http-client-observe-response/
        // tap(res => console.log(res)),
        filter(res => !(res === Object(res) && res.type === 0)),
        map((res: any) => (res && res.body) ? res.body : res),
        catchError((res) => {
          console.warn('GoogleApi Error:', res);
          if (!res) {
            this._handleError('No response body');
          } else if (res && res.status === 401) {
            this._handleUnAuthenticated(res);
          } else if (res && (res.status >= 300)) {
            this._handleError(res);
          } else if (res && (res.status >= 0)) {
            this._handleError('Could not connect to google. Check your internet connection.');
          }
          return throwError({handledError: res});
        }),
      );
  }


  private _loadJs(cb) {
    if (this._isScriptLoaded) {
      cb();
      return;
    }

    const url = 'https://apis.google.com/js/api.js';
    const that = this;
    const script = document.createElement('script');
    script.setAttribute('src', url);
    script.setAttribute('type', 'text/javascript');

    this._isScriptLoaded = false;
    const loadFunction = () => {
      if (that._isScriptLoaded) {
        return;
      }
      that._isScriptLoaded = true;
      if (cb) {
        cb();
      }
    };
    script.onload = loadFunction.bind(that);
    // script['onreadystatechange'] = loadFunction.bind(that);
    document.getElementsByTagName('head')[0].appendChild(script);
  }

  private _isTokenExpired(session): boolean {
    const expiresAt = session && session.expiresAt || 0;
    const expiresIn = expiresAt - (moment().valueOf() + EXPIRES_SAFETY_MARGIN);
    return expiresIn <= 0;
  }
}
