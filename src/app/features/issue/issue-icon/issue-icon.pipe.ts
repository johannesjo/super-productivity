import { Pipe, PipeTransform } from '@angular/core';
import { IssueProviderKey } from '../issue.model';
import { issueProviderIconMap } from '../issue.const';

@Pipe({
  name: 'issueIcon',
})
export class IssueIconPipe implements PipeTransform {
  // NOTE: null is only accepted to make view more performant
  transform(value: IssueProviderKey | null, args?: any): any {
    return issueProviderIconMap[value as IssueProviderKey];
  }
}
