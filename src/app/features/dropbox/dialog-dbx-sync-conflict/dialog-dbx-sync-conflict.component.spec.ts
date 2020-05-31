import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogDbxSyncConflictComponent } from './dialog-dbx-sync-conflict.component';

describe('DialogDbxSyncConflictComponent', () => {
  let component: DialogDbxSyncConflictComponent;
  let fixture: ComponentFixture<DialogDbxSyncConflictComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogDbxSyncConflictComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogDbxSyncConflictComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
