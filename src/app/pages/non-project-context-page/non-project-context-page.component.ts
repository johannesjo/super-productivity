import {ChangeDetectionStrategy, Component} from '@angular/core';

@Component({
  selector: 'non-project-context-page',
  templateUrl: './non-project-context-page.component.html',
  styleUrls: ['./non-project-context-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonProjectContextPageComponent {
  constructor() {
  }
}
