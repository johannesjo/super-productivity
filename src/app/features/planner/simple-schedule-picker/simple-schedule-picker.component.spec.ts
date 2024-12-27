import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimpleSchedulePickerComponent } from './simple-schedule-picker.component';

describe('DialogTimeDisplayComponent', () => {
  let component: SimpleSchedulePickerComponent;
  let fixture: ComponentFixture<SimpleSchedulePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleSchedulePickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleSchedulePickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
