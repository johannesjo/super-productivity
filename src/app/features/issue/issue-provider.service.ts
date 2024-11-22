import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IssueProviderKey, IssueProviderTypeMap } from './issue.model';
import { selectIssueProviderById } from './store/issue-provider.selectors';
import { first } from 'rxjs/operators';
import { Store } from '@ngrx/store';

@Injectable({
  providedIn: 'root',
})
export class IssueProviderService {
  private _store = inject(Store);

  getCfgOnce$<T extends IssueProviderKey>(
    issueProviderId: string,
    issueProviderType: T,
  ): Observable<IssueProviderTypeMap<T>> {
    // throw new Error('Test err');

    if (!issueProviderId || !issueProviderType) {
      throw new Error('No issueProviderId or type given');
    }

    return this._store
      .select(
        selectIssueProviderById<IssueProviderTypeMap<T>>(
          issueProviderId,
          issueProviderType,
        ),
      )
      .pipe(first());
  }
}
