import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { QuickAddTaskSubmitService } from './quick-add-task-submit.service';
import { TaskBuilderService } from './task-builder.service';
import { ProjectService } from '../project/project.service';
import { TagService } from '../tag/tag.service';
import { GlobalConfigService } from '../config/global-config.service';
import { WorkContextService } from '../work-context/work-context.service';
import { DateService } from '../../core/date/date.service';
import { DateTimeFormatService } from '../../core/date-time-format/date-time-format.service';
import { MenuTreeService } from '../menu-tree/menu-tree.service';
import { DEFAULT_GLOBAL_CONFIG } from '../config/default-global-config.const';
import { TaskReminderOptionId } from './task.model';
import type { AddTaskPayload } from './add-task-bar/add-task-payload-builder';
import type { QuickAddSnapshotResult } from './add-task-bar/quick-add-hud.model';

describe('QuickAddTaskSubmitService', () => {
  let service: QuickAddTaskSubmitService;
  let taskBuilderService: jasmine.SpyObj<TaskBuilderService>;
  let originalEa: typeof window.ea;
  let submitResponses: { requestId: string; result: { ok: boolean } }[];
  let snapshotResponses: { requestId: string; result: QuickAddSnapshotResult }[];

  const validPayload = (overrides: Partial<AddTaskPayload> = {}): AddTaskPayload => ({
    title: 'From the HUD',
    taskData: { projectId: 'INBOX_PROJECT', tagIds: ['tag-1'] },
    isAddToBacklog: false,
    isAddToBottom: false,
    remindOption: TaskReminderOptionId.DoNotRemind,
    repeat: null,
    ...overrides,
  });

  beforeEach(() => {
    submitResponses = [];
    snapshotResponses = [];

    originalEa = window.ea;
    window.ea = {
      onQuickAddTaskSubmitRequest: () => () => undefined,
      onQuickAddSnapshotRequest: () => () => undefined,
      sendQuickAddTaskSubmitResponse: (requestId: string, result: { ok: boolean }) =>
        submitResponses.push({ requestId, result }),
      sendQuickAddSnapshotResponse: (requestId: string, result: QuickAddSnapshotResult) =>
        snapshotResponses.push({ requestId, result }),
      informQuickAddBridgeReady: () => undefined,
    } as unknown as typeof window.ea;

    taskBuilderService = jasmine.createSpyObj('TaskBuilderService', ['addTask']);
    taskBuilderService.addTask.and.returnValue('task-1');

    TestBed.configureTestingModule({
      providers: [
        QuickAddTaskSubmitService,
        { provide: TaskBuilderService, useValue: taskBuilderService },
        {
          provide: ProjectService,
          useValue: {
            list: () => [{ id: 'INBOX_PROJECT' }],
            listInTreeOrderForUI: () => [],
          },
        },
        {
          provide: TagService,
          useValue: {
            tags: () => [{ id: 'tag-1' }],
            tagsNoMyDayAndNoListInTreeOrder: () => [],
          },
        },
        {
          provide: GlobalConfigService,
          useValue: {
            tasks: () => ({ defaultProjectId: null }),
            shortSyntax: () => DEFAULT_GLOBAL_CONFIG.shortSyntax,
            cfg: signal({
              ...DEFAULT_GLOBAL_CONFIG,
              localization: { ...DEFAULT_GLOBAL_CONFIG.localization, lng: null },
            }),
          },
        },
        { provide: WorkContextService, useValue: { activeWorkContext$: of(null) } },
        { provide: DateService, useValue: { todayStr: () => '2026-06-19' } },
        {
          provide: DateTimeFormatService,
          useValue: { currentLocale: () => 'en-US', textLocale: () => 'en-US' },
        },
        {
          provide: MenuTreeService,
          useValue: {
            projectFolderMap: () => new Map<string, string>(),
            tagFolderMap: () => new Map<string, string>(),
          },
        },
        {
          provide: TranslateService,
          useValue: { currentLang: 'de' },
        },
      ],
    });
    service = TestBed.inject(QuickAddTaskSubmitService);
  });

  afterEach(() => {
    window.ea = originalEa;
  });

  // `init()` is a no-op outside Electron (IS_ELECTRON is userAgent-derived and
  // fixed at module load), so the request handlers are exercised directly. What
  // matters here is what they decide, not how they are wired to IPC.
  it('adds a valid payload and answers the request that asked for it', async () => {
    await service['_submitTask']('req-1', validPayload());

    expect(taskBuilderService.addTask).toHaveBeenCalled();
    expect(submitResponses).toEqual([
      { requestId: 'req-1', result: { ok: true, taskId: 'task-1' } as never },
    ]);
  });

  it('rejects an untrusted payload without creating anything', async () => {
    // The HUD is a separate renderer, so its payload is re-validated here rather
    // than trusted — an id the main renderer does not know must not create a task.
    await service['_submitTask'](
      'req-2',
      validPayload({ taskData: { projectId: 'not-a-project', tagIds: [] } }),
    );

    expect(taskBuilderService.addTask).not.toHaveBeenCalled();
    expect(submitResponses[0].result).toEqual(
      jasmine.objectContaining({ ok: false }) as never,
    );
  });

  it('reports the language actually in use, not the configured one', async () => {
    // Leaving the language on "auto" stores no `lng`; reading the config alone
    // is what made the HUD open in English while the app was translated.
    await service['_sendSnapshot']('req-3');

    const result = snapshotResponses[0].result;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.lng).toBe('de');
    }
  });
});
