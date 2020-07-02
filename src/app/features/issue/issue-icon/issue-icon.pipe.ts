import { Pipe, PipeTransform } from '@angular/core';
import { IssueProviderKey } from '../issue.model';
import { issueProviderIconMap } from '../issue.const';

@Pipe({
  name: 'issueIcon'
})
export class IssueIconPipe implements PipeTransform {
  transform(value: IssueProviderKey, args?: any): any {
    return issueProviderIconMap[value];
  }
}
