import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FieldType } from '@ngx-formly/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'formly-link-widget',
  templateUrl: './formly-link-widget.component.html',
  styleUrls: ['./formly-link-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
})
export class FormlyLinkWidgetComponent extends FieldType {
  constructor() {
    super();
  }
}
