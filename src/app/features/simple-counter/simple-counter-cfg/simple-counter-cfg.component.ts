import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {ConfigFormSection, GlobalConfigSectionKey} from '../../config/global-config.model';
import {ProjectCfgFormKey} from '../../project/project.model';
import {SimpleCounterConfig} from '../simple-counter.model';
import {FormlyFieldConfig, FormlyFormOptions} from '@ngx-formly/core';
import {FormGroup} from '@angular/forms';
import {T} from 'src/app/t.const';
import {SimpleCounterService} from '../simple-counter.service';
import {map} from 'rxjs/operators';
import {Observable} from 'rxjs';

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


  T = T;
  fields: FormlyFieldConfig[];
  form = new FormGroup({});
  options: FormlyFormOptions = {};
  simpleCounterCfg$: Observable<SimpleCounterConfig> = this.simpleCounterService.simpleCounters$.pipe(
    map(items => ({
      counters: items,
    }))
  );

  constructor(
    public readonly simpleCounterService: SimpleCounterService,
  ) {
  }

  onModelChange(changes) {
    console.log(changes);
  }

}
