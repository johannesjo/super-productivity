import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GitCfgStepperComponent } from './git-cfg-stepper.component';

describe('GitCfgStepperComponent', () => {
  let component: GitCfgStepperComponent;
  let fixture: ComponentFixture<GitCfgStepperComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [GitCfgStepperComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GitCfgStepperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
