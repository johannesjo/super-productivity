import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GitSettingsComponent } from './git-settings.component';

describe('GitSettingsComponent', () => {
  let component: GitSettingsComponent;
  let fixture: ComponentFixture<GitSettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GitSettingsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GitSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
