import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FocusModeMainComponent } from './focus-mode-main.component';

describe('FocusModeMainComponent', () => {
  let component: FocusModeMainComponent;
  let fixture: ComponentFixture<FocusModeMainComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FocusModeMainComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FocusModeMainComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
