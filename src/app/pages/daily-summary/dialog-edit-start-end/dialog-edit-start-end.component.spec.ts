import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogEditStartEndComponent } from './dialog-edit-start-end.component';

describe('DialogEditStartEndComponent', () => {
  let component: DialogEditStartEndComponent;
  let fixture: ComponentFixture<DialogEditStartEndComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogEditStartEndComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogEditStartEndComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
