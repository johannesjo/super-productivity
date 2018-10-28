import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DailySummaryComponent } from './daily-summary.component';

describe('DailySummaryComponent', () => {
  let component: DailySummaryComponent;
  let fixture: ComponentFixture<DailySummaryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DailySummaryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DailySummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
