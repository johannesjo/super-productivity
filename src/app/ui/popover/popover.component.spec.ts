import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdkPopoverContainerComponent } from './popover-container';

describe('CalendarPopoverComponent', () => {
  let component: CdkPopoverContainerComponent;
  let fixture: ComponentFixture<CdkPopoverContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CdkPopoverContainerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CdkPopoverContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
