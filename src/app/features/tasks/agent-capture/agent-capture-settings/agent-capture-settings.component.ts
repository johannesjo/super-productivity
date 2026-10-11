import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { ConfigOption, FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { FieldType } from '@ngx-formly/material';
import { TranslatePipe } from '@ngx-translate/core';
import type { SuperSyncCaptureGrantInfo } from '@sp/sync-providers/super-sync';
import { firstValueFrom } from 'rxjs';
import { Log } from '../../../../core/log';
import { ShareService } from '../../../../core/share/share.service';
import { SnackService } from '../../../../core/snack/snack.service';
import { T } from '../../../../t.const';
import { DialogConfirmComponent } from '../../../../ui/dialog-confirm/dialog-confirm.component';
import { LocaleDatePipe } from '../../../../ui/pipes/locale-date.pipe';
import { AgentCaptureService } from '../agent-capture.service';

/**
 * SuperSync settings block for agent task capture: switch, MCP URL, tokens
 * and connected assistants. Keyless: it acts on the server and the synced
 * `sync.captureKey` through AgentCaptureService, never on the form model.
 */
@Component({
  selector: 'agent-capture-settings',
  templateUrl: './agent-capture-settings.component.html',
  styleUrl: './agent-capture-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormlyModule,
    MatButton,
    MatFormField,
    MatLabel,
    MatIcon,
    MatInput,
    TranslatePipe,
    LocaleDatePipe,
  ],
})
export class AgentCaptureSettingsComponent
  extends FieldType<FormlyFieldConfig>
  implements OnInit
{
  readonly T = T;
  private readonly _capture = inject(AgentCaptureService);
  private readonly _matDialog = inject(MatDialog);
  private readonly _snackService = inject(SnackService);
  private readonly _shareService = inject(ShareService);

  readonly isAvailable = this._capture.isSuperSyncActive();
  readonly isEnabled = this._capture.isEnabled;
  readonly isBusy = signal(false);
  readonly mcpUrl = signal<string | null>(null);
  readonly grants = signal<SuperSyncCaptureGrantInfo[]>([]);
  readonly clientName = signal('');
  /** Shown once, held only by this component; never logged. */
  readonly newToken = signal<string | null>(null);
  readonly setupCommand = computed(
    () =>
      `claude mcp add --transport http sp ${this.mcpUrl()} ` +
      '--header "Authorization: Bearer $SP_CAPTURE_TOKEN"',
  );

  ngOnInit(): void {
    if (this.isAvailable && this.isEnabled()) void this._run(() => this._load());
  }

  turnOn(): Promise<void> {
    return this._run(async () => {
      await this._capture.switchOn();
      await this._load();
    });
  }

  turnOff(): Promise<void> {
    return this._run(async () => {
      const grants = await this._capture.listGrants();
      const count = grants.reduce((sum, grant) => sum + grant.pendingCount, 0);
      if (!(await this._confirm(T.F.SYNC.FORM.SUPER_SYNC.CAPTURE_OFF_CONFIRM, { count })))
        return;
      await this._capture.switchOff();
      this.grants.set([]);
      this.newToken.set(null);
    });
  }

  createToken(): Promise<void> {
    const clientName = this.clientName().trim();
    if (!clientName) return Promise.resolve();
    return this._run(async () => {
      const { token, grant } = await this._capture.createToken(clientName);
      this.newToken.set(token);
      this.clientName.set('');
      this.grants.update((grants) => [...grants, grant]);
    });
  }

  revoke(grant: SuperSyncCaptureGrantInfo, isDiscard: boolean): Promise<void> {
    const msg = isDiscard
      ? T.F.SYNC.FORM.SUPER_SYNC.CAPTURE_REVOKE_DISCARD_CONFIRM
      : T.F.SYNC.FORM.SUPER_SYNC.CAPTURE_REVOKE_CONFIRM;
    return this._run(async () => {
      const params = { name: grant.clientName, count: grant.pendingCount };
      if (!(await this._confirm(msg, params))) return;
      await this._capture.revokeGrant(grant.id, isDiscard);
      this.grants.update((grants) => grants.filter((g) => g.id !== grant.id));
    });
  }

  async copy(text: string, label: string): Promise<void> {
    const result = await this._shareService.copyToClipboard(text, label);
    if (!result.success) {
      this._snackService.open(T.F.SYNC.FORM.SUPER_SYNC.CAPTURE_S_COPY_FAILED);
    }
  }

  private async _load(): Promise<void> {
    this.mcpUrl.set(await this._capture.getMcpUrl());
    this.grants.set(await this._capture.listGrants());
  }

  private _confirm(message: string, translateParams: object): Promise<boolean> {
    const ref = this._matDialog.open(DialogConfirmComponent, {
      restoreFocus: true,
      data: { message, translateParams },
    });
    return firstValueFrom(ref.afterClosed());
  }

  /** One request at a time; failures surface as a snack, logged without content. */
  private async _run(fn: () => Promise<void>): Promise<void> {
    if (this.isBusy()) return;
    this.isBusy.set(true);
    try {
      await fn();
    } catch (e) {
      Log.err('Agent capture settings action failed', {
        name: e instanceof Error ? e.name : typeof e,
      });
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.SYNC.FORM.SUPER_SYNC.CAPTURE_S_ERROR,
      });
    } finally {
      this.isBusy.set(false);
    }
  }
}

/** Formly config registering this block; provided once in main.ts. */
export const AGENT_CAPTURE_SETTINGS_FORMLY_CONFIG: ConfigOption = {
  types: [
    {
      name: 'agent-capture-settings',
      component: AgentCaptureSettingsComponent,
      wrappers: [],
    },
  ],
};
