import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DatetimeInputComponent } from './datetime-input.component';

describe('DatetimeInputComponent', () => {
  let component: DatetimeInputComponent;
  let fixture: ComponentFixture<DatetimeInputComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DatetimeInputComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DatetimeInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
