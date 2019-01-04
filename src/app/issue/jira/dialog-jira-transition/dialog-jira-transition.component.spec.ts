import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogJiraTransitionComponent } from './dialog-jira-transition.component';

describe('DialogJiraTransitionComponent', () => {
  let component: DialogJiraTransitionComponent;
  let fixture: ComponentFixture<DialogJiraTransitionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogJiraTransitionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogJiraTransitionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
