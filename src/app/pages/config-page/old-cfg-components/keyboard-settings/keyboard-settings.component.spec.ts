import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { KeyboardSettingsComponent } from './keyboard-settings.component';

describe('KeyboardSettingsComponent', () => {
  let component: KeyboardSettingsComponent;
  let fixture: ComponentFixture<KeyboardSettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ KeyboardSettingsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(KeyboardSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
