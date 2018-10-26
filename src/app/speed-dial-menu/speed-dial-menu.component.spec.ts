import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SpeedDialMenuComponent } from './speed-dial-menu.component';

describe('SpeedDialMenuComponent', () => {
  let component: SpeedDialMenuComponent;
  let fixture: ComponentFixture<SpeedDialMenuComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SpeedDialMenuComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SpeedDialMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
