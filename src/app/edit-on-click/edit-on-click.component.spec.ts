import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditOnClickComponent } from './edit-on-click.component';

describe('EditOnClickComponent', () => {
  let component: EditOnClickComponent;
  let fixture: ComponentFixture<EditOnClickComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditOnClickComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditOnClickComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
