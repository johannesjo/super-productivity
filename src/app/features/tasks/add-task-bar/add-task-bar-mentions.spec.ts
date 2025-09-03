import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { AddTaskBarComponent } from './add-task-bar.component';
import { TaskService } from '../task.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { ProjectService } from '../../project/project.service';
import { TagService } from '../../tag/tag.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { AddTaskBarIssueSearchService } from './add-task-bar-issue-search.service';
import { MatDialog } from '@angular/material/dialog';
import { SnackService } from '../../../core/snack/snack.service';
import { TranslateService } from '@ngx-translate/core';
import { Tag } from '../../tag/tag.model';
import { Project } from '../../project/project.model';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

@Component({
  template: `<add-task-bar></add-task-bar>`,
  standalone: true,
  imports: [AddTaskBarComponent],
})
class TestHostComponent {}

describe('AddTaskBarComponent Mentions Integration', () => {
  let component: AddTaskBarComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;
  let mockGlobalConfigService: jasmine.SpyObj<GlobalConfigService>;
  let tagsSubject: BehaviorSubject<any>;

  const validTags: Tag[] = [
    { id: '1', title: 'UX', color: '#ff0000' } as Tag,
    { id: '2', title: 'Development', color: '#00ff00' } as Tag,
    { id: '3', title: 'Testing', color: '#0000ff' } as Tag,
  ];

  const invalidTags = [
    { id: '4', title: 'ValidTag', color: '#ff0000' },
    null,
    undefined,
    { id: '5', title: null, color: '#00ff00' },
    { id: '6', title: undefined, color: '#0000ff' },
    { id: '7', title: '', color: '#ffff00' },
    { id: '8', title: 123, color: '#ff00ff' }, // non-string title
    { id: '9', color: '#ffffff' }, // missing title
  ] as any[];

  const validProjects: Project[] = [
    { id: 'p1', title: 'Project1', isHiddenFromMenu: false } as Project,
    { id: 'p2', title: 'Project2', isHiddenFromMenu: false } as Project,
  ];

  beforeEach(async () => {
    const taskServiceSpy = jasmine.createSpyObj('TaskService', [
      'add',
      'getByIdOnce$',
      'scheduleTask',
      'moveToCurrentWorkContext',
    ]);
    const workContextServiceSpy = jasmine.createSpyObj('WorkContextService', [], {
      activeWorkContext$: of(null),
      activeWorkContextType: null,
    });
    const projectServiceSpy = jasmine.createSpyObj('ProjectService', [], {
      list$: of(validProjects),
    });
    tagsSubject = new BehaviorSubject(validTags);
    const tagServiceSpy = jasmine.createSpyObj('TagService', ['addTag'], {
      tags$: of(validTags),
      tagsNoMyDayAndNoList$: tagsSubject,
    });
    const globalConfigServiceSpy = jasmine.createSpyObj('GlobalConfigService', [], {
      shortSyntax$: of({
        isEnableTag: true,
        isEnableDue: true,
        isEnableProject: true,
      }),
    });
    const addTaskBarIssueSearchServiceSpy = jasmine.createSpyObj(
      'AddTaskBarIssueSearchService',
      ['getFilteredIssueSuggestions$', 'addTaskFromExistingTaskOrIssue'],
    );
    const matDialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    const snackServiceSpy = jasmine.createSpyObj('SnackService', ['open']);
    const translateServiceSpy = jasmine.createSpyObj(
      'TranslateService',
      ['instant', 'get'],
      {
        get: () => of('translated text'),
      },
    );

    await TestBed.configureTestingModule({
      imports: [TestHostComponent, AddTaskBarComponent, NoopAnimationsModule],
      providers: [
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: WorkContextService, useValue: workContextServiceSpy },
        { provide: ProjectService, useValue: projectServiceSpy },
        { provide: TagService, useValue: tagServiceSpy },
        { provide: GlobalConfigService, useValue: globalConfigServiceSpy },
        {
          provide: AddTaskBarIssueSearchService,
          useValue: addTaskBarIssueSearchServiceSpy,
        },
        { provide: MatDialog, useValue: matDialogSpy },
        { provide: SnackService, useValue: snackServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.debugElement.children[0].componentInstance;
    mockProjectService = TestBed.inject(ProjectService) as jasmine.SpyObj<ProjectService>;
    mockGlobalConfigService = TestBed.inject(
      GlobalConfigService,
    ) as jasmine.SpyObj<GlobalConfigService>;

    // tagsSubject is already created above and accessible throughout the test

    addTaskBarIssueSearchServiceSpy.getFilteredIssueSuggestions$.and.returnValue(of([]));

    fixture.detectChanges();
  });

  describe('mentionCfg$ observable', () => {
    it('should pass through tag items without filtering', (done) => {
      // Mix valid and invalid tags; directive layer handles validation
      const mixedTags = [...validTags, ...invalidTags];
      tagsSubject.next(mixedTags as any);

      component.mentionCfg$.subscribe((config) => {
        expect(config).toBeTruthy();
        expect(config.mentions).toBeTruthy();
        expect(config.mentions!.length).toBe(3); // tag, due, project mentions

        const tagMention = config.mentions!.find((m) => m.triggerChar === '#');
        expect(tagMention).toBeTruthy();
        expect(tagMention!.items).toBeTruthy();
        expect(tagMention!.items!.length).toBe(mixedTags.length);
        expect(tagMention!.labelKey).toBe('title');

        // Should contain all original valid tag titles
        const titles = tagMention!.items!.map((item: any) => item.title);
        expect(titles).toContain('UX');
        expect(titles).toContain('Development');
        expect(titles).toContain('Testing');
        expect(titles).toContain('ValidTag');

        done();
      });
    });

    it('should handle empty tags array gracefully', (done) => {
      tagsSubject.next([]);

      component.mentionCfg$.subscribe((config) => {
        const tagMention = config.mentions!.find((m) => m.triggerChar === '#');
        expect(tagMention!.items).toEqual([]);
        done();
      });
    });

    it('should handle undefined tags array gracefully', (done) => {
      tagsSubject.next(undefined as any);

      component.mentionCfg$.subscribe((config) => {
        const tagMention = config.mentions!.find((m) => m.triggerChar === '#');
        expect(tagMention!.items).toEqual([]);
        done();
      });
    });

    it('should pass through invalid tags array as-is', (done) => {
      const onlyInvalid = invalidTags.slice(1); // exclude the one valid tag
      tagsSubject.next(onlyInvalid);

      component.mentionCfg$.subscribe((config) => {
        const tagMention = config.mentions!.find((m) => m.triggerChar === '#');
        expect(Array.isArray(tagMention!.items)).toBeTrue();
        expect(tagMention!.items!.length).toBe(onlyInvalid.length);
        done();
      });
    });

    it('should pass through project items as-is', (done) => {
      const invalidProjects = [
        { id: 'p3', title: 'ValidProject', isHiddenFromMenu: false },
        { id: 'p4', title: null, isHiddenFromMenu: false },
        { id: 'p5', title: '', isHiddenFromMenu: false },
        { id: 'p6', isHiddenFromMenu: false }, // missing title
      ] as any[];

      // Override project service to return mixed valid/invalid projects
      (mockProjectService as any).list$ = of(invalidProjects);

      component.mentionCfg$.subscribe((config) => {
        const projectMention = config.mentions!.find((m) => m.triggerChar === '+');
        expect(projectMention).toBeTruthy();
        expect(projectMention!.items!.length).toBe(invalidProjects.length);
        const titles = projectMention!.items!.map((it: any) => it && it.title);
        expect(titles).toContain('ValidProject');
        done();
      });
    });

    it('should not create tag mentions when disabled in config', (done) => {
      (mockGlobalConfigService as any).shortSyntax$ = of({
        isEnableTag: false,
        isEnableDue: true,
        isEnableProject: true,
      });

      component.mentionCfg$.subscribe((config) => {
        const tagMention = config.mentions!.find((m) => m.triggerChar === '#');
        expect(tagMention).toBeUndefined();

        // Should still have due and project mentions
        expect(config.mentions!.length).toBe(2);
        done();
      });
    });

    it('should handle real-world tag data structure', (done) => {
      const realWorldTags = [
        { id: 'tag1', title: 'UX', color: '#ff0000', created: Date.now() },
        { id: 'tag2', title: 'Bug', color: '#ff0000', created: Date.now() },
        { id: 'tag3', title: 'Feature', color: '#00ff00', created: Date.now() },
      ] as Tag[];

      tagsSubject.next(realWorldTags);

      component.mentionCfg$.subscribe((config) => {
        const tagMention = config.mentions!.find((m) => m.triggerChar === '#');
        expect(tagMention!.items!.length).toBe(3);
        done();
      });
    });
  });

  describe('tag validation edge cases', () => {
    it('should handle tags with whitespace-only titles', (done) => {
      const tagsWithWhitespace = [
        { id: '1', title: '   ', color: '#ff0000' }, // spaces only
        { id: '2', title: '\t\n', color: '#00ff00' }, // tabs and newlines
        { id: '3', title: 'ValidTag', color: '#0000ff' },
      ] as any[];

      tagsSubject.next(tagsWithWhitespace);

      component.mentionCfg$.subscribe((config) => {
        const tagMention = config.mentions!.find((m) => m.triggerChar === '#');
        expect(tagMention!.items!.length).toBe(tagsWithWhitespace.length);
        const titles = tagMention!.items!.map((it: any) => it && it.title);
        expect(titles).toContain('ValidTag');
        done();
      });
    });

    it('should handle tags with non-object types', (done) => {
      const mixedTypes = [
        'string-tag',
        123,
        true,
        { id: '1', title: 'ValidTag', color: '#ff0000' },
        [],
        () => {},
      ] as any[];

      tagsSubject.next(mixedTypes);

      component.mentionCfg$.subscribe((config) => {
        const tagMention = config.mentions!.find((m) => m.triggerChar === '#');
        expect(tagMention!.items!.length).toBe(mixedTypes.length);
        const titles = tagMention!.items!.map((it: any) => it && it.title);
        expect(titles).toContain('ValidTag');
        done();
      });
    });
  });
});
