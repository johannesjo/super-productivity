import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogTaskSummaryComponent } from './dialog-task-summary.component';

describe('DialogTaskSummaryComponent', () => {
  let component: DialogTaskSummaryComponent;
  let fixture: ComponentFixture<DialogTaskSummaryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogTaskSummaryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogTaskSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
