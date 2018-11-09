import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectTaskComponent } from './select-task.component';

describe('SelectTaskComponent', () => {
  let component: SelectTaskComponent;
  let fixture: ComponentFixture<SelectTaskComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SelectTaskComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectTaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
