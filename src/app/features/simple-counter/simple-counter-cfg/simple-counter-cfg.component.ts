import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {ConfigFormSection, GlobalConfigSectionKey} from '../../config/global-config.model';
import {ProjectCfgFormKey} from '../../project/project.model';
import {SimpleCounterConfig} from '../simple-counter.model';
import {FormlyFieldConfig, FormlyFormOptions} from '@ngx-formly/core';
import {FormGroup} from '@angular/forms';

@Component({
  selector: 'simple-counter-cfg',
  templateUrl: './simple-counter-cfg.component.html',
  styleUrls: ['./simple-counter-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleCounterCfgComponent {
  @Input() section: ConfigFormSection<SimpleCounterConfig>;
  @Output() save: EventEmitter<{ sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey, config: any }> = new EventEmitter();
  @Input() cfg: SimpleCounterConfig;


  fields: FormlyFieldConfig[];
  form = new FormGroup({});
  options: FormlyFormOptions = {};

  constructor() {
  }

}
