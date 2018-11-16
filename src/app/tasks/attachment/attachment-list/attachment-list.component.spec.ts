import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AttachmentListComponent } from './attachment-list.component';

describe('AttachmentListComponent', () => {
  let component: AttachmentListComponent;
  let fixture: ComponentFixture<AttachmentListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AttachmentListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AttachmentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
