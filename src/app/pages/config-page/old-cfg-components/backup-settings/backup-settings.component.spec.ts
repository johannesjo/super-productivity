import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BackupSettingsComponent } from './backup-settings.component';

describe('BackupSettingsComponent', () => {
  let component: BackupSettingsComponent;
  let fixture: ComponentFixture<BackupSettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BackupSettingsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BackupSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
