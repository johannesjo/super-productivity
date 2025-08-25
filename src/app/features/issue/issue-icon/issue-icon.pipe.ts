import { Pipe, PipeTransform } from '@angular/core';
import { IssueProviderKey } from '../issue.model';
import { ISSUE_PROVIDER_ICON_MAP } from '../issue.const';

@Pipe({ standalone: true, name: 'issueIcon' })
export class IssueIconPipe implements PipeTransform {
  // NOTE: null is only accepted to make view more performant
  transform(value?: IssueProviderKey, args?: any): any {
    return ISSUE_PROVIDER_ICON_MAP[value as IssueProviderKey];
  }
}
