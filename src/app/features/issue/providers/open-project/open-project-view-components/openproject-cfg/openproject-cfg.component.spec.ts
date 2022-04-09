import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenprojectCfgComponent } from './openproject-cfg.component';

describe('OpenprojectCfgComponent', () => {
  let component: OpenprojectCfgComponent;
  let fixture: ComponentFixture<OpenprojectCfgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OpenprojectCfgComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OpenprojectCfgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
