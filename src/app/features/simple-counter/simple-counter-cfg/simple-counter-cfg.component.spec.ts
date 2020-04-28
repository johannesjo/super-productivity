import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SimpleCounterCfgComponent } from './simple-counter-cfg.component';

describe('SimpleCounterCfgComponent', () => {
  let component: SimpleCounterCfgComponent;
  let fixture: ComponentFixture<SimpleCounterCfgComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SimpleCounterCfgComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SimpleCounterCfgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
