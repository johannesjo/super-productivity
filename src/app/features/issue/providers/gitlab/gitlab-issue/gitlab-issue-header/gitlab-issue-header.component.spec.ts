import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {GitlabIssueHeaderComponent} from './gitlab-issue-header.component';

describe('GitlabIssueHeaderComponent', () => {
  let component: GitlabIssueHeaderComponent;
  let fixture: ComponentFixture<GitlabIssueHeaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [GitlabIssueHeaderComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GitlabIssueHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
