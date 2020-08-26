import { Injectable } from '@angular/core';
import { GOOGLE_DEFAULT_FIELDS_FOR_DRIVE, GOOGLE_DISCOVERY_DOCS, GOOGLE_SCOPES, GOOGLE_SETTINGS } from './google.const';
import * as moment from 'moment';
import { HANDLED_ERROR_PROP_STR, IS_ELECTRON } from '../../app.constants';
import { MultiPartBuilder } from './util/multi-part-builder';
import { HttpClient, HttpHeaders, HttpParams, HttpRequest } from '@angular/common/http';
import { SnackService } from '../../core/snack/snack.service';
import { SnackType } from '../../core/snack/snack.model';
import { catchError, concatMap, filter, map, shareReplay, switchMap, take } from 'rxjs/operators';
import { BehaviorSubject, EMPTY, from, merge, Observable, of, throwError, timer } from 'rxjs';
import { IPC } from '../../../../electron/ipc-events.const';
import { BannerService } from '../../core/banner/banner.service';
import { BannerId } from '../../core/banner/banner.model';
import { T } from '../../t.const';
import { ElectronService } from '../../core/electron/electron.service';
import { isOnline } from '../../util/is-online';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { androidInterface } from '../../core/android/android-interface';
import { getGoogleSession, GoogleSession, updateGoogleSession } from './google-session';
import { ipcRenderer } from 'electron';

const EXPIRES_SAFETY_MARGIN = 5 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class GoogleApiService {
  public isLoggedIn: boolean = false;
  private _session$: BehaviorSubject<GoogleSession> = new BehaviorSubject(getGoogleSession());
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
  public isLoggedIn$: Observable<boolean> = merge(
    this._session$,
    this._onTokenExpire$,
  ).pipe(
    map((sessionIN: GoogleSession | number) => {
      if (sessionIN === 0) {
        console.log('GOOGLE API: SESSION EXPIRED, expiresAt', this._session.expiresAt);
        return false;
      }
      const session = sessionIN as GoogleSession;
      return session && !!session.accessToken;
    }),
    shareReplay(1),
  );

  private _isScriptLoaded: boolean = false;
  private _isGapiInitialized: boolean = false;
  private _gapi: any;

  constructor(
    private readonly _http: HttpClient,
    private readonly _electronService: ElectronService,
    private readonly _snackService: SnackService,
    private readonly _bannerService: BannerService,
  ) {
    this.isLoggedIn$.subscribe((isLoggedIn) => this.isLoggedIn = isLoggedIn);
  }

  private get _session(): GoogleSession {
    return getGoogleSession();
  }

  login(isSkipSuccessMsg: boolean = false): Promise<any> {
    const showSuccessMsg = () => {
      if (!(isSkipSuccessMsg)) {
        this._snackIt('SUCCESS', T.F.GOOGLE.S_API.SUCCESS_LOGIN);
      }
    };

    if (IS_ELECTRON) {
      const session = this._session;
      if (this.isLoggedIn && !this._isTokenExpired(session)) {
        return new Promise((resolve) => resolve(true));
      }

      (this._electronService.ipcRenderer as typeof ipcRenderer).send(IPC.TRIGGER_GOOGLE_AUTH, session.refreshToken);
      return new Promise((resolve, reject) => {
        (this._electronService.ipcRenderer as typeof ipcRenderer).on(IPC.GOOGLE_AUTH_TOKEN, (ev, data: any) => {
          this._updateSession({
            accessToken: data.access_token,
            expiresAt: data.expiry_date,
            refreshToken: data.refresh_token,
          });
          showSuccessMsg();
          resolve(data);
        });
        (this._electronService.ipcRenderer as typeof ipcRenderer).on(IPC.GOOGLE_AUTH_TOKEN_ERROR, (err, hmm) => {
          reject(err);
        });
      });
    } else if (IS_ANDROID_WEB_VIEW) {
      return androidInterface.getGoogleToken().then((token) => {
        console.log(token);
        this._saveToken({
          access_token: token,
          // TODO check if we can get a real value if existant
          expires_at: Date.now() + (1000 * 60 * 30),
        });
        showSuccessMsg();
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
          const successHandler = (res: any) => {
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

  getFileInfo$(fileId: string | null): Observable<any> {
    if (!fileId) {
      this._snackIt('ERROR', T.F.GOOGLE.S_API.ERR_NO_FILE_ID);
      return throwError({[HANDLED_ERROR_PROP_STR]: 'No file id given'});
    }

    return this._mapHttp$({
      method: 'GET',
      url: `https://content.googleapis.com/drive/v2/files/${encodeURIComponent(fileId)}`,
      params: {
        key: GOOGLE_SETTINGS.API_KEY,
        supportsTeamDrives: true,
        fields: GOOGLE_DEFAULT_FIELDS_FOR_DRIVE
      },
    });
  }

  findFile$(fileName: string): Observable<any> {
    if (!fileName) {
      this._snackIt('ERROR', T.F.GOOGLE.S_API.ERR_NO_FILE_NAME);
      return throwError({[HANDLED_ERROR_PROP_STR]: 'No file name given'});
    }

    return this._mapHttp$({
      method: 'GET',
      url: `https://content.googleapis.com/drive/v2/files`,
      params: {
        key: GOOGLE_SETTINGS.API_KEY,
        // should be called name officially instead of title
        q: `title='${fileName}' and trashed=false`,
      },
    });
  }

  // NOTE: file will always be returned as text (makes sense)
  loadFile$(fileId: string | null): Observable<any> {
    if (!fileId) {
      this._snackIt('ERROR', T.F.GOOGLE.S_API.ERR_NO_FILE_ID);
      return throwError({[HANDLED_ERROR_PROP_STR]: 'No file id given'});
    }

    return this.getFileInfo$(fileId).pipe(
      concatMap((meta) => this._mapHttp$({
        method: 'GET',
        // workaround for: https://issuetracker.google.com/issues/149891169
        url: `https://www.googleapis.com/drive/v2/files/${encodeURIComponent(fileId)}`,
        params: {
          key: GOOGLE_SETTINGS.API_KEY,
          supportsTeamDrives: true,
          alt: 'media',
        },
        responseType: 'text',
      }).pipe(
        map((res) => {
          return {
            backup: res,
            meta,
          };
        }),
      )),
    );
  }

  saveFile$(content: any, metadata: any = {}): Observable<{}> {
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

    const multipart: any = (new (MultiPartBuilder as any)())
      .append('application/json', JSON.stringify(metadata))
      .append(metadata.mimeType, content)
      .finish();

    return this._mapHttp$({
      method,
      url: `https://content.googleapis.com${path}`,
      params: {
        key: GOOGLE_SETTINGS.API_KEY,
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
    updateGoogleSession(sessionData);
    this._session$.next(getGoogleSession());
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
    } else if (!isOnline()) {
      this._snackService.open({
        type: 'ERROR',
        msg: T.G.NO_CON,
        ico: 'cloud_off'
      });
      return Promise.reject('No internet');
    }

    return new Promise((resolve, reject) => {
      return this._loadJs().then(() => {
        // tslint:disable-next-line
        this._gapi = (window as any)['gapi'];
        this._gapi.load('client:auth2', () => {
          this.initClient()
            .then(() => {
              resolve(getUser());
            })
            .catch(reject);
        });
      }).catch(reject);
    });
  }

  private _saveToken(res: {
    [key: string]: any;
    accessToken?: string;
    access_token?: string;
    expires_at?: string | number;
    expiresAt?: string | number;
    Zi?: {
      access_token?: string;
      expires_at?: string | number;
    }
  }) {
    const r: any = res;
    const accessToken = r.accessToken || r.access_token || r.Zi?.access_token;
    const expiresAt = +(r.expiresAt || r.expires_at || r.Zi?.expires_at);

    if (!accessToken) {
      console.log(res);
      throw new Error('No access token in response');
    }

    if (accessToken !== this._session.accessToken || expiresAt !== this._session.expiresAt) {
      this._updateSession({accessToken, expiresAt});
    }
  }

  private _handleUnAuthenticated(err: any) {
    this.logout();
    this._bannerService.open({
      msg: T.F.GOOGLE.BANNER.AUTH_FAIL,
      ico: 'cloud_off',
      id: BannerId.GoogleLogin,
      action: {
        label: T.G.LOGIN,
        fn: () => this.login()
      }
    });
    console.error(err);
  }

  private _handleError(err: any) {
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
      this._snackIt('ERROR', T.F.GOOGLE.S_API.ERR, {errStr});
    }
  }

  private _snackIt(type: SnackType, msg: string, translateParams: any = null) {
    this._snackService.open({
      msg,
      type,
      translateParams,
    });
  }

  private _mapHttp$(paramsIN: HttpRequest<string> | any): Observable<any> {
    const loginObs = this._session$.pipe(
      take(1),
      concatMap((session) => {
        const isRefreshNecessary = !session.accessToken || this._isTokenExpired(session);
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
            ...paramsIN,
            headers: {
              ...(paramsIN.headers || {}),
              Authorization: `Bearer ${this._session.accessToken}`,
            }
          };

          const bodyArg = p.data ? [p.data] : [];
          const allArgs = [...bodyArg, {
            headers: new HttpHeaders(p.headers),
            params: new HttpParams({
              fromObject: {
                ...p.params,
                // needed because negative globs are not working as they should
                // @see https://github.com/angular/angular/issues/21191
                'ngsw-bypass': true
              }
            }),
            reportProgress: false,
            observe: 'response',
            responseType: paramsIN.responseType,
          }];
          const req = new HttpRequest(p.method, p.url, ...allArgs);
          return this._http.request(req);
        }),

        // TODO remove type: 0 @see https://brianflove.com/2018/09/03/angular-http-client-observe-response/
        // tap(res => console.log(res)),
        filter(res => !(res === Object(res) && res.type === 0)),
        map((res: any) => (res && res.body) ? res.body : res),
        catchError((res) => {
          if (!isOnline()) {
            this._snackService.open({
              type: 'ERROR',
              msg: T.G.NO_CON,
              ico: 'cloud_off'
            });
          } else if (!res) {
            this._handleError('No response body');
          } else if (res && res.status === 401) {
            this._handleUnAuthenticated(res);
          } else if (res && (res.status >= 300)) {
            this._handleError(res);
          } else if (res && (res.status >= 0)) {
            this._handleError('Could not connect to google. Check your internet connection.');
          }
          return throwError({[HANDLED_ERROR_PROP_STR]: res});
        }),
      );
  }

  private _loadJs(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this._isScriptLoaded) {
        resolve();
      }

      const loadFunction = () => {
        if (this._isScriptLoaded) {
          resolve();
        }
        this._isScriptLoaded = true;
        resolve();
      };

      const errorFunction = (e: unknown) => {
        console.log('ERROR FB');
        reject(e);
      };

      const url = 'https://apis.google.com/js/api.js?ngsw-bypass=true';
      const script = document.createElement('script');
      script.setAttribute('type', 'text/javascript');
      // NOTE: don't!
      // script.setAttribute('crossorigin', 'anonymous');
      script.setAttribute('src', url);

      this._isScriptLoaded = false;

      script.onload = loadFunction.bind(this);
      script.onerror = errorFunction.bind(this);
      // script['onreadystatechange'] = loadFunction.bind(this);
      document.getElementsByTagName('head')[0].appendChild(script);
    });

  }

  private _isTokenExpired(session: any): boolean {
    const expiresAt = session && session.expiresAt || 0;
    const expiresIn = expiresAt - (moment().valueOf() + EXPIRES_SAFETY_MARGIN);
    return expiresIn <= 0;
  }
}
