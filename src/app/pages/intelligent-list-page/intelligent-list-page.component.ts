import {ChangeDetectionStrategy, Component} from '@angular/core';
import {IntelligentListService} from '../../features/intelligent-list/intelligent-list.service';

@Component({
  selector: 'intelligent-list-page',
  templateUrl: './intelligent-list-page.component.html',
  styleUrls: ['./intelligent-list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntelligentListPageComponent {
  constructor(public intelligentListService: IntelligentListService) {
  }

}
