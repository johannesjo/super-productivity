import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { ConfigFormSection, SyncConfig } from '../../../features/config/global-config.model';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { T } from 'src/app/t.const';

@Component({
  selector: 'sync-cfg',
  templateUrl: './sync-cfg.component.html',
  styleUrls: ['./sync-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SyncCfgComponent implements OnInit, OnDestroy {
  @Input() section?: ConfigFormSection<SyncConfig>;
  @Input() cfg?: SyncConfig;

  T: typeof T = T;

  @ViewChild('formRef', {static: true}) formRef?: FormGroup;

  @Output() save: EventEmitter<any> = new EventEmitter();

  private _subs: Subscription = new Subscription();

  constructor() {
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  submit() {
    const f = this.formRef;
    if (!f) {
      throw new Error();
    }

    if (f.valid) {
      this.save.emit({
        sectionKey: 'sync',
        config: this.cfg,
      });
    } else {
      Object.keys(f.controls)
        .forEach(fieldName =>
          f.controls[fieldName].markAsDirty()
        );
    }
  }
}
