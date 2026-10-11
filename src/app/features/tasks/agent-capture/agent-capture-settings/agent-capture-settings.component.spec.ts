import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { FormlyModule } from '@ngx-formly/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { SuperSyncCaptureGrantInfo } from '@sp/sync-providers/super-sync';
import { of } from 'rxjs';
import { DateTimeFormatService } from '../../../../core/date-time-format/date-time-format.service';
import { ShareService } from '../../../../core/share/share.service';
import { SnackService } from '../../../../core/snack/snack.service';
import { AgentCaptureService } from '../agent-capture.service';
import { AgentCaptureSettingsComponent } from './agent-capture-settings.component';

describe('AgentCaptureSettingsComponent', () => {
  const GRANT: SuperSyncCaptureGrantInfo = {
    id: 'g1',
    clientName: 'Claude Code',
    createdAt: 1,
    lastUsedAt: null,
    // Local midday: the same calendar day in every test timezone.
    expiresAt: new Date(2027, 9, 11, 12).getTime(),
    pendingCount: 2,
  };
  let fixture: ComponentFixture<AgentCaptureSettingsComponent>;
  let component: AgentCaptureSettingsComponent;
  let capture: jasmine.SpyObj<AgentCaptureService> & {
    isEnabled: ReturnType<typeof signal<boolean>>;
  };
  let isConfirmed: boolean;
  let snack: jasmine.SpyObj<SnackService>;

  const setup = (isAvailable = true): void => {
    capture.isSuperSyncActive.and.returnValue(isAvailable);
    fixture = TestBed.createComponent(AgentCaptureSettingsComponent);
    component = fixture.componentInstance;
    // Keyless block: no form control, only the field object.
    component.field = { props: {}, templateOptions: {} } as never;
  };
  const render = async (): Promise<void> => {
    fixture.detectChanges();
    // Lets ngOnInit's chained loads settle; whenStable does not track them.
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };
  const text = (): string => fixture.nativeElement.textContent;

  beforeEach(async () => {
    isConfirmed = true;
    capture = Object.assign(
      jasmine.createSpyObj<AgentCaptureService>('AgentCaptureService', [
        'isSuperSyncActive',
        'getMcpUrl',
        'listGrants',
        'switchOn',
        'switchOff',
        'createToken',
        'revokeGrant',
      ]),
      { isEnabled: signal(true) },
    );
    capture.getMcpUrl.and.resolveTo('https://sync.example/mcp');
    capture.listGrants.and.resolveTo([GRANT]);
    snack = jasmine.createSpyObj<SnackService>('SnackService', ['open']);

    await TestBed.configureTestingModule({
      imports: [
        AgentCaptureSettingsComponent,
        FormlyModule.forRoot(),
        TranslateModule.forRoot(),
      ],
      providers: [
        { provide: AgentCaptureService, useValue: capture },
        { provide: SnackService, useValue: snack },
        { provide: ShareService, useValue: {} },
        { provide: DateTimeFormatService, useValue: { currentLocale: () => 'en-gb' } },
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => of(isConfirmed) }) },
        },
      ],
    }).compileComponents();
  });

  it('asks to save SuperSync first when it is not the active provider', async () => {
    setup(false);
    await render();
    expect(text()).toContain('CAPTURE_SAVE_FIRST');
    expect(capture.listGrants).not.toHaveBeenCalled();
  });

  it('lists the MCP URL and connected assistants when on', async () => {
    setup();
    await render();
    expect(fixture.nativeElement.querySelector('input.value').value).toBe(
      'https://sync.example/mcp',
    );
    expect(text()).toContain('Claude Code');
  });

  it('shows when each token expires', async () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      F: {
        SYNC: { FORM: { SUPER_SYNC: { CAPTURE_GRANT_INFO: 'expires {{expires}}' } } },
      },
    });
    translate.use('en');
    setup();
    await render();
    expect(text()).toContain('expires 10/11/27');
  });

  it('shows a new token once and adds its assistant to the list', async () => {
    capture.createToken.and.resolveTo({
      token: 'sp_cap_secret',
      grant: { ...GRANT, id: 'g2', clientName: 'Cursor', pendingCount: 0 },
    });
    setup();
    await render();

    component.clientName.set('  Cursor ');
    await component.createToken();

    expect(capture.createToken).toHaveBeenCalledWith('Cursor');
    expect(component.newToken()).toBe('sp_cap_secret');
    expect(component.grants().map((g) => g.id)).toEqual(['g1', 'g2']);
  });

  it('revokes with discard only after the confirm', async () => {
    capture.revokeGrant.and.resolveTo();
    setup();
    await render();

    isConfirmed = false;
    await component.revoke(GRANT, true);
    expect(capture.revokeGrant).not.toHaveBeenCalled();

    isConfirmed = true;
    await component.revoke(GRANT, true);
    expect(capture.revokeGrant).toHaveBeenCalledWith('g1', true);
    expect(component.grants()).toEqual([]);
  });

  it('turns off after the confirm and reports a failure without throwing', async () => {
    capture.switchOff.and.rejectWith(new Error('offline'));
    setup();
    await render();

    await component.turnOff();

    expect(capture.switchOff).toHaveBeenCalled();
    expect(snack.open).toHaveBeenCalled();
    expect(component.isBusy()).toBeFalse();
  });
});
