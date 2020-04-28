import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SimpleCounterButtonComponent } from './simple-counter-button.component';

describe('SimpleCounterButtonComponent', () => {
  let component: SimpleCounterButtonComponent;
  let fixture: ComponentFixture<SimpleCounterButtonComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SimpleCounterButtonComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SimpleCounterButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
