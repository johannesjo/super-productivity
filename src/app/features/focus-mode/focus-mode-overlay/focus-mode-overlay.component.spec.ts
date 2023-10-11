import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FocusModeOverlayComponent } from './focus-mode-overlay.component';

describe('FocusModeOverlayComponent', () => {
  let component: FocusModeOverlayComponent;
  let fixture: ComponentFixture<FocusModeOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FocusModeOverlayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FocusModeOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
