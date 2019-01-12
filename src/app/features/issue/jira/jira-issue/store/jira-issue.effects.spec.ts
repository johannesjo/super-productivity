import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';

import { JiraIssueEffects } from './jira-issue.effects';

describe('JiraIssueEffects', () => {
  let actions$: Observable<any>;
  let effects: JiraIssueEffects;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        JiraIssueEffects,
        provideMockActions(() => actions$)
      ]
    });

    effects = TestBed.get(JiraIssueEffects);
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });
});
