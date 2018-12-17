import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogGitInitialSetupComponent } from './dialog-git-initial-setup.component';

describe('DialogGitInitialSetupComponent', () => {
  let component: DialogGitInitialSetupComponent;
  let fixture: ComponentFixture<DialogGitInitialSetupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogGitInitialSetupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogGitInitialSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
