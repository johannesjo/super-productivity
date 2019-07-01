import {TestBed} from '@angular/core/testing';

import {SyncService} from './sync.service';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {SnackService} from '../../core/snack/snack.service';
import {ProjectService} from '../../features/project/project.service';
import {GlobalConfigService} from '../../features/config/global-config.service';
import {TaskService} from '../../features/tasks/task.service';
import {AttachmentService} from '../../features/attachment/attachment.service';
import {BookmarkService} from '../../features/bookmark/bookmark.service';
import {JiraIssueService} from '../../features/issue/jira/jira-issue/jira-issue.service';
import {NoteService} from '../../features/note/note.service';
import {ReminderService} from '../../features/reminder/reminder.service';

describe('SyncService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [
      {provide: PersistenceService, useValue: {}},
      {provide: SnackService, useValue: {}},
      {provide: ProjectService, useValue: {}},
      {provide: GlobalConfigService, useValue: {}},
      {provide: TaskService, useValue: {}},
      {provide: AttachmentService, useValue: {}},
      {provide: BookmarkService, useValue: {}},
      {provide: JiraIssueService, useValue: {}},
      {provide: NoteService, useValue: {}},
      {provide: ReminderService, useValue: {}},
    ]
  }));

  it('should be created', () => {
    const service: SyncService = TestBed.get(SyncService);
    expect(service).toBeTruthy();
  });
});
