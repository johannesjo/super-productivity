import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditProjectFormComponent } from './edit-project-form.component';

describe('EditProjectFormComponent', () => {
  let component: EditProjectFormComponent;
  let fixture: ComponentFixture<EditProjectFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditProjectFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditProjectFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
