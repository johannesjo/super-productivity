import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { FinishDayBtnComponent } from './finish-day-btn.component';

describe('FinishDayBtnComponent', () => {
  let fixture: ComponentFixture<FinishDayBtnComponent>;

  const btnEl = (): HTMLButtonElement =>
    fixture.debugElement.query(By.css('.e2e-finish-day')).nativeElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinishDayBtnComponent, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FinishDayBtnComponent);
    fixture.componentRef.setInput('hasDoneTasks', false);
    fixture.detectChanges();
  });

  it('renders an outlined button while there are no done tasks', () => {
    expect(btnEl().classList).toContain('mat-mdc-outlined-button');
    expect(btnEl().classList).toContain('mat-unthemed');
  });

  it('renders a filled primary button once there are done tasks', () => {
    fixture.componentRef.setInput('hasDoneTasks', true);
    fixture.detectChanges();

    expect(btnEl().classList).toContain('mat-mdc-unelevated-button');
    expect(btnEl().classList).toContain('mat-primary');
  });

  // The button is a routerLink: an @if/@else swap between the two appearances
  // would re-create the node whenever hasDoneTasks() flips, and a click landing
  // in that window is dropped before the link is wired (CI run 33189475377).
  it('keeps the same DOM node across the flip', () => {
    const before = btnEl();

    fixture.componentRef.setInput('hasDoneTasks', true);
    fixture.detectChanges();

    expect(btnEl()).toBe(before);
  });
});
