import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GoogleSyncCfgComponent } from './google-sync-cfg.component';

describe('GoogleSyncCfgComponent', () => {
  let component: GoogleSyncCfgComponent;
  let fixture: ComponentFixture<GoogleSyncCfgComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GoogleSyncCfgComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GoogleSyncCfgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
