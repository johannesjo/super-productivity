import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {DialogGitlabInitialSetupComponent} from './dialog-gitlab-initial-setup.component';

describe('DialogGitlabInitialSetupComponent', () => {
  let component: DialogGitlabInitialSetupComponent;
  let fixture: ComponentFixture<DialogGitlabInitialSetupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DialogGitlabInitialSetupComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogGitlabInitialSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
