import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { IconInputComponent } from './icon-input.component';

describe('IconInputComponent', () => {
  let component: IconInputComponent;
  let fixture: ComponentFixture<IconInputComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ IconInputComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IconInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
