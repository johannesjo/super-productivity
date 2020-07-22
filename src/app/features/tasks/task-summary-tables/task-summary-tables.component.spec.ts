import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskSummaryTablesComponent } from './task-summary-tables.component';

describe('TaskSummaryTablesComponent', () => {
  let component: TaskSummaryTablesComponent;
  let fixture: ComponentFixture<TaskSummaryTablesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TaskSummaryTablesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskSummaryTablesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
