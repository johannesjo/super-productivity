import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BetterDrawerContainerComponent } from './better-drawer-container.component';

describe('BetterDrawerContainerComponent', () => {
  let component: BetterDrawerContainerComponent;
  let fixture: ComponentFixture<BetterDrawerContainerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BetterDrawerContainerComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BetterDrawerContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
