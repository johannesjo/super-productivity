import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GitIssueContentComponent } from './git-issue-content.component';

describe('GitIssueContentComponent', () => {
  let component: GitIssueContentComponent;
  let fixture: ComponentFixture<GitIssueContentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [GitIssueContentComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GitIssueContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
