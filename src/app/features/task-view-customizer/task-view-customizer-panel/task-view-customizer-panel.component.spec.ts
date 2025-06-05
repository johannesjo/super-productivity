import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskViewCustomizerPanelComponent } from './task-view-customizer-panel.component';
import { TaskViewCustomizerService } from '../task-view-customizer.service';
import { ChangeDetectorRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

describe('TaskViewCustomizerPanelComponent', () => {
  let component: TaskViewCustomizerPanelComponent;
  let fixture: ComponentFixture<TaskViewCustomizerPanelComponent>;
  let mockService: jasmine.SpyObj<TaskViewCustomizerService>;
  let mockCdRef: jasmine.SpyObj<ChangeDetectorRef>;

  beforeEach(async () => {
    mockService = jasmine.createSpyObj('TaskViewCustomizerService', [
      'setSort',
      'setGroup',
      'setFilter',
      'selectedSort$',
      'selectedGroup$',
      'selectedFilter$',
      'filterInputValue$',
    ]);

    mockService.selectedSort$ = new BehaviorSubject<string>('default');
    mockService.selectedGroup$ = new BehaviorSubject<string>('default');
    mockService.selectedFilter$ = new BehaviorSubject<string>('default');
    mockService.filterInputValue$ = new BehaviorSubject<string>('');

    mockCdRef = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck']);

    await TestBed.configureTestingModule({
      imports: [TaskViewCustomizerPanelComponent],
      providers: [
        { provide: TaskViewCustomizerService, useValue: mockService },
        { provide: ChangeDetectorRef, useValue: mockCdRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskViewCustomizerPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should reset all options on onResetAll()', () => {
    component.selectedSort = 'name';
    component.selectedGroup = 'tag';
    component.selectedFilter = 'tag';
    component.filterInputValue = 'something';
    spyOn(component, 'applyTaskViewCustomizations');
    component.onResetAll();
    expect(component.selectedSort).toBe('default');
    expect(component.selectedGroup).toBe('default');
    expect(component.selectedFilter).toBe('default');
    expect(component.filterInputValue).toBe('');
    expect(component.applyTaskViewCustomizations).toHaveBeenCalled();
  });

  it('should call service methods on applyTaskViewCustomizations()', () => {
    component.selectedSort = 'name';
    component.selectedGroup = 'tag';
    component.selectedFilter = 'tag';
    component.filterInputValue = 'something';
    component.applyTaskViewCustomizations();
    expect(mockService.setSort).toHaveBeenCalledWith('name');
    expect(mockService.setGroup).toHaveBeenCalledWith('tag');
    expect(mockService.setFilter).toHaveBeenCalledWith('tag', 'something');
  });

  it('should call applyTaskViewCustomizations on Enter key in triggerEnterSubmit()', () => {
    spyOn(component, 'applyTaskViewCustomizations');
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    component.triggerEnterSubmit(event);
    expect(component.applyTaskViewCustomizations).toHaveBeenCalled();
  });

  it('should not call applyTaskViewCustomizations on non-Enter key in triggerEnterSubmit()', () => {
    spyOn(component, 'applyTaskViewCustomizations');
    const event = new KeyboardEvent('keydown', { key: 'a' });
    component.triggerEnterSubmit(event);
    expect(component.applyTaskViewCustomizations).not.toHaveBeenCalled();
  });
});
