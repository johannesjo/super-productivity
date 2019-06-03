import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcrastinationComponent } from './procrastination.component';

describe('ProcrastinationComponent', () => {
  let component: ProcrastinationComponent;
  let fixture: ComponentFixture<ProcrastinationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ProcrastinationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProcrastinationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
