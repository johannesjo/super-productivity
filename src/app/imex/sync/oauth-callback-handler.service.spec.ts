import { TestBed } from '@angular/core/testing';
import { ReplaySubject } from 'rxjs';
import { OAuthCallbackHandlerService } from './oauth-callback-handler.service';
import { PENDING_CAPACITOR_OAUTH_URL } from './pending-capacitor-oauth-url';
import { OAuthCallbackData } from './oauth-callback-handler.service';

describe('OAuthCallbackHandlerService', () => {
  let service: OAuthCallbackHandlerService;
  let pendingUrl$: ReplaySubject<string>;

  beforeEach(() => {
    pendingUrl$ = new ReplaySubject<string>(1);
    TestBed.configureTestingModule({
      providers: [{ provide: PENDING_CAPACITOR_OAUTH_URL, useValue: pendingUrl$ }],
    });
    service = TestBed.inject(OAuthCallbackHandlerService);
  });

  describe('retained cold-start URL', () => {
    // Capacitor hands a launch URL to the first `appUrlOpen` listener only and
    // then discards it, so this service can no longer register its own — it
    // consumes URLs routed from the single listener in main.ts. The URL
    // therefore arrives before the service exists, which is what the
    // ReplaySubject and this test cover. `_setupAppUrlListener` is invoked
    // directly because IS_NATIVE_PLATFORM is false under Karma.
    it('should handle an OAuth callback that arrived before it subscribed', () => {
      pendingUrl$.next('com.super-productivity.app://oauth-callback?code=COLD123');

      const received: OAuthCallbackData[] = [];
      service.authCodeReceived$.subscribe((d) => received.push(d));
      service['_setupAppUrlListener']();

      expect(received.length).toBe(1);
      expect(received[0].code).toBe('COLD123');
    });

    it('should handle the superproductivity:// callback scheme too', () => {
      pendingUrl$.next('superproductivity://oauth-callback?code=COLD456');

      const received: OAuthCallbackData[] = [];
      service.authCodeReceived$.subscribe((d) => received.push(d));
      service['_setupAppUrlListener']();

      expect(received[0].code).toBe('COLD456');
    });

    it('should ignore a routed URL that is not an OAuth callback', () => {
      pendingUrl$.next('superproductivity://create-task/hello');

      let received = false;
      service.authCodeReceived$.subscribe(() => (received = true));
      service['_setupAppUrlListener']();

      expect(received).toBe(false);
    });
  });

  describe('_parseOAuthCallback', () => {
    it('should extract auth code from valid URL', () => {
      const url = 'com.super-productivity.app://oauth-callback?code=ABC123';
      const result = service['_parseOAuthCallback'](url);

      expect(result.code).toBe('ABC123');
      expect(result.provider).toBe('unknown');
      expect(result.error).toBeUndefined();
    });

    it('should extract error from callback URL', () => {
      const url =
        'com.super-productivity.app://oauth-callback?error=access_denied&error_description=User%20denied%20access';
      const result = service['_parseOAuthCallback'](url);

      expect(result.code).toBeUndefined();
      expect(result.error).toBe('access_denied');
      expect(result.error_description).toBe('User denied access');
      expect(result.provider).toBe('unknown');
    });

    it('should handle URL without code or error', () => {
      const url = 'com.super-productivity.app://oauth-callback';
      const result = service['_parseOAuthCallback'](url);

      expect(result.code).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.provider).toBe('unknown');
    });

    it('should handle malformed URL', () => {
      const url = 'not-a-valid-url';
      const result = service['_parseOAuthCallback'](url);

      expect(result.error).toBe('parse_error');
      expect(result.error_description).toBe('Failed to parse OAuth callback URL');
      expect(result.provider).toBe('unknown');
    });

    it('should decode URL-encoded parameters', () => {
      const url =
        'com.super-productivity.app://oauth-callback?error_description=Access%20was%20denied';
      const result = service['_parseOAuthCallback'](url);

      expect(result.error_description).toBe('Access was denied');
    });
  });
});
