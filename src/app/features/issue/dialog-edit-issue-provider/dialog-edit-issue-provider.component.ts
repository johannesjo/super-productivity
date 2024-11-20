import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { UiModule } from '../../../ui/ui.module';
import { T } from '../../../t.const';
import { IssueIntegrationCfg, IssueProvider, IssueProviderKey } from '../issue.model';
import { IssueModule } from '../issue.module';
import {
  DEFAULT_ISSUE_PROVIDER_CFGS,
  ISSUE_PROVIDER_FORM_CFGS_MAP,
  ISSUE_PROVIDER_HUMANIZED,
} from '../issue.const';
import { FormGroup } from '@angular/forms';
import { ConfigFormSection } from '../../config/global-config.model';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { IssueProviderActions } from '../store/issue-provider.actions';

@Component({
  selector: 'dialog-edit-issue-provider',
  standalone: true,
  imports: [UiModule, IssueModule],
  templateUrl: './dialog-edit-issue-provider.component.html',
  styleUrl: './dialog-edit-issue-provider.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogEditIssueProviderComponent implements OnInit {
  T: typeof T = T;
  readonly d = inject<{
    issueProvider?: IssueProvider;
    issueProviderKey?: IssueProviderKey;
  }>(MAT_DIALOG_DATA);
  form = new FormGroup({});

  issueProviderKey: IssueProviderKey = (this.d.issueProvider?.issueProviderKey ||
    this.d.issueProviderKey) as IssueProviderKey;
  issueProvider?: IssueProvider = this.d.issueProvider;
  isEdit: boolean = !!this.issueProvider;

  model: Partial<IssueProvider> = this.isEdit
    ? this.issueProvider
    : DEFAULT_ISSUE_PROVIDER_CFGS[this.issueProviderKey];
  formCfg: ConfigFormSection<IssueIntegrationCfg> =
    ISSUE_PROVIDER_FORM_CFGS_MAP[this.issueProviderKey];
  fields = this.formCfg?.items;

  title: string = ISSUE_PROVIDER_HUMANIZED[this.issueProviderKey];

  private _matDialogRef: MatDialogRef<DialogEditIssueProviderComponent> =
    inject(MatDialogRef);

  private _matDialog = inject(MatDialog);
  private _store = inject(Store);

  submit(): void {
    if (this.form.valid) {
      this._matDialogRef.close(this.model);
    }
  }

  constructor() {
    console.log(this);
  }

  ngOnInit(): void {
    console.log(this);
  }

  cancel(): void {
    this._matDialogRef.close();
  }

  remove(): void {
    this._matDialog
      .open(DialogConfirmComponent, {
        restoreFocus: true,
        data: {
          cancelTxt: T.G.CANCEL,
          okTxt: T.G.DELETE,
          message:
            'Are you sure you want to delete this issue provider? Deleting it means that all previously imported issue tasks will loose their reference.',
          // message: T.F.TIME_TRACKING.D_IDLE.SIMPLE_COUNTER_CONFIRM_TXT,
          // translateParams: {
          //   nr: 2,
          // },
        },
      })
      .afterClosed()
      .subscribe((isConfirm: boolean) => {
        if (isConfirm) {
          this._store.dispatch(
            IssueProviderActions.deleteIssueProvider({
              id: this.issueProvider!.id,
            }),
          );
        }
      });
  }
}
