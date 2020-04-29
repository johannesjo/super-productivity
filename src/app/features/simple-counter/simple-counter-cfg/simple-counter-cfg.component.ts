import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, Output} from '@angular/core';
import {ConfigFormSection, GlobalConfigSectionKey} from '../../config/global-config.model';
import {ProjectCfgFormKey} from '../../project/project.model';
import {SimpleCounterCfgFields, SimpleCounterConfig} from '../simple-counter.model';
import {FormlyFormOptions} from '@ngx-formly/core';
import {FormGroup} from '@angular/forms';
import {T} from 'src/app/t.const';
import {SimpleCounterService} from '../simple-counter.service';
import {distinctUntilChanged, map, tap} from 'rxjs/operators';
import {Observable, Subscription} from 'rxjs';
import {MatDialog} from '@angular/material/dialog';
import {DialogConfirmComponent} from '../../../ui/dialog-confirm/dialog-confirm.component';

const FIELDS_TO_COMPARE: (keyof SimpleCounterCfgFields)[] = [
  'id', 'title', 'isEnabled', 'icon', 'iconOn', 'type', 'isStartWhenTrackingTime', 'isPauseWhenTimeTrackingIsPaused'
];

const isEqualSimpleCounterCfg = (a, b): boolean => {
  if ((Array.isArray(a) && Array.isArray(b))) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) {
        // tslint:disable-next-line:prefer-for-of
        for (let j = 0; j < FIELDS_TO_COMPARE.length; j++) {
          const field = FIELDS_TO_COMPARE[j];
          if (a[field] !== b[field]) {
            return false;
          }
        }
      }
    }
    return true;
  } else {
    return a === b;
  }
};

@Component({
  selector: 'simple-counter-cfg',
  templateUrl: './simple-counter-cfg.component.html',
  styleUrls: ['./simple-counter-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleCounterCfgComponent implements OnDestroy {
  @Input() section: ConfigFormSection<SimpleCounterConfig>;
  @Output() save: EventEmitter<{ sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey, config: any }> = new EventEmitter();
  @Input() cfg: SimpleCounterConfig;


  T = T;
  form = new FormGroup({});
  options: FormlyFormOptions = {};


  simpleCounterCfg$: Observable<SimpleCounterConfig> = this.simpleCounterService.simpleCounters$.pipe(
    distinctUntilChanged(isEqualSimpleCounterCfg),
    map(items => ({
      counters: items,
    })),
    tap((v) => console.log('INP', v)),
  );

  editModel: SimpleCounterConfig;

  private _inModelCopy: SimpleCounterConfig;
  private _subs = new Subscription();

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
    const oldIds = this._inModelCopy.counters.map(item => item.id);
    const newItemIds = this.editModel.counters.map(item => item.id);

    if (oldIds.find(id => !newItemIds.includes(id))) {
      this._confirmDeletion$().subscribe(isConfirm => {
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
