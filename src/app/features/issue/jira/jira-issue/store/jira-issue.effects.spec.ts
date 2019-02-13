// import { TestBed } from '@angular/core/testing';
// import { provideMockActions } from '@ngrx/effects/testing';
// import { Observable, of } from 'rxjs';
//
// import { JiraIssueEffects } from './jira-issue.effects';
// import { ConfigService } from '../../../../config/config.service';
// import { SnackService } from '../../../../../core/snack/snack.service';
// import { TaskService } from '../../../../tasks/task.service';
// import { JiraIssueService } from '../jira-issue.service';
// import { JiraApiService } from '../../jira-api.service';
// import { PersistenceService } from '../../../../../core/persistence/persistence.service';
// import { MatDialog } from '@angular/material';
// import { Store } from '@ngrx/store';
//
//
// class StoreMock {
//   val: any;
//
//   constructor(val) {
//     this.val = val;
//   }
//
//   // How we did it before
//   select = jasmine.createSpy().and.returnValue(of(this.val));
//   dispatch = jasmine.createSpy();
// }
//
//
// describe('JiraIssueEffects', () => {
//   let actions$: Observable<any>;
//   let effects: JiraIssueEffects;
//
//   beforeEach(() => {
//     TestBed.configureTestingModule({
//       imports: [
//         EffectsTestingModule
//       ],
//       providers: [
//         JiraIssueEffects,
//         {provide: Store, useValue: {}},
//         {provide: ConfigService, useValue: {}},
//         {provide: SnackService, useValue: {}},
//         {provide: TaskService, useValue: {}},
//         {provide: ConfigService, useValue: {}},
//         {provide: TaskService, useValue: {}},
//         {provide: JiraApiService, useValue: {}},
//         {provide: JiraIssueService, useValue: {}},
//         {provide: JiraIssueService, useValue: {}},
//         {provide: PersistenceService, useValue: {}},
//         {provide: MatDialog, useValue: {}},
//         provideMockActions(() => actions$)
//       ]
//     });
//
//     effects = TestBed.get(JiraIssueEffects);
//   });
//
//   it('should be created', () => {
//     expect(effects).toBeTruthy();
//   });
// });
