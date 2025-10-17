import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HelpBoxComponent } from './help-box.component';
import { provideAnimations } from '@angular/platform-browser/animations';

describe('HelpBoxComponent', () => {
  let component: HelpBoxComponent;
  let fixture: ComponentFixture<HelpBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpBoxComponent],
      providers: [provideAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(HelpBoxComponent);
    component = fixture.componentInstance;
    component.lsKey = 'TEST_HELP_BOX';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the help box by default', () => {
    expect(component.isVisible()).toBe(true);
  });

  it('should hide the help box when close is clicked', () => {
    component.onClose();
    expect(component.isVisible()).toBe(false);
  });
});
