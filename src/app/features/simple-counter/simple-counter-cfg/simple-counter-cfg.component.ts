import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { ConfigFormSection, GlobalConfigSectionKey } from '../../config/global-config.model';
import { ProjectCfgFormKey } from '../../project/project.model';
import { SimpleCounterConfig } from '../simple-counter.model';
import { FormlyFormOptions } from '@ngx-formly/core';
import { FormGroup } from '@angular/forms';
import { T } from 'src/app/t.const';
import { SimpleCounterService } from '../simple-counter.service';
import { map } from 'rxjs/operators';
import { Observable, Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';

@Component({
  selector: 'simple-counter-cfg',
  templateUrl: './simple-counter-cfg.component.html',
  styleUrls: ['./simple-counter-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleCounterCfgComponent implements OnDestroy {
  @Input() section?: ConfigFormSection<SimpleCounterConfig>;
  @Input() cfg?: SimpleCounterConfig;
  @Output() save: EventEmitter<{ sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey, config: any }> = new EventEmitter();

  T: typeof T = T;
  form: FormGroup = new FormGroup({});
  options: FormlyFormOptions = {};

  simpleCounterCfg$: Observable<SimpleCounterConfig> = this.simpleCounterService.simpleCountersUpdatedOnCfgChange$.pipe(
    map(items => ({
      counters: items,
    })),
  );

  editModel?: SimpleCounterConfig;

  private _inModelCopy?: SimpleCounterConfig;
  private _subs: Subscription = new Subscription();

  constructor(
    public readonly simpleCounterService: SimpleCounterService,
    private readonly _matDialog: MatDialog,
    // private readonly _cd: ChangeDetectorRef,
  ) {
    this._subs.add(this.simpleCounterCfg$.subscribe(v => {
      this.editModel = v;
      this._inModelCopy = v;
    }));
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  onModelChange(changes: SimpleCounterConfig) {
    // NOTE: it's important to create a new object, otherwise only 1 update happens
    this.editModel = {...changes};
  }

  submit() {
    if (!this._inModelCopy || !this.editModel) {
      throw new Error('Model not ready');
    }

    const oldIds = this._inModelCopy.counters.map(item => item.id);
    const newItemIds = this.editModel.counters.map(item => item.id);

    if (oldIds.find(id => !newItemIds.includes(id))) {
      this._confirmDeletion$().subscribe(isConfirm => {
        if (!this._inModelCopy || !this.editModel) {
          throw new Error('Model not ready');
        }
        if (isConfirm) {
          this.simpleCounterService.updateAll(this.editModel.counters);
        }
      });
    } else {
      this.simpleCounterService.updateAll(this.editModel.counters);
    }
  }

  private _confirmDeletion$(): Observable<boolean> {
    return this._matDialog.open(DialogConfirmComponent, {
      restoreFocus: true,
      data: {
        message: T.F.SIMPLE_COUNTER.D_CONFIRM_REMOVE.MSG,
        okTxt: T.F.SIMPLE_COUNTER.D_CONFIRM_REMOVE.OK,
      }
    }).afterClosed();
  }
}
