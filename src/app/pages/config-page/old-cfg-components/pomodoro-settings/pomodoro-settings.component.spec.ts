import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PomodoroSettingsComponent } from './pomodoro-settings.component';

describe('PomodoroSettingsComponent', () => {
  let component: PomodoroSettingsComponent;
  let fixture: ComponentFixture<PomodoroSettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PomodoroSettingsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PomodoroSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
