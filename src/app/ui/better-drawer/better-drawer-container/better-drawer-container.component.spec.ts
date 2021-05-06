import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BetterDrawerContainerComponent } from './better-drawer-container.component';

describe('BetterDrawerContainerComponent', () => {
  let component: BetterDrawerContainerComponent;
  let fixture: ComponentFixture<BetterDrawerContainerComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [BetterDrawerContainerComponent],
      }).compileComponents();
    }),
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(BetterDrawerContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
