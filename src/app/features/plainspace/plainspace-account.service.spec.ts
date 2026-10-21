import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { PlainspaceAccountService } from './plainspace-account.service';
import { LS } from '../../core/persistence/storage-keys.const';
import { IssueProvider } from '../issue/issue.model';
import { IssueProviderActions } from '../issue/store/issue-provider.actions';
import { selectAll as selectAllIssueProviders } from '../issue/store/issue-provider.selectors';
import { PlainspaceConnectionStateService } from '../issue/providers/plainspace/plainspace-connection-state.service';
import { HttpErrorResponse } from '@angular/common/http';

describe('PlainspaceAccountService', () => {
  let service: PlainspaceAccountService;
  let httpMock: HttpTestingController;
  let store: MockStore;
  const ME_URL = 'https://plainspace.org/api/integration/me';
  // Two providers share the old token (same account, two shared projects); a
  // third points at a different account/host and must keep its own token.
  const providers = [
    { id: 'ps-a', issueProviderKey: 'PLAINSPACE', token: 'pat_old' },
    { id: 'ps-b', issueProviderKey: 'PLAINSPACE', token: 'pat_old', isEnabled: false },
    { id: 'ps-other', issueProviderKey: 'PLAINSPACE', token: 'pat_other_account' },
    { id: 'gh', issueProviderKey: 'GITHUB', token: 'pat_old' },
  ] as unknown as IssueProvider[];

  beforeEach(() => {
    localStorage.removeItem(LS.PLAINSPACE_ACCOUNT);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PlainspaceAccountService,
        provideMockStore({
          selectors: [{ selector: selectAllIssueProviders, value: providers }],
        }),
      ],
    });
    service = TestBed.inject(PlainspaceAccountService);
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch');
  });

  afterEach(() => {
    localStorage.removeItem(LS.PLAINSPACE_ACCOUNT);
    httpMock.verify();
  });

  it('starts logged out', () => {
    expect(service.isLoggedIn()).toBe(false);
    expect(service.token()).toBeNull();
  });

  it('connect validates the token via /me, stores it, and persists', async () => {
    const p = service.connect('pat_x');
    const req = httpMock.expectOne(ME_URL);
    expect(req.request.headers.get('Authorization')).toBe('Bearer pat_x');
    req.flush({ email: 'me@example.com', projects: [] });

    expect(await p).toBe('ok');
    expect(service.isLoggedIn()).toBe(true);
    expect(service.token()).toBe('pat_x');
    expect(service.account()?.email).toBe('me@example.com');
    expect(localStorage.getItem(LS.PLAINSPACE_ACCOUNT)).toContain('pat_x');
  });

  it('connect reports invalid-token and stays logged out on a rejected token', async () => {
    const p = service.connect('bad');
    httpMock
      .expectOne(ME_URL)
      .flush({ error: 'nope' }, { status: 401, statusText: 'Unauthorized' });

    expect(await p).toBe('invalid-token');
    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem(LS.PLAINSPACE_ACCOUNT)).toBeNull();
  });

  // #9988: a host we never reached must not be reported as a bad token.
  it('connect reports unreachable when the request never gets an answer', async () => {
    const p = service.connect('pat_x');
    httpMock.expectOne(ME_URL).error(new ProgressEvent('error'), { status: 0 });

    expect(await p).toBe('unreachable');
    expect(service.isLoggedIn()).toBe(false);
  });

  // Regression guard: `me` is null for an empty body, and reading `me.email`
  // threw, leaving the connect dialog stuck on its spinner (#9988 follow-up).
  it('connect reports unreachable (no throw) when the body is empty', async () => {
    const p = service.connect('pat_x');
    httpMock.expectOne(ME_URL).flush(null, { status: 204, statusText: 'No Content' });

    await expectAsync(p).toBeResolvedTo('unreachable');
    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem(LS.PLAINSPACE_ACCOUNT)).toBeNull();
  });

  it('connect reports unreachable on a server error', async () => {
    const p = service.connect('pat_x');
    httpMock
      .expectOne(ME_URL)
      .flush('boom', { status: 500, statusText: 'Internal Server Error' });

    expect(await p).toBe('unreachable');
    expect(service.isLoggedIn()).toBe(false);
  });

  it('logout clears the account and storage', async () => {
    const p = service.connect('pat_x');
    httpMock.expectOne(ME_URL).flush({ email: 'me@example.com', projects: [] });
    await p;

    service.logout();
    expect(service.isLoggedIn()).toBe(false);
    expect(service.token()).toBeNull();
    expect(localStorage.getItem(LS.PLAINSPACE_ACCOUNT)).toBeNull();
  });

  it('restores a saved account on reinitialization, but stays disconnected after logout', async () => {
    const connected = service.connect('pat_x');
    httpMock.expectOne(ME_URL).flush({ email: 'me@example.com', projects: [] });
    await connected;

    const restored = TestBed.runInInjectionContext(() => new PlainspaceAccountService());
    expect(restored.account()).toEqual(service.account());
    expect(restored.isLoggedIn()).toBe(true);

    restored.logout();

    const restarted = TestBed.runInInjectionContext(() => new PlainspaceAccountService());
    expect(restarted.account()).toBeNull();
    expect(restarted.isLoggedIn()).toBe(false);
    expect(restarted.host()).toBeNull();
    expect(restarted.token()).toBeNull();
  });

  it('stays disconnected when a pending reconnect succeeds after logout', async () => {
    const connected = service.connect('pat_initial');
    httpMock.expectOne(ME_URL).flush({ email: 'me@example.com', projects: [] });
    await connected;

    const reconnecting = service.connect('pat_pending');
    const pendingRequest = httpMock.expectOne(ME_URL);
    service.logout();
    pendingRequest.flush({ email: 'me@example.com', projects: [] });

    expect(await reconnecting).toBe('aborted');
    expect(service.account()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem(LS.PLAINSPACE_ACCOUNT)).toBeNull();
    const restarted = TestBed.runInInjectionContext(() => new PlainspaceAccountService());
    expect(restarted.isLoggedIn()).toBe(false);
  });

  it('allows a new connection after logout without an older response overwriting it', async () => {
    const pending = service.connect('pat_old');
    const oldRequest = httpMock.expectOne(ME_URL);
    service.logout();

    const connecting = service.connect('pat_new');
    httpMock.expectOne(ME_URL).flush({ email: 'new@example.com', projects: [] });
    expect(await connecting).toBe('ok');
    oldRequest.flush({ email: 'old@example.com', projects: [] });

    expect(await pending).toBe('aborted');
    expect(service.token()).toBe('pat_new');
    expect(service.account()?.email).toBe('new@example.com');
    const restarted = TestBed.runInInjectionContext(() => new PlainspaceAccountService());
    expect(restarted.account()).toEqual(service.account());
  });

  // #8616: one PAT per account, minting a new one revokes the old one.
  describe('scoped token replacement on reconnect', () => {
    const connect = async (
      token: string,
      email = 'me@example.com',
      replacedToken?: string | null,
    ): Promise<void> => {
      const p = service.connect(token, undefined, replacedToken);
      httpMock.expectOne(ME_URL).flush({ email, projects: [] });
      expect(await p).toBe('ok');
    };
    const tokenUpdate = (id: string, token: string): unknown =>
      IssueProviderActions.updateIssueProvider({
        issueProvider: { id, changes: { token } },
      });

    it('writes nothing on a first connect', async () => {
      await connect('pat_old');
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('writes the new token only to Plainspace providers that held the old one', async () => {
      await connect('pat_old');
      await connect('pat_new');
      expect(store.dispatch).toHaveBeenCalledTimes(2);
      expect(store.dispatch).toHaveBeenCalledWith(
        tokenUpdate('ps-a', 'pat_new') as never,
      );
      expect(store.dispatch).toHaveBeenCalledWith(
        tokenUpdate('ps-b', 'pat_new') as never,
      );
    });

    it('leaves providers alone when the new token is for a different account', async () => {
      await connect('pat_old');
      await connect('pat_new', 'someone-else@example.com');
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('leaves providers alone when the same email connects on another host', async () => {
      await connect('pat_old');
      const p = service.connect('pat_self_hosted', 'https://self.example');
      httpMock
        .expectOne('https://self.example/api/integration/me')
        .flush({ email: 'me@example.com', projects: [] });
      expect(await p).toBe('ok');
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('replaces an explicitly given token (provider reconnect) and clears its state', async () => {
      const state = TestBed.inject(PlainspaceConnectionStateService);
      state.reportError('ps-other', new HttpErrorResponse({ status: 401 }));
      await connect('pat_fresh', 'other@example.com', 'pat_other_account');
      expect(store.dispatch).toHaveBeenCalledOnceWith(
        tokenUpdate('ps-other', 'pat_fresh') as never,
      );
      expect(state.rejectedProviderIds().has('ps-other')).toBe(false);
    });

    it('writes nothing when reconnecting with the same token', async () => {
      await connect('pat_old');
      await connect('pat_old');
      expect(store.dispatch).not.toHaveBeenCalled();
    });
  });
});
