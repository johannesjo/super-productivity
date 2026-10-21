import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { PlainspaceConnectionStateService } from './plainspace-connection-state.service';

describe('PlainspaceConnectionStateService', () => {
  let state: PlainspaceConnectionStateService;
  const httpError = (status: number): HttpErrorResponse =>
    new HttpErrorResponse({ status });

  beforeEach(() => {
    state = TestBed.inject(PlainspaceConnectionStateService);
  });

  it('marks a provider as rejected on 401', () => {
    state.reportError('p1', httpError(401));
    expect(state.rejectedProviderIds().has('p1')).toBe(true);
  });

  // A 403 comes from a proxy or firewall, not from Plainspace judging the token.
  it('ignores offline, proxy (403), server and non-HTTP errors', () => {
    state.reportError('p1', httpError(0));
    state.reportError('p1', httpError(403));
    state.reportError('p1', httpError(500));
    state.reportError('p1', new Error('boom'));
    expect(state.rejectedProviderIds().size).toBe(0);
  });

  it('keeps a rejected provider marked while offline, clears it on success', () => {
    state.reportError('p1', httpError(401));
    state.reportError('p1', httpError(0));
    expect(state.rejectedProviderIds().has('p1')).toBe(true);
    state.reportSuccess('p1');
    expect(state.rejectedProviderIds().has('p1')).toBe(false);
  });

  it('clears only the given providers', () => {
    state.reportError('p1', httpError(401));
    state.reportError('p2', httpError(401));
    state.clear(['p1']);
    expect([...state.rejectedProviderIds()]).toEqual(['p2']);
  });
});
