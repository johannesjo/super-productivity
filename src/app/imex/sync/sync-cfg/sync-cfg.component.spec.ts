import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SyncCfgComponent } from './sync-cfg.component';

describe('SyncCfgComponent', () => {
  let component: SyncCfgComponent;
  let fixture: ComponentFixture<SyncCfgComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SyncCfgComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SyncCfgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
