import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskViewCustomizerPanelComponent } from './task-view-customizer-panel.component';
import { TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { RootState } from 'src/app/root-store/root-state';
import { provideMockStore } from '@ngrx/store/testing';
import { CONFIG_FEATURE_NAME } from '../../config/store/global-config.reducer';
import { TaskViewCustomizerService } from '../task-view-customizer.service';

describe('TaskViewCustomizerPanelComponent', () => {
  let component: TaskViewCustomizerPanelComponent;
  let fixture: ComponentFixture<TaskViewCustomizerPanelComponent>;

  const taskViewCustomizerServiceSpy = {
    setSort: jasmine.createSpy('setSort'),
    setGroup: jasmine.createSpy('setGroup'),
    setFilterType: jasmine.createSpy('setFilterType'),
    setFilterInput: jasmine.createSpy('setFilterInput'),
    resetAll: jasmine.createSpy('resetAll'),
    selectedSort: () => 'default',
    selectedGroup: () => 'default',
    selectedFilter: () => 'default',
    filterInputValue: () => '',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskViewCustomizerPanelComponent, TranslateModule.forRoot()],
      providers: [
        provideMockStore<Partial<RootState>>({
          initialState: {
            [CONFIG_FEATURE_NAME]: {
              sync: {},
            } as any,
          },
        }),
        TranslateService,
        TranslateStore,
        { provide: TaskViewCustomizerService, useValue: taskViewCustomizerServiceSpy },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskViewCustomizerPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
