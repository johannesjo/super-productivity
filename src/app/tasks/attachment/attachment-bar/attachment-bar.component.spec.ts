import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AttachmentBarComponent } from './attachment-bar.component';

describe('AttachmentBarComponent', () => {
  let component: AttachmentBarComponent;
  let fixture: ComponentFixture<AttachmentBarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AttachmentBarComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AttachmentBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
