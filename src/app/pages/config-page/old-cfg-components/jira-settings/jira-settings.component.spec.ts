import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { JiraSettingsComponent } from './jira-settings.component';

describe('JiraSettingsComponent', () => {
  let component: JiraSettingsComponent;
  let fixture: ComponentFixture<JiraSettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ JiraSettingsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(JiraSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
