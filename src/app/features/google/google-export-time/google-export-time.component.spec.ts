import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GoogleExportTimeComponent } from './google-export-time.component';

describe('GoogleExportTimeComponent', () => {
  let component: GoogleExportTimeComponent;
  let fixture: ComponentFixture<GoogleExportTimeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GoogleExportTimeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GoogleExportTimeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
