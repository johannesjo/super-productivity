import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {GitlabIssueContentComponent} from './gitlab-issue-content.component';

describe('GitlabIssueContentComponent', () => {
  let component: GitlabIssueContentComponent;
  let fixture: ComponentFixture<GitlabIssueContentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [GitlabIssueContentComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GitlabIssueContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
