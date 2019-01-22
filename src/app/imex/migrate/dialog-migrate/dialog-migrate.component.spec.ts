import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogMigrateComponent } from './dialog-migrate.component';

describe('DialogMigrateComponent', () => {
  let component: DialogMigrateComponent;
  let fixture: ComponentFixture<DialogMigrateComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DialogMigrateComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogMigrateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
