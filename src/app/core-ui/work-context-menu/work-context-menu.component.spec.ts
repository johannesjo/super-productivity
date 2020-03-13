import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkContextMenuComponent } from './work-context-menu.component';

describe('WorkContextMenuComponent', () => {
  let component: WorkContextMenuComponent;
  let fixture: ComponentFixture<WorkContextMenuComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WorkContextMenuComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkContextMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
