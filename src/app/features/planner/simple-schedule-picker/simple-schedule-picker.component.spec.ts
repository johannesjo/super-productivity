import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimpleSchedulePicker } from './simple-schedule-picker.component';

describe('DialogTimeDisplayComponent', () => {
  let component: SimpleSchedulePicker;
  let fixture: ComponentFixture<SimpleSchedulePicker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleSchedulePicker],
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleSchedulePicker);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
