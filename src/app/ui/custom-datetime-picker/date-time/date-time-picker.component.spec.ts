// /**
//  * date-time-picker.component.spec
//  */
//
// import { OwlDateTimeComponent } from './date-time-picker.component';
// import {
//   ComponentFixture,
//   fakeAsync,
//   flush,
//   inject,
//   TestBed,
// } from '@angular/core/testing';
// import {
//   Component,
//   FactoryProvider,
//   Type,
//   ValueProvider,
//   ViewChild,
// } from '@angular/core';
// import { OwlDateTimeInputDirective } from './date-time-picker-input.directive';
// import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
// import { NoopAnimationsModule } from '@angular/platform-browser/animations';
// import { OwlDateTimeModule } from './date-time.module';
// import { OverlayContainer } from '@angular/cdk/overlay';
// import { OwlNativeDateTimeModule } from './adapter/native-date-time.module';
// import {
//   createKeyboardEvent,
//   dispatchEvent,
//   dispatchFakeEvent,
//   dispatchKeyboardEvent,
//   dispatchMouseEvent,
// } from '../test-helpers';
// import { ENTER, ESCAPE, RIGHT_ARROW, UP_ARROW } from '@angular/cdk/keycodes';
// import { By } from '@angular/platform-browser';
// import { OwlDateTimeContainerComponent } from './date-time-picker-container.component';
// import { OwlDateTimeTriggerDirective } from './date-time-picker-trigger.directive';
// import { BrowserDynamicTestingModule } from '@angular/platform-browser-dynamic/testing';
//
// const JAN = 0,
//   FEB = 1,
//   MAR = 2,
//   APR = 3,
//   MAY = 4,
//   JUN = 5,
//   JUL = 6,
//   AUG = 7,
//   SEP = 8,
//   OCT = 9,
//   NOV = 10,
//   DEC = 11;
//
// describe('OwlDateTimeComponent', () => {
//   const SUPPORTS_INTL = typeof Intl !== 'undefined';
//
//   // Creates a test component fixture.
//   function createComponent(
//     component: Type<any>,
//     imports: Type<any>[] = [],
//     providers: (FactoryProvider | ValueProvider)[] = [],
//     entryComponents: Type<any>[] = [],
//   ): ComponentFixture<any> {
//     TestBed.configureTestingModule({
//       imports: [
//         FormsModule,
//         OwlDateTimeModule,
//         NoopAnimationsModule,
//         ReactiveFormsModule,
//         ...imports,
//       ],
//       providers,
//       declarations: [component, ...entryComponents],
//     });
//
//     TestBed.overrideModule(BrowserDynamicTestingModule, {
//       set: {
//         entryComponents: [entryComponents],
//       },
//     }).compileComponents();
//
//     return TestBed.createComponent(component);
//   }
//
//   afterEach(inject([OverlayContainer], (container: OverlayContainer) => {
//     container.ngOnDestroy();
//   }));
//
//   describe('with OwlNativeDateTimeModule', () => {
//     describe('standard DateTimePicker', () => {
//       let fixture: ComponentFixture<StandardDateTimePickerComponent>;
//       let testComponent: StandardDateTimePickerComponent;
//       let containerElement: HTMLElement;
//
//       beforeEach(fakeAsync(() => {
//         fixture = createComponent(StandardDateTimePickerComponent, [
//           OwlNativeDateTimeModule,
//         ]);
//         fixture.detectChanges();
//         testComponent = fixture.componentInstance;
//       }));
//
//       afterEach(fakeAsync(() => {
//         testComponent.dateTimePicker.close();
//         fixture.detectChanges();
//         flush();
//       }));
//
//       it('should initialize with correct value shown in input', () => {
//         if (SUPPORTS_INTL) {
//           expect(fixture.nativeElement.querySelector('input').value).toBe(
//             '1/1/2020, 12:00 AM',
//           );
//         }
//       });
//
//       it('should open popup when pickerMode is "popup"', () => {
//         expect(document.querySelector('.cdk-overlay-pane.owl-dt-popup')).toBeNull();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//
//         expect(document.querySelector('.cdk-overlay-pane.owl-dt-popup')).not.toBeNull();
//       });
//
//       it('should open dialog when pickerMode is "dialog"', () => {
//         testComponent.pickerMode = 'dialog';
//         fixture.detectChanges();
//
//         expect(document.querySelector('.owl-dt-dialog owl-dialog-container')).toBeNull();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//
//         expect(
//           document.querySelector('.owl-dt-dialog owl-dialog-container'),
//         ).not.toBeNull();
//       });
//
//       it('should open dateTimePicker if opened input is set to true', fakeAsync(() => {
//         testComponent.opened = true;
//         fixture.detectChanges();
//         flush();
//
//         expect(document.querySelector('.owl-dt-container')).not.toBeNull();
//
//         testComponent.opened = false;
//         fixture.detectChanges();
//         flush();
//
//         expect(document.querySelector('.owl-dt-container')).toBeNull();
//       }));
//
//       it('should NOT open dateTimePicker if it is disabled', () => {
//         testComponent.disabled = true;
//         fixture.detectChanges();
//
//         expect(document.querySelector('.cdk-overlay-pane')).toBeNull();
//         expect(document.querySelector('owl-date-time-container')).toBeNull();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//
//         expect(document.querySelector('.cdk-overlay-pane')).toBeNull();
//         expect(document.querySelector('owl-date-time-container')).toBeNull();
//       });
//
//       it('disabled dateTimePicker input should open the picker panel if dateTimePicker is enabled', () => {
//         testComponent.dateTimePicker.disabled = false;
//         testComponent.dateTimePickerInput.disabled = true;
//         fixture.detectChanges();
//
//         expect(document.querySelector('.cdk-overlay-pane')).toBeNull();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//
//         expect(document.querySelector('.cdk-overlay-pane')).not.toBeNull();
//       });
//
//       it('should close popup when fn close is called', fakeAsync(() => {
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//         flush();
//
//         const popup = document.querySelector('.cdk-overlay-pane');
//         expect(popup).not.toBeNull();
//         expect(parseInt(getComputedStyle(popup).height, 10)).not.toBe(0);
//
//         testComponent.dateTimePicker.close();
//         fixture.detectChanges();
//         flush();
//
//         const newHeight = getComputedStyle(popup).height;
//         expect(newHeight).toBe('');
//       }));
//
//       it('should close the popup when pressing ESCAPE', fakeAsync(() => {
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//         flush();
//
//         expect(testComponent.dateTimePicker.opened).toBe(
//           true,
//           'Expected dateTimePicker to be open.',
//         );
//
//         dispatchKeyboardEvent(document.body, 'keydown', ESCAPE);
//         fixture.detectChanges();
//         flush();
//
//         expect(testComponent.dateTimePicker.opened).toBe(
//           false,
//           'Expected dateTimePicker to be closed.',
//         );
//       }));
//
//       it('should close dialog when fn close is called', fakeAsync(() => {
//         testComponent.pickerMode = 'dialog';
//         fixture.detectChanges();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//         flush();
//
//         expect(document.querySelector('owl-dialog-container')).not.toBeNull();
//
//         testComponent.dateTimePicker.close();
//         fixture.detectChanges();
//         flush();
//
//         expect(document.querySelector('owl-dialog-container')).toBeNull();
//       }));
//
//       // it('should close popup panel when cancel button clicked', fakeAsync(() => {
//       //   testComponent.dateTimePicker.open();
//       //   fixture.detectChanges();
//       //   flush();
//       //   expect(testComponent.dateTimePicker.opened).toBe(
//       //     true,
//       //     'Expected dateTimePicker to be opened.'
//       //   );
//       //
//       //   const containerDebugElement = fixture.debugElement.query(
//       //     By.directive(OwlDateTimeContainerComponent)
//       //   );
//       //   containerElement = containerDebugElement.nativeElement;
//       //
//       //   const btns = containerElement.querySelectorAll(
//       //     '.owl-dt-container-control-button'
//       //   );
//       //   dispatchMouseEvent(btns[0], 'click'); // 'Cancel' button
//       //   fixture.detectChanges();
//       //   flush();
//       //
//       //   expect(testComponent.dateTimePicker.opened).toBe(
//       //     false,
//       //     'Expected dateTimePicker to be closed.'
//       //   );
//       // }));
//
//       // it('should close popup panel and not update input value when cancel button clicked', fakeAsync(() => {
//       //   testComponent.dateTimePicker.open();
//       //   fixture.detectChanges();
//       //   flush();
//       //   expect(testComponent.dateTimePicker.opened).toBe(
//       //     true,
//       //     'Expected dateTimePicker to be opened.'
//       //   );
//       //
//       //   const containerDebugElement = fixture.debugElement.query(
//       //     By.directive(OwlDateTimeContainerComponent)
//       //   );
//       //   containerElement = containerDebugElement.nativeElement;
//       //
//       //   const monthCell = containerElement.querySelector(
//       //     '[aria-label="January 2, 2020"]'
//       //   );
//       //   (monthCell as HTMLElement).click();
//       //   fixture.detectChanges();
//       //
//       //   const btns = containerElement.querySelectorAll(
//       //     '.owl-dt-container-control-button'
//       //   );
//       //   dispatchMouseEvent(btns[0], 'click'); // 'Cancel' button
//       //   fixture.detectChanges();
//       //   flush();
//       //
//       //   expect(testComponent.dateTimePicker.opened).toBe(
//       //     false,
//       //     'Expected dateTimePicker to be closed.'
//       //   );
//       //   expect(testComponent.dateTimePickerInput.value).toEqual(
//       //     new Date(2020, JAN, 1)
//       //   ); // not update to clicked value
//       // }));
//
//       // it('should update input value to pickerMoment value and close popup panel when set button clicked', fakeAsync(() => {
//       //   testComponent.dateTimePicker.open();
//       //   fixture.detectChanges();
//       //   flush();
//       //   expect(testComponent.dateTimePicker.opened).toBe(
//       //     true,
//       //     'Expected dateTimePicker to be opened.'
//       //   );
//       //
//       //   const containerDebugElement = fixture.debugElement.query(
//       //     By.directive(OwlDateTimeContainerComponent)
//       //   );
//       //   containerElement = containerDebugElement.nativeElement;
//       //   expect(
//       //     containerDebugElement.componentInstance.pickerMoment
//       //   ).toEqual(new Date(2020, JAN, 1));
//       //
//       //   const btns = containerElement.querySelectorAll(
//       //     '.owl-dt-container-control-button'
//       //   );
//       //   dispatchMouseEvent(btns[1], 'click'); // 'Set' button
//       //   fixture.detectChanges();
//       //   flush();
//       //
//       //   expect(testComponent.dateTimePicker.opened).toBe(
//       //     false,
//       //     'Expected dateTimePicker to be closed.'
//       //   );
//       //   expect(testComponent.dateTimePickerInput.value).toEqual(
//       //     new Date(2020, JAN, 1)
//       //   );
//       // }));
//
//       // it('should update input value to clicked date value and close popup panel when set button clicked', fakeAsync(() => {
//       //   testComponent.dateTimePicker.open();
//       //   fixture.detectChanges();
//       //   flush();
//       //   expect(testComponent.dateTimePicker.opened).toBe(
//       //     true,
//       //     'Expected dateTimePicker to be opened.'
//       //   );
//       //
//       //   const containerDebugElement = fixture.debugElement.query(
//       //     By.directive(OwlDateTimeContainerComponent)
//       //   );
//       //   containerElement = containerDebugElement.nativeElement;
//       //   expect(
//       //     containerDebugElement.componentInstance.pickerMoment
//       //   ).toEqual(new Date(2020, JAN, 1));
//       //
//       //   const monthCell = containerElement.querySelector(
//       //     '[aria-label="January 2, 2020"]'
//       //   );
//       //   (monthCell as HTMLElement).click();
//       //   fixture.detectChanges();
//       //
//       //   const btns = containerElement.querySelectorAll(
//       //     '.owl-dt-container-control-button'
//       //   );
//       //   dispatchMouseEvent(btns[1], 'click'); // 'Set' button
//       //   fixture.detectChanges();
//       //   flush();
//       //
//       //   expect(testComponent.dateTimePicker.opened).toBe(
//       //     false,
//       //     'Expected dateTimePicker to be closed.'
//       //   );
//       //   expect(testComponent.dateTimePickerInput.value).toEqual(
//       //     new Date(2020, JAN, 2)
//       //   );
//       // }));
//
//       it('should set startAt fallback to input value', () => {
//         expect(testComponent.dateTimePicker.startAt).toEqual(new Date(2020, JAN, 1));
//       });
//
//       it('input should aria-owns owl-date-time-container after opened in popup mode', fakeAsync(() => {
//         const inputEl = fixture.debugElement.query(By.css('input')).nativeElement;
//         expect(inputEl.getAttribute('aria-owns')).toBeNull();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         const ownedElementId = inputEl.getAttribute('aria-owns');
//         expect(ownedElementId).not.toBeNull();
//
//         const ownedElement = document.getElementById(ownedElementId);
//         expect(ownedElement).not.toBeNull();
//         expect((ownedElement as Element).tagName.toLowerCase()).toBe(
//           'owl-date-time-container',
//         );
//       }));
//
//       it('input should aria-owns owl-date-time-container after opened in dialog mode', fakeAsync(() => {
//         testComponent.pickerMode = 'dialog';
//         fixture.detectChanges();
//
//         const inputEl = fixture.debugElement.query(By.css('input')).nativeElement;
//         expect(inputEl.getAttribute('aria-owns')).toBeNull();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         const ownedElementId = inputEl.getAttribute('aria-owns');
//         expect(ownedElementId).not.toBeNull();
//
//         const ownedElement = document.getElementById(ownedElementId);
//         expect(ownedElement).not.toBeNull();
//         expect((ownedElement as Element).tagName.toLowerCase()).toBe(
//           'owl-date-time-container',
//         );
//       }));
//
//       it('should close the picker popup panel using ALT + UP_ARROW', fakeAsync(() => {
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//         flush();
//
//         expect(testComponent.dateTimePicker.opened).toBe(true);
//
//         const event = createKeyboardEvent('keydown', UP_ARROW);
//         Object.defineProperty(event, 'altKey', { get: () => true });
//
//         dispatchEvent(document.body, event);
//         fixture.detectChanges();
//         flush();
//
//         expect(testComponent.dateTimePicker.opened).toBe(false);
//       }));
//
//       describe('with only calendar', () => {
//         beforeEach(() => {
//           testComponent.pickerType = 'calendar';
//           fixture.detectChanges();
//         });
//
//         it('should initialize with correct value shown in input', () => {
//           if (SUPPORTS_INTL) {
//             expect(fixture.nativeElement.querySelector('input').value).toBe('1/1/2020');
//           }
//         });
//
//         it('should NOT have any container control button', fakeAsync(() => {
//           testComponent.dateTimePicker.open();
//           fixture.detectChanges();
//           flush();
//           expect(testComponent.dateTimePicker.opened).toBe(
//             true,
//             'Expected dateTimePicker to be opened.',
//           );
//
//           const containerDebugElement = fixture.debugElement.query(
//             By.directive(OwlDateTimeContainerComponent),
//           );
//           containerElement = containerDebugElement.nativeElement;
//           const btns = containerElement.querySelectorAll(
//             '.owl-dt-container-control-button',
//           );
//
//           expect(btns.length).toBe(0);
//         }));
//
//         it('should update input value to clicked date value and close popup panel when date cell is clicked', fakeAsync(() => {
//           testComponent.dateTimePicker.open();
//           fixture.detectChanges();
//           flush();
//           expect(testComponent.dateTimePicker.opened).toBe(
//             true,
//             'Expected dateTimePicker to be opened.',
//           );
//
//           const containerDebugElement = fixture.debugElement.query(
//             By.directive(OwlDateTimeContainerComponent),
//           );
//           containerElement = containerDebugElement.nativeElement;
//           expect(containerDebugElement.componentInstance.pickerMoment).toEqual(
//             new Date(2020, JAN, 1),
//           );
//
//           const dateCell = containerElement.querySelector(
//             '[aria-label="January 2, 2020"]',
//           );
//           dispatchMouseEvent(dateCell, 'click');
//           fixture.detectChanges();
//           flush();
//
//           expect(testComponent.dateTimePicker.opened).toBe(
//             false,
//             'Expected dateTimePicker to be closed.',
//           );
//           expect(testComponent.dateTimePickerInput.value).toEqual(new Date(2020, JAN, 2));
//         }));
//
//         it('should update input value to clicked date value and close popup panel when date cell is clicked via pressing enter', fakeAsync(() => {
//           testComponent.dateTimePicker.open();
//           fixture.detectChanges();
//           flush();
//           expect(testComponent.dateTimePicker.opened).toBe(
//             true,
//             'Expected dateTimePicker to be opened.',
//           );
//
//           const containerDebugElement = fixture.debugElement.query(
//             By.directive(OwlDateTimeContainerComponent),
//           );
//           containerElement = containerDebugElement.nativeElement;
//           expect(containerDebugElement.componentInstance.pickerMoment).toEqual(
//             new Date(2020, JAN, 1),
//           );
//
//           const calendarBodyEl = containerElement.querySelector('.owl-dt-calendar-body');
//
//           dispatchKeyboardEvent(calendarBodyEl, 'keydown', RIGHT_ARROW);
//           fixture.detectChanges();
//           flush();
//           dispatchKeyboardEvent(calendarBodyEl, 'keydown', ENTER);
//           fixture.detectChanges();
//           flush();
//
//           expect(testComponent.dateTimePicker.opened).toBe(
//             false,
//             'Expected dateTimePicker to be closed.',
//           );
//           expect(testComponent.dateTimePickerInput.value).toEqual(new Date(2020, JAN, 2));
//         }));
//
//         it('should close popup panel when click on the selected date', fakeAsync(() => {
//           testComponent.dateTimePicker.open();
//           fixture.detectChanges();
//           flush();
//           expect(testComponent.dateTimePicker.opened).toBe(
//             true,
//             'Expected dateTimePicker to be opened.',
//           );
//
//           const containerDebugElement = fixture.debugElement.query(
//             By.directive(OwlDateTimeContainerComponent),
//           );
//           containerElement = containerDebugElement.nativeElement;
//           expect(containerDebugElement.componentInstance.pickerMoment).toEqual(
//             new Date(2020, JAN, 1),
//           );
//           expect(testComponent.dateTimePicker.selected).toEqual(new Date(2020, JAN, 1));
//
//           const dateCell = containerElement.querySelector(
//             '[aria-label="January 1, 2020"]',
//           );
//           dispatchMouseEvent(dateCell, 'click');
//           fixture.detectChanges();
//           flush();
//
//           expect(testComponent.dateTimePicker.opened).toBe(
//             false,
//             'Expected dateTimePicker to be closed.',
//           );
//           expect(testComponent.dateTimePickerInput.value).toEqual(new Date(2020, JAN, 1));
//         }));
//       });
//
//       describe('with only timer', () => {
//         beforeEach(() => {
//           testComponent.pickerType = 'timer';
//           fixture.detectChanges();
//         });
//
//         it('should initialize with correct value shown in input', () => {
//           if (SUPPORTS_INTL) {
//             expect(fixture.nativeElement.querySelector('input').value).toBe('12:00 AM');
//           }
//         });
//
//         // it('should have container control buttons', fakeAsync(() => {
//         //   testComponent.dateTimePicker.open();
//         //   fixture.detectChanges();
//         //   flush();
//         //   expect(testComponent.dateTimePicker.opened).toBe(
//         //     true,
//         //     'Expected dateTimePicker to be opened.'
//         //   );
//         //
//         //   const containerDebugElement = fixture.debugElement.query(
//         //     By.directive(OwlDateTimeContainerComponent)
//         //   );
//         //   containerElement = containerDebugElement.nativeElement;
//         //   const btns = containerElement.querySelectorAll(
//         //     '.owl-dt-container-control-button'
//         //   );
//         //
//         //   expect(btns.length).toBe(2);
//         // }));
//       });
//     });
//
//     describe('range DateTimePicker', () => {
//       let fixture: ComponentFixture<RangeDateTimePickerComponent>;
//       let testComponent: RangeDateTimePickerComponent;
//       let containerElement: HTMLElement;
//
//       beforeEach(fakeAsync(() => {
//         fixture = createComponent(RangeDateTimePickerComponent, [
//           OwlNativeDateTimeModule,
//         ]);
//         fixture.detectChanges();
//         testComponent = fixture.componentInstance;
//       }));
//
//       afterEach(fakeAsync(() => {
//         testComponent.dateTimePicker.close();
//         fixture.detectChanges();
//         flush();
//       }));
//
//       it('should initialize with correct value shown in input', () => {
//         if (SUPPORTS_INTL) {
//           expect(fixture.nativeElement.querySelector('input').value).toBe(
//             '1/1/2020, 12:00 AM - 2/1/2020, 12:00 AM',
//           );
//         }
//       });
//
//       it('should have default activeSelectedIndex value as 0', () => {
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//
//         const containerDebugElement = fixture.debugElement.query(
//           By.directive(OwlDateTimeContainerComponent),
//         );
//         expect(containerDebugElement.componentInstance.activeSelectedIndex).toBe(0);
//       });
//
//       it('clicking the dateCell should set the rangeFrom value when both rangeFrom and rangeTo had NO value', fakeAsync(() => {
//         testComponent.dates = [];
//         fixture.detectChanges();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//         flush();
//
//         expect(testComponent.dateTimePicker.selecteds.length).toBe(0);
//
//         const containerDebugElement = fixture.debugElement.query(
//           By.directive(OwlDateTimeContainerComponent),
//         );
//         containerElement = containerDebugElement.nativeElement;
//
//         const dateCell = containerElement.querySelector('[aria-label="January 2, 2020"]');
//         dispatchMouseEvent(dateCell, 'click');
//         fixture.detectChanges();
//         flush();
//
//         expect(containerDebugElement.componentInstance.activeSelectedIndex).toBe(0);
//         expect(testComponent.dateTimePicker.selecteds.length).toBe(2);
//         expect(testComponent.dateTimePicker.selecteds[0]).toEqual(new Date(2020, JAN, 2));
//         expect(testComponent.dateTimePicker.selecteds[1]).toBe(null);
//       }));
//
//       it('clicking the dateCell should set the rangeFrom value when both rangeFrom and rangeTo already had value', fakeAsync(() => {
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//         flush();
//
//         expect(testComponent.dateTimePicker.selecteds.length).toBe(2);
//
//         const containerDebugElement = fixture.debugElement.query(
//           By.directive(OwlDateTimeContainerComponent),
//         );
//         containerElement = containerDebugElement.nativeElement;
//
//         const dateCell = containerElement.querySelector('[aria-label="January 2, 2020"]');
//         dispatchMouseEvent(dateCell, 'click');
//         fixture.detectChanges();
//         flush();
//
//         expect(containerDebugElement.componentInstance.activeSelectedIndex).toBe(0);
//         expect(testComponent.dateTimePicker.selecteds.length).toBe(2);
//         expect(testComponent.dateTimePicker.selecteds[0]).toEqual(new Date(2020, JAN, 2));
//         expect(testComponent.dateTimePicker.selecteds[1]).toBe(null);
//       }));
//
//       it('clicking the dateCell should set the rangeFrom value when dateCell value is before the old rangeFrom value', fakeAsync(() => {
//         testComponent.dates = [new Date(2020, JAN, 2), null];
//         fixture.detectChanges();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//         flush();
//
//         expect(testComponent.dateTimePicker.selecteds.length).toBe(2);
//
//         const containerDebugElement = fixture.debugElement.query(
//           By.directive(OwlDateTimeContainerComponent),
//         );
//         containerElement = containerDebugElement.nativeElement;
//
//         const dateCell = containerElement.querySelector('[aria-label="January 1, 2020"]');
//         dispatchMouseEvent(dateCell, 'click');
//         fixture.detectChanges();
//         flush();
//
//         expect(containerDebugElement.componentInstance.activeSelectedIndex).toBe(0);
//         expect(testComponent.dateTimePicker.selecteds.length).toBe(2);
//         expect(testComponent.dateTimePicker.selecteds[0]).toEqual(new Date(2020, JAN, 1));
//         expect(testComponent.dateTimePicker.selecteds[1]).toBe(null);
//       }));
//
//       it('clicking the dateCell should set the rangeTo value when rangeFrom already had value', fakeAsync(() => {
//         testComponent.dates = [new Date(2020, JAN, 2), null];
//         fixture.detectChanges();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//         flush();
//
//         expect(testComponent.dateTimePicker.selecteds.length).toBe(2);
//
//         const containerDebugElement = fixture.debugElement.query(
//           By.directive(OwlDateTimeContainerComponent),
//         );
//         containerElement = containerDebugElement.nativeElement;
//
//         const dateCell = containerElement.querySelector('[aria-label="January 3, 2020"]');
//         dispatchMouseEvent(dateCell, 'click');
//         fixture.detectChanges();
//         flush();
//
//         expect(containerDebugElement.componentInstance.activeSelectedIndex).toBe(1);
//         expect(testComponent.dateTimePicker.selecteds.length).toBe(2);
//         expect(testComponent.dateTimePicker.selecteds[0]).toEqual(new Date(2020, JAN, 2));
//         expect(testComponent.dateTimePicker.selecteds[1]).toEqual(new Date(2020, JAN, 3));
//       }));
//
//       it('if startAt value is set, the start time value should be shown in the rangeTo calendar start time', fakeAsync(() => {
//         testComponent.startAt = new Date('1/19/2020, 09:33 AM');
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//         flush();
//
//         const containerDebugElement = fixture.debugElement.query(
//           By.directive(OwlDateTimeContainerComponent),
//         );
//         containerElement = containerDebugElement.nativeElement;
//         const timeCells =
//           containerElement.querySelectorAll<HTMLInputElement>('.owl-dt-timer-input');
//
//         expect(timeCells[0].value).toEqual('09');
//         expect(timeCells[1].value).toEqual('33');
//       }));
//
//       it('if endAt value is set, the end time value should be shown in the rangeTo calendar end time', fakeAsync(() => {
//         testComponent.dates = [new Date(2020, JAN, 2), null];
//         testComponent.endAt = new Date('1/19/2020, 10:55 PM');
//         fixture.detectChanges();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//         flush();
//
//         const containerDebugElement = fixture.debugElement.query(
//           By.directive(OwlDateTimeContainerComponent),
//         );
//         containerElement = containerDebugElement.nativeElement;
//         const dateCell = containerElement.querySelector(
//           '[aria-label="January 20, 2020"]',
//         );
//         dispatchMouseEvent(dateCell, 'click');
//         fixture.detectChanges();
//         flush();
//
//         const timeCells =
//           containerElement.querySelectorAll<HTMLInputElement>('.owl-dt-timer-input');
//
//         expect(timeCells[0].value).toEqual('22');
//         expect(timeCells[1].value).toEqual('55');
//       }));
//
//       it('auto select previous time if dates is selected', fakeAsync(() => {
//         testComponent.dates = [
//           new Date('1/19/2020, 09:33 AM'),
//           new Date('1/22/2020, 10:44 PM'),
//         ];
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//
//         const containerDebugElement = fixture.debugElement.query(
//           By.directive(OwlDateTimeContainerComponent),
//         );
//         containerElement = containerDebugElement.nativeElement;
//         const dateCell = containerElement.querySelector(
//           '[aria-label="January 20, 2020"]',
//         );
//         dispatchMouseEvent(dateCell, 'click');
//         fixture.detectChanges();
//         flush();
//
//         const timeInput =
//           containerElement.querySelectorAll<HTMLInputElement>('.owl-dt-timer-input');
//
//         expect(timeInput[0].value).toEqual('09');
//         expect(timeInput[1].value).toEqual('33');
//       }));
//
//       it('should have the container info row', () => {
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//
//         const containerDebugElement = fixture.debugElement.query(
//           By.directive(OwlDateTimeContainerComponent),
//         );
//         containerElement = containerDebugElement.nativeElement;
//
//         const infoRow = containerElement.querySelector('.owl-dt-container-info');
//
//         expect(infoRow).toBeTruthy();
//       });
//
//       it('should set the activeSelectedIndex via clicking the info row radio', fakeAsync(() => {
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//
//         const containerDebugElement = fixture.debugElement.query(
//           By.directive(OwlDateTimeContainerComponent),
//         );
//         containerElement = containerDebugElement.nativeElement;
//
//         const radioBtns = containerElement.querySelectorAll('.owl-dt-container-range');
//
//         for (let i = 0; i < radioBtns.length; i++) {
//           dispatchMouseEvent(radioBtns[i], 'click');
//           fixture.detectChanges();
//           flush();
//
//           expect(containerDebugElement.componentInstance.activeSelectedIndex).toBe(i);
//         }
//       }));
//
//       describe('with only calendar', () => {
//         beforeEach(() => {
//           testComponent.pickerType = 'calendar';
//           fixture.detectChanges();
//         });
//
//         it('should initialize with correct value shown in input', () => {
//           if (SUPPORTS_INTL) {
//             expect(fixture.nativeElement.querySelector('input').value).toBe(
//               '1/1/2020 - 2/1/2020',
//             );
//           }
//         });
//
//         it('should NOT close the dateTimePicker popup panel when only the rangeFrom value is selected', fakeAsync(() => {
//           testComponent.dates = [];
//           fixture.detectChanges();
//
//           testComponent.dateTimePicker.open();
//           fixture.detectChanges();
//           flush();
//
//           expect(testComponent.dateTimePicker.selecteds.length).toBe(0);
//
//           const containerDebugElement = fixture.debugElement.query(
//             By.directive(OwlDateTimeContainerComponent),
//           );
//           containerElement = containerDebugElement.nativeElement;
//
//           const dateCell = containerElement.querySelector(
//             '[aria-label="January 2, 2020"]',
//           );
//           dispatchMouseEvent(dateCell, 'click');
//           fixture.detectChanges();
//           flush();
//
//           expect(testComponent.dateTimePicker.opened).toBe(
//             true,
//             'Expected dateTimePicker to be opened.',
//           );
//         }));
//
//         it('should close the dateTimePicker popup panel when both the rangeFrom and the rangeTo value are selected', fakeAsync(() => {
//           testComponent.dates = [];
//           fixture.detectChanges();
//
//           testComponent.dateTimePicker.open();
//           fixture.detectChanges();
//           flush();
//
//           expect(testComponent.dateTimePicker.selecteds.length).toBe(0);
//
//           const containerDebugElement = fixture.debugElement.query(
//             By.directive(OwlDateTimeContainerComponent),
//           );
//           containerElement = containerDebugElement.nativeElement;
//
//           let dateCell = containerElement.querySelector('[aria-label="January 2, 2020"]');
//           dispatchMouseEvent(dateCell, 'click');
//           fixture.detectChanges();
//           flush();
//
//           dateCell = containerElement.querySelector('[aria-label="January 3, 2020"]');
//           dispatchMouseEvent(dateCell, 'click');
//           fixture.detectChanges();
//           flush();
//
//           expect(testComponent.dateTimePicker.selecteds.length).toBe(2);
//           expect(testComponent.dateTimePicker.opened).toBe(
//             false,
//             'Expected dateTimePicker to be closed.',
//           );
//         }));
//       });
//     });
//
//     describe('DateTimePicker with too many inputs', () => {
//       it('should throw when multiple inputs registered', fakeAsync(() => {
//         const fixture = createComponent(MultiInputDateTimePickerComponent, [
//           OwlNativeDateTimeModule,
//         ]);
//         expect(() => fixture.detectChanges()).toThrow();
//       }));
//     });
//
//     describe('DateTimePicker with no input', () => {
//       let fixture: ComponentFixture<NoInputDateTimePickerComponent>;
//       let testComponent: NoInputDateTimePickerComponent;
//
//       beforeEach(fakeAsync(() => {
//         fixture = createComponent(NoInputDateTimePickerComponent, [
//           OwlNativeDateTimeModule,
//         ]);
//         fixture.detectChanges();
//
//         testComponent = fixture.componentInstance;
//       }));
//
//       afterEach(fakeAsync(() => {
//         testComponent.dateTimePicker.close();
//         fixture.detectChanges();
//       }));
//
//       it('should NOT throw when accessing disabled property', () => {
//         expect(() => testComponent.dateTimePicker.disabled).not.toThrow();
//       });
//
//       it('should throw when opened with no registered inputs', fakeAsync(() => {
//         expect(() => testComponent.dateTimePicker.open()).toThrow();
//       }));
//     });
//
//     describe('DateTimePicker with startAt', () => {
//       let fixture: ComponentFixture<DateTimePickerWithStartAtComponent>;
//       let testComponent: DateTimePickerWithStartAtComponent;
//
//       beforeEach(fakeAsync(() => {
//         fixture = createComponent(DateTimePickerWithStartAtComponent, [
//           OwlNativeDateTimeModule,
//         ]);
//         fixture.detectChanges();
//
//         testComponent = fixture.componentInstance;
//       }));
//
//       afterEach(fakeAsync(() => {
//         testComponent.dateTimePicker.close();
//         fixture.detectChanges();
//       }));
//
//       it('should override input value by explicit startAt', () => {
//         expect(testComponent.dateTimePicker.startAt).toEqual(new Date(2010, JAN, 1));
//       });
//     });
//
//     describe('DateTimePicker with startView', () => {
//       let fixture: ComponentFixture<DateTimePickerWithStartViewComponent>;
//       let testComponent: DateTimePickerWithStartViewComponent;
//       let containerDebugElement;
//       let containerElement;
//
//       beforeEach(() => {
//         fixture = createComponent(DateTimePickerWithStartViewComponent, [
//           OwlNativeDateTimeModule,
//         ]);
//         fixture.detectChanges();
//
//         testComponent = fixture.componentInstance;
//       });
//
//       afterEach(() => {
//         testComponent.dateTimePicker.close();
//         fixture.detectChanges();
//       });
//
//       describe('set to year', () => {
//         beforeEach(() => {
//           testComponent.startView = 'year';
//           fixture.detectChanges();
//         });
//
//         it('should start at the year view', () => {
//           testComponent.dateTimePicker.open();
//           fixture.detectChanges();
//
//           containerDebugElement = fixture.debugElement.query(
//             By.directive(OwlDateTimeContainerComponent),
//           );
//           containerElement = containerDebugElement.nativeElement;
//           const yearTable = containerElement.querySelector(
//             'table.owl-dt-calendar-year-table',
//           );
//           expect(yearTable).toBeTruthy();
//         });
//
//         it('should fire monthSelected when user selects calendar month in year view', fakeAsync(() => {
//           spyOn(testComponent, 'onMonthSelection');
//           expect(testComponent.onMonthSelection).not.toHaveBeenCalled();
//
//           testComponent.dateTimePicker.open();
//           fixture.detectChanges();
//
//           containerDebugElement = fixture.debugElement.query(
//             By.directive(OwlDateTimeContainerComponent),
//           );
//           containerElement = containerDebugElement.nativeElement;
//           const cells = containerElement.querySelectorAll('.owl-dt-calendar-cell');
//
//           dispatchMouseEvent(cells[0], 'click');
//           fixture.detectChanges();
//           flush();
//
//           expect(testComponent.onMonthSelection).toHaveBeenCalled();
//         }));
//       });
//
//       describe('set to multi-years', () => {
//         beforeEach(() => {
//           testComponent.startView = 'multi-years';
//           fixture.detectChanges();
//         });
//
//         it('should start at the multi-years view', () => {
//           testComponent.dateTimePicker.open();
//           fixture.detectChanges();
//
//           containerDebugElement = fixture.debugElement.query(
//             By.directive(OwlDateTimeContainerComponent),
//           );
//           containerElement = containerDebugElement.nativeElement;
//           const multiYearTable = containerElement.querySelector(
//             'table.owl-dt-calendar-multi-year-table',
//           );
//           expect(multiYearTable).toBeTruthy();
//         });
//
//         it('should fire yearSelected when user selects calendar year in multi-years view', fakeAsync(() => {
//           spyOn(testComponent, 'onYearSelection');
//           expect(testComponent.onYearSelection).not.toHaveBeenCalled();
//
//           testComponent.dateTimePicker.open();
//           fixture.detectChanges();
//
//           containerDebugElement = fixture.debugElement.query(
//             By.directive(OwlDateTimeContainerComponent),
//           );
//           containerElement = containerDebugElement.nativeElement;
//           const cells = containerElement.querySelectorAll('.owl-dt-calendar-cell');
//
//           dispatchMouseEvent(cells[0], 'click');
//           fixture.detectChanges();
//           flush();
//
//           expect(testComponent.onYearSelection).toHaveBeenCalled();
//         }));
//       });
//     });
//
//     describe('DateTimePicker with NgModel', () => {
//       let fixture: ComponentFixture<DateTimePickerWithNgModelComponent>;
//       let testComponent: DateTimePickerWithNgModelComponent;
//
//       beforeEach(fakeAsync(() => {
//         fixture = createComponent(DateTimePickerWithNgModelComponent, [
//           OwlNativeDateTimeModule,
//         ]);
//         fixture.detectChanges();
//         fixture.whenStable().then(() => {
//           fixture.detectChanges();
//
//           testComponent = fixture.componentInstance;
//         });
//       }));
//
//       afterEach(fakeAsync(() => {
//         testComponent.dateTimePicker.close();
//         fixture.detectChanges();
//         flush();
//       }));
//
//       it('should update dateTimePicker when model changes', fakeAsync(() => {
//         expect(testComponent.dateTimePickerInput.value).toBeNull();
//         expect(testComponent.dateTimePicker.selected).toBeNull();
//
//         const selected = new Date(2017, JAN, 1);
//         testComponent.moment = selected;
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         expect(testComponent.dateTimePickerInput.value).toEqual(selected);
//         expect(testComponent.dateTimePicker.selected).toEqual(selected);
//       }));
//
//       it('should update model when date is selected', fakeAsync(() => {
//         expect(testComponent.moment).toBeNull();
//         expect(testComponent.dateTimePickerInput.value).toBeNull();
//
//         const selected = new Date(2017, JAN, 1);
//         testComponent.dateTimePicker.select(selected);
//         fixture.detectChanges();
//         flush();
//         testComponent.dateTimePicker.confirmSelect();
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         expect(testComponent.moment).toEqual(selected);
//         expect(testComponent.dateTimePickerInput.value).toEqual(selected);
//       }));
//
//       it('should mark input dirty after input event', () => {
//         const inputEl = fixture.debugElement.query(By.css('input')).nativeElement;
//
//         expect(inputEl.classList).toContain('ng-pristine');
//
//         inputEl.value = '2001-01-01';
//         dispatchFakeEvent(inputEl, 'input');
//         fixture.detectChanges();
//
//         expect(inputEl.classList).toContain('ng-dirty');
//       });
//
//       it('should mark input dirty after date selected', fakeAsync(() => {
//         const inputEl = fixture.debugElement.query(By.css('input')).nativeElement;
//
//         expect(inputEl.classList).toContain('ng-pristine');
//
//         testComponent.dateTimePicker.select(new Date(2017, JAN, 1));
//         fixture.detectChanges();
//         flush();
//         testComponent.dateTimePicker.confirmSelect();
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         expect(inputEl.classList).toContain('ng-dirty');
//       }));
//
//       it('should not mark dirty after model change', fakeAsync(() => {
//         const inputEl = fixture.debugElement.query(By.css('input')).nativeElement;
//
//         expect(inputEl.classList).toContain('ng-pristine');
//
//         testComponent.moment = new Date(2017, JAN, 1);
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         expect(inputEl.classList).toContain('ng-pristine');
//       }));
//
//       it('should mark input touched on blur', () => {
//         const inputEl = fixture.debugElement.query(By.css('input')).nativeElement;
//
//         expect(inputEl.classList).toContain('ng-untouched');
//
//         dispatchFakeEvent(inputEl, 'focus');
//         fixture.detectChanges();
//
//         expect(inputEl.classList).toContain('ng-untouched');
//
//         dispatchFakeEvent(inputEl, 'blur');
//         fixture.detectChanges();
//
//         expect(inputEl.classList).toContain('ng-touched');
//       });
//
//       it('should not reformat invalid dates on blur', () => {
//         const inputEl = fixture.debugElement.query(By.css('input')).nativeElement;
//
//         inputEl.value = 'very-valid-date';
//         dispatchFakeEvent(inputEl, 'input');
//         fixture.detectChanges();
//
//         dispatchFakeEvent(inputEl, 'blur');
//         fixture.detectChanges();
//
//         expect(inputEl.value).toBe('very-valid-date');
//       });
//
//       it('should mark input touched on calendar selection', fakeAsync(() => {
//         const inputEl = fixture.debugElement.query(By.css('input')).nativeElement;
//
//         expect(inputEl.classList).toContain('ng-untouched');
//
//         testComponent.dateTimePicker.select(new Date(2017, JAN, 1));
//         fixture.detectChanges();
//         flush();
//         testComponent.dateTimePicker.confirmSelect();
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         expect(inputEl.classList).toContain('ng-touched');
//       }));
//
//       describe('with range mode', () => {
//         beforeEach(() => {
//           testComponent.selectMode = 'range';
//           fixture.detectChanges();
//           expect(testComponent.dateTimePicker.selectMode).toBe('range');
//         });
//
//         it('should update dateTimePicker when model changes', fakeAsync(() => {
//           expect(testComponent.dateTimePickerInput.values.length).toBe(0);
//           expect(testComponent.dateTimePicker.selecteds.length).toBe(0);
//
//           const from = new Date(2017, JAN, 1);
//           const to = new Date(2017, JAN, 3);
//           testComponent.moment = [from, to];
//           fixture.detectChanges();
//           flush();
//           fixture.detectChanges();
//
//           expect(testComponent.dateTimePickerInput.values.length).toBe(2);
//           expect(testComponent.dateTimePickerInput.values[0]).toEqual(from);
//           expect(testComponent.dateTimePickerInput.values[1]).toEqual(to);
//           expect(testComponent.dateTimePicker.selecteds.length).toBe(2);
//           expect(testComponent.dateTimePicker.selecteds[0]).toEqual(from);
//           expect(testComponent.dateTimePicker.selecteds[1]).toEqual(to);
//         }));
//
//         it('should update model when date is selected', fakeAsync(() => {
//           expect(testComponent.moment).toBeNull();
//           expect(testComponent.dateTimePickerInput.values.length).toBe(0);
//
//           const from = new Date(2017, JAN, 1);
//           const to = new Date(2017, JAN, 3);
//           testComponent.dateTimePicker.select([from, to]);
//           fixture.detectChanges();
//           flush();
//           testComponent.dateTimePicker.confirmSelect();
//           fixture.detectChanges();
//           flush();
//           fixture.detectChanges();
//
//           expect(testComponent.moment[0]).toEqual(from);
//           expect(testComponent.moment[1]).toEqual(to);
//           expect(testComponent.dateTimePickerInput.values.length).toBe(2);
//           expect(testComponent.dateTimePickerInput.values[0]).toEqual(from);
//           expect(testComponent.dateTimePickerInput.values[1]).toEqual(to);
//         }));
//       });
//
//       describe('with rangeFrom mode', () => {
//         beforeEach(() => {
//           testComponent.selectMode = 'rangeFrom';
//           fixture.detectChanges();
//           expect(testComponent.dateTimePicker.selectMode).toBe('rangeFrom');
//         });
//
//         it('should update dateTimePicker when model changes', fakeAsync(() => {
//           expect(testComponent.dateTimePickerInput.values.length).toBe(0);
//           expect(testComponent.dateTimePicker.selecteds.length).toBe(0);
//
//           const from = new Date(2017, JAN, 1);
//           testComponent.moment = [from];
//           fixture.detectChanges();
//           flush();
//           fixture.detectChanges();
//
//           expect(testComponent.dateTimePickerInput.values[0]).toEqual(from);
//           expect(testComponent.dateTimePickerInput.values[1]).toBeFalsy();
//           expect(testComponent.dateTimePicker.selecteds[0]).toEqual(from);
//           expect(testComponent.dateTimePicker.selecteds[1]).toBeFalsy();
//         }));
//
//         it('should only update fromValue when date is selected', fakeAsync(() => {
//           const from = new Date(2017, JAN, 1);
//           const to = new Date(2017, JAN, 3);
//           testComponent.moment = [from, to];
//           fixture.detectChanges();
//           flush();
//           fixture.detectChanges();
//
//           testComponent.dateTimePicker.open();
//           fixture.detectChanges();
//           flush();
//
//           const newSelectedFrom = new Date(2017, JAN, 2);
//           const containerDebugElement = fixture.debugElement.query(
//             By.directive(OwlDateTimeContainerComponent),
//           );
//           containerDebugElement.componentInstance.dateSelected(newSelectedFrom);
//           fixture.detectChanges();
//           flush();
//           testComponent.dateTimePicker.confirmSelect();
//           fixture.detectChanges();
//           flush();
//           fixture.detectChanges();
//
//           expect(testComponent.dateTimePicker.selecteds[0]).toEqual(newSelectedFrom);
//           expect(testComponent.dateTimePicker.selecteds[1]).toEqual(to);
//           expect(testComponent.dateTimePickerInput.values[0]).toEqual(newSelectedFrom);
//           expect(testComponent.dateTimePickerInput.values[1]).toEqual(to);
//           expect(testComponent.moment[0]).toEqual(newSelectedFrom);
//           expect(testComponent.moment[1]).toEqual(to);
//         }));
//
//         it('should update fromValue and set toValue to null when date is selected after toValue', fakeAsync(() => {
//           const from = new Date(2017, JAN, 1);
//           const to = new Date(2017, JAN, 3);
//           testComponent.moment = [from, to];
//           fixture.detectChanges();
//           flush();
//           fixture.detectChanges();
//
//           testComponent.dateTimePicker.open();
//           fixture.detectChanges();
//           flush();
//
//           const newSelectedFrom = new Date(2017, JAN, 4);
//           const containerDebugElement = fixture.debugElement.query(
//             By.directive(OwlDateTimeContainerComponent),
//           );
//           containerDebugElement.componentInstance.dateSelected(newSelectedFrom);
//           fixture.detectChanges();
//           flush();
//           testComponent.dateTimePicker.confirmSelect();
//           fixture.detectChanges();
//           flush();
//           fixture.detectChanges();
//
//           expect(testComponent.dateTimePicker.selecteds[0]).toEqual(newSelectedFrom);
//           expect(testComponent.dateTimePicker.selecteds[1]).toBeFalsy();
//           expect(testComponent.dateTimePickerInput.values[0]).toEqual(newSelectedFrom);
//           expect(testComponent.dateTimePickerInput.values[1]).toBeFalsy();
//           expect(testComponent.moment[0]).toEqual(newSelectedFrom);
//           expect(testComponent.moment[1]).toBeFalsy();
//         }));
//       });
//
//       describe('with rangeTo mode', () => {
//         beforeEach(() => {
//           testComponent.selectMode = 'rangeTo';
//           fixture.detectChanges();
//           expect(testComponent.dateTimePicker.selectMode).toBe('rangeTo');
//         });
//
//         it('should update dateTimePicker when model changes', fakeAsync(() => {
//           expect(testComponent.dateTimePickerInput.values.length).toBe(0);
//           expect(testComponent.dateTimePicker.selecteds.length).toBe(0);
//
//           const to = new Date(2017, JAN, 3);
//           testComponent.moment = [null, to];
//           fixture.detectChanges();
//           flush();
//           fixture.detectChanges();
//
//           expect(testComponent.dateTimePickerInput.values[0]).toBeFalsy();
//           expect(testComponent.dateTimePickerInput.values[1]).toEqual(to);
//           expect(testComponent.dateTimePicker.selecteds[0]).toBeFalsy();
//           expect(testComponent.dateTimePicker.selecteds[1]).toEqual(to);
//         }));
//
//         it('should only update toValue when date is selected', fakeAsync(() => {
//           const from = new Date(2017, JAN, 1);
//           const to = new Date(2017, JAN, 3);
//           testComponent.moment = [from, to];
//           fixture.detectChanges();
//           flush();
//           fixture.detectChanges();
//
//           testComponent.dateTimePicker.open();
//           fixture.detectChanges();
//           flush();
//
//           const newSelectedTo = new Date(2017, JAN, 4);
//           const containerDebugElement = fixture.debugElement.query(
//             By.directive(OwlDateTimeContainerComponent),
//           );
//           containerDebugElement.componentInstance.dateSelected(newSelectedTo);
//           fixture.detectChanges();
//           flush();
//           testComponent.dateTimePicker.confirmSelect();
//           fixture.detectChanges();
//           flush();
//           fixture.detectChanges();
//
//           expect(testComponent.dateTimePicker.selecteds[0]).toEqual(from);
//           expect(testComponent.dateTimePicker.selecteds[1]).toEqual(newSelectedTo);
//           expect(testComponent.dateTimePickerInput.values[0]).toEqual(from);
//           expect(testComponent.dateTimePickerInput.values[1]).toEqual(newSelectedTo);
//           expect(testComponent.moment[0]).toEqual(from);
//           expect(testComponent.moment[1]).toEqual(newSelectedTo);
//         }));
//
//         it('should update toValue and set fromValue to null when date is selected before fromValue', fakeAsync(() => {
//           const from = new Date(2017, JAN, 2);
//           const to = new Date(2017, JAN, 3);
//           testComponent.moment = [from, to];
//           fixture.detectChanges();
//           flush();
//           fixture.detectChanges();
//
//           testComponent.dateTimePicker.open();
//           fixture.detectChanges();
//           flush();
//
//           const newSelectedTo = new Date(2017, JAN, 1);
//           const containerDebugElement = fixture.debugElement.query(
//             By.directive(OwlDateTimeContainerComponent),
//           );
//           containerDebugElement.componentInstance.dateSelected(newSelectedTo);
//           fixture.detectChanges();
//           flush();
//           testComponent.dateTimePicker.confirmSelect();
//           fixture.detectChanges();
//           flush();
//           fixture.detectChanges();
//
//           expect(testComponent.dateTimePicker.selecteds[0]).toBeFalsy();
//           expect(testComponent.dateTimePicker.selecteds[1]).toEqual(newSelectedTo);
//           expect(testComponent.dateTimePickerInput.values[0]).toBeFalsy();
//           expect(testComponent.dateTimePickerInput.values[1]).toEqual(newSelectedTo);
//           expect(testComponent.moment[0]).toBeFalsy();
//           expect(testComponent.moment[1]).toEqual(newSelectedTo);
//         }));
//       });
//     });
//
//     describe('DateTimePicker with FormControl', () => {
//       let fixture: ComponentFixture<DateTimePickerWithFormControlComponent>;
//       let testComponent: DateTimePickerWithFormControlComponent;
//
//       beforeEach(fakeAsync(() => {
//         fixture = createComponent(DateTimePickerWithFormControlComponent, [
//           OwlNativeDateTimeModule,
//         ]);
//         fixture.detectChanges();
//
//         testComponent = fixture.componentInstance;
//       }));
//
//       afterEach(fakeAsync(() => {
//         testComponent.dateTimePicker.close();
//         fixture.detectChanges();
//       }));
//
//       it('should update dateTimePicker when formControl changes', () => {
//         expect(testComponent.dateTimePickerInput.value).toBeNull();
//         expect(testComponent.dateTimePicker.selected).toBeNull();
//
//         const selected = new Date(2017, JAN, 1);
//         testComponent.formControl.setValue(selected);
//         fixture.detectChanges();
//
//         expect(testComponent.dateTimePickerInput.value).toEqual(selected);
//         expect(testComponent.dateTimePicker.selected).toEqual(selected);
//       });
//
//       it('should update formControl when date is selected', fakeAsync(() => {
//         expect(testComponent.formControl.value).toBeNull();
//         expect(testComponent.dateTimePickerInput.value).toBeNull();
//
//         const selected = new Date(2017, JAN, 1);
//         testComponent.dateTimePicker.select(selected);
//         fixture.detectChanges();
//         flush();
//         testComponent.dateTimePicker.confirmSelect();
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         expect(testComponent.formControl.value).toEqual(selected);
//         expect(testComponent.dateTimePickerInput.value).toEqual(selected);
//       }));
//
//       it('should disable input when form control disabled', () => {
//         const inputEl = fixture.debugElement.query(By.css('input')).nativeElement;
//
//         expect(inputEl.disabled).toBe(false);
//
//         testComponent.formControl.disable();
//         fixture.detectChanges();
//
//         expect(inputEl.disabled).toBe(true);
//       });
//
//       it('should disable toggle when form control disabled', () => {
//         expect(testComponent.dateTimePickerToggle.disabled).toBe(false);
//
//         testComponent.formControl.disable();
//         fixture.detectChanges();
//
//         expect(testComponent.dateTimePickerToggle.disabled).toBe(true);
//       });
//     });
//
//     describe('DateTimePicker with owlDateTimeTrigger', () => {
//       let fixture: ComponentFixture<DateTimePickerWithTriggerComponent>;
//       let testComponent: DateTimePickerWithTriggerComponent;
//
//       beforeEach(fakeAsync(() => {
//         fixture = createComponent(DateTimePickerWithTriggerComponent, [
//           OwlNativeDateTimeModule,
//         ]);
//         fixture.detectChanges();
//
//         testComponent = fixture.componentInstance;
//       }));
//
//       afterEach(fakeAsync(() => {
//         testComponent.dateTimePicker.close();
//         fixture.detectChanges();
//         flush();
//       }));
//
//       it('should open the picker when trigger clicked', () => {
//         expect(document.querySelector('owl-date-time-container')).toBeNull();
//
//         const toggle = fixture.debugElement.query(By.css('button'));
//         dispatchMouseEvent(toggle.nativeElement, 'click');
//         fixture.detectChanges();
//
//         expect(document.querySelector('owl-date-time-container')).not.toBeNull();
//       });
//
//       it('should not open the picker when trigger clicked if dateTimePicker is disabled', () => {
//         testComponent.dateTimePicker.disabled = true;
//         fixture.detectChanges();
//         const toggle = fixture.debugElement.query(By.css('button')).nativeElement;
//
//         expect(toggle.classList).toContain('owl-dt-trigger-disabled');
//         expect(document.querySelector('owl-date-time-container')).toBeNull();
//
//         dispatchMouseEvent(toggle, 'click');
//         fixture.detectChanges();
//
//         expect(document.querySelector('owl-date-time-container')).toBeNull();
//       });
//
//       it('should not open the picker when trigger clicked if input is disabled', () => {
//         expect(testComponent.dateTimePicker.disabled).toBe(false);
//
//         testComponent.dateTimePickerInput.disabled = true;
//         fixture.detectChanges();
//         const toggle = fixture.debugElement.query(By.css('button')).nativeElement;
//
//         expect(toggle.classList).toContain('owl-dt-trigger-disabled');
//         expect(document.querySelector('owl-date-time-container')).toBeNull();
//
//         dispatchMouseEvent(toggle, 'click');
//         fixture.detectChanges();
//
//         expect(document.querySelector('owl-date-time-container')).toBeNull();
//       });
//     });
//
//     describe('DateTimePicker with min and max validation', () => {
//       let fixture: ComponentFixture<DateTimePickerWithMinAndMaxValidationComponent>;
//       let testComponent: DateTimePickerWithMinAndMaxValidationComponent;
//       let minMoment;
//       let maxMoment;
//
//       beforeEach(fakeAsync(() => {
//         fixture = createComponent(DateTimePickerWithMinAndMaxValidationComponent, [
//           OwlNativeDateTimeModule,
//         ]);
//         fixture.detectChanges();
//
//         testComponent = fixture.componentInstance;
//
//         minMoment = new Date(2010, JAN, 1, 0, 30, 30);
//         maxMoment = new Date(2020, JAN, 1, 23, 30, 30);
//         testComponent.min = minMoment;
//         testComponent.max = maxMoment;
//         fixture.detectChanges();
//       }));
//
//       afterEach(fakeAsync(() => {
//         testComponent.dateTimePicker.close();
//         fixture.detectChanges();
//         flush();
//       }));
//
//       it('should use min and max dates specified by the input', () => {
//         expect(testComponent.dateTimePicker.minDateTime).toEqual(minMoment);
//         expect(testComponent.dateTimePicker.maxDateTime).toEqual(maxMoment);
//       });
//
//       it('should mark invalid when value is before minMoment', fakeAsync(() => {
//         testComponent.date = new Date(2009, DEC, 31);
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         expect(
//           fixture.debugElement.query(By.css('input')).nativeElement.classList,
//         ).toContain('ng-invalid');
//       }));
//
//       it('should mark invalid when value is after maxMoment', fakeAsync(() => {
//         testComponent.date = new Date(2020, JAN, 2);
//         fixture.detectChanges();
//         flush();
//
//         fixture.detectChanges();
//
//         expect(
//           fixture.debugElement.query(By.css('input')).nativeElement.classList,
//         ).toContain('ng-invalid');
//       }));
//
//       it('should not mark invalid when value equals minMoment', fakeAsync(() => {
//         testComponent.date = new Date(minMoment);
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         expect(
//           fixture.debugElement.query(By.css('input')).nativeElement.classList,
//         ).not.toContain('ng-invalid');
//       }));
//
//       it('should not mark invalid when value equals maxMoment', fakeAsync(() => {
//         testComponent.date = new Date(maxMoment);
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         expect(
//           fixture.debugElement.query(By.css('input')).nativeElement.classList,
//         ).not.toContain('ng-invalid');
//       }));
//
//       it('should not mark invalid when value is between minMoment and maxMoment', fakeAsync(() => {
//         testComponent.date = new Date(2010, JAN, 2);
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         expect(
//           fixture.debugElement.query(By.css('input')).nativeElement.classList,
//         ).not.toContain('ng-invalid');
//       }));
//
//       it('should disable all decrease-time buttons when value equals minMoment', fakeAsync(() => {
//         testComponent.date = new Date(minMoment);
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//         const calendarDebugElement = fixture.debugElement.query(
//           By.directive(OwlDateTimeContainerComponent),
//         );
//         const calendarElement = calendarDebugElement.nativeElement;
//
//         const decreaseHourBtn = calendarElement.querySelector(
//           '[aria-label="Minus a hour"]',
//         );
//         const decreaseMinuteBtn = calendarElement.querySelector(
//           '[aria-label="Minus a minute"]',
//         );
//         const decreaseSecondBtn = calendarElement.querySelector(
//           '[aria-label="Minus a second"]',
//         );
//         expect(decreaseHourBtn.hasAttribute('disabled')).toBe(true);
//         expect(decreaseMinuteBtn.hasAttribute('disabled')).toBe(true);
//         expect(decreaseSecondBtn.hasAttribute('disabled')).toBe(true);
//       }));
//
//       it('should disable all increase-time buttons when value equals maxMoment', fakeAsync(() => {
//         testComponent.date = new Date(maxMoment);
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//         const calendarDebugElement = fixture.debugElement.query(
//           By.directive(OwlDateTimeContainerComponent),
//         );
//         const calendarElement = calendarDebugElement.nativeElement;
//
//         const increaseHourBtn = calendarElement.querySelector(
//           '[aria-label="Add a hour"]',
//         );
//         const increaseMinuteBtn = calendarElement.querySelector(
//           '[aria-label="Add a minute"]',
//         );
//         const increaseSecondBtn = calendarElement.querySelector(
//           '[aria-label="Add a second"]',
//         );
//         expect(increaseHourBtn.hasAttribute('disabled')).toBe(true);
//         expect(increaseMinuteBtn.hasAttribute('disabled')).toBe(true);
//         expect(increaseSecondBtn.hasAttribute('disabled')).toBe(true);
//       }));
//     });
//
//     describe('DateTimePicker with filter validation', () => {
//       let fixture: ComponentFixture<DateTimePickerWithFilterValidationComponent>;
//       let testComponent: DateTimePickerWithFilterValidationComponent;
//
//       beforeEach(fakeAsync(() => {
//         fixture = createComponent(DateTimePickerWithFilterValidationComponent, [
//           OwlNativeDateTimeModule,
//         ]);
//         fixture.detectChanges();
//         testComponent = fixture.componentInstance;
//       }));
//
//       afterEach(fakeAsync(() => {
//         testComponent.dateTimePicker.close();
//         fixture.detectChanges();
//         flush();
//       }));
//
//       it('should mark input invalid', fakeAsync(() => {
//         testComponent.date = new Date(2017, JAN, 1);
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         expect(
//           fixture.debugElement.query(By.css('input')).nativeElement.classList,
//         ).toContain('ng-invalid');
//
//         testComponent.date = new Date(2017, JAN, 2);
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         expect(
//           fixture.debugElement.query(By.css('input')).nativeElement.classList,
//         ).not.toContain('ng-invalid');
//       }));
//
//       it('should disable filtered calendar cells', fakeAsync(() => {
//         testComponent.date = new Date(2017, JAN, 3);
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         expect(document.querySelector('owl-date-time-container')).not.toBeNull();
//
//         const cellOne = document.querySelector('[aria-label="January 1, 2017"]');
//         const cellTwo = document.querySelector('[aria-label="January 2, 2017"]');
//
//         expect(cellOne.classList).toContain('owl-dt-calendar-cell-disabled');
//         expect(cellTwo.classList).not.toContain('owl-dt-calendar-cell-disabled');
//       }));
//     });
//
//     describe('DateTimePicker with change and input events', () => {
//       let fixture: ComponentFixture<DateTimePickerWithChangeAndInputEventsComponent>;
//       let testComponent: DateTimePickerWithChangeAndInputEventsComponent;
//       let inputEl: HTMLInputElement;
//
//       beforeEach(fakeAsync(() => {
//         fixture = createComponent(DateTimePickerWithChangeAndInputEventsComponent, [
//           OwlNativeDateTimeModule,
//         ]);
//         fixture.detectChanges();
//         testComponent = fixture.componentInstance;
//         inputEl = fixture.debugElement.query(By.css('input')).nativeElement;
//
//         spyOn(testComponent, 'handleChange');
//         spyOn(testComponent, 'handleInput');
//         spyOn(testComponent, 'handleDateTimeChange');
//         spyOn(testComponent, 'handleDateTimeInput');
//       }));
//
//       afterEach(fakeAsync(() => {
//         testComponent.dateTimePicker.close();
//         fixture.detectChanges();
//         flush();
//       }));
//
//       it('should fire input and dateTimeInput events when user types input', () => {
//         expect(testComponent.handleChange).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeChange).not.toHaveBeenCalled();
//         expect(testComponent.handleInput).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeInput).not.toHaveBeenCalled();
//
//         inputEl.value = '2001-01-01';
//         dispatchFakeEvent(inputEl, 'input');
//         fixture.detectChanges();
//
//         expect(testComponent.handleChange).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeChange).not.toHaveBeenCalled();
//         expect(testComponent.handleInput).toHaveBeenCalled();
//         expect(testComponent.handleDateTimeInput).toHaveBeenCalled();
//       });
//
//       it('should fire change and dateTimeChange events when user commits typed input', () => {
//         expect(testComponent.handleChange).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeChange).not.toHaveBeenCalled();
//         expect(testComponent.handleInput).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeInput).not.toHaveBeenCalled();
//
//         dispatchFakeEvent(inputEl, 'change');
//         fixture.detectChanges();
//
//         expect(testComponent.handleChange).toHaveBeenCalled();
//         expect(testComponent.handleDateTimeChange).toHaveBeenCalled();
//         expect(testComponent.handleInput).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeInput).not.toHaveBeenCalled();
//       });
//
//       it('should fire dateTimeChange and dateTimeInput events when user selects calendar date', fakeAsync(() => {
//         expect(testComponent.handleChange).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeChange).not.toHaveBeenCalled();
//         expect(testComponent.handleInput).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeInput).not.toHaveBeenCalled();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//
//         expect(document.querySelector('owl-date-time-container')).not.toBeNull();
//
//         const cells = document.querySelectorAll('.owl-dt-calendar-cell');
//         dispatchMouseEvent(cells[0], 'click');
//         fixture.detectChanges();
//         flush();
//         testComponent.dateTimePicker.confirmSelect();
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         expect(testComponent.handleChange).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeChange).toHaveBeenCalled();
//         expect(testComponent.handleInput).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeInput).toHaveBeenCalled();
//       }));
//
//       it('should fire dateTimeChange and dateTimeInput events when user change hour', fakeAsync(() => {
//         expect(testComponent.handleChange).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeChange).not.toHaveBeenCalled();
//         expect(testComponent.handleInput).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeInput).not.toHaveBeenCalled();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//
//         expect(document.querySelector('owl-date-time-container')).not.toBeNull();
//
//         const increaseHourBtn = document.querySelector('[aria-label="Add a hour"]');
//         dispatchMouseEvent(increaseHourBtn, 'click');
//         fixture.detectChanges();
//         flush();
//         testComponent.dateTimePicker.confirmSelect();
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//
//         const decreaseHourBtn = document.querySelector('[aria-label="Minus a hour"]');
//         dispatchMouseEvent(decreaseHourBtn, 'click');
//         fixture.detectChanges();
//         flush();
//         testComponent.dateTimePicker.confirmSelect();
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         expect(testComponent.handleChange).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeChange).toHaveBeenCalledTimes(2);
//         expect(testComponent.handleInput).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeInput).toHaveBeenCalledTimes(2);
//       }));
//
//       it('should fire dateTimeChange and dateTimeInput events when user change minute', fakeAsync(() => {
//         expect(testComponent.handleChange).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeChange).not.toHaveBeenCalled();
//         expect(testComponent.handleInput).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeInput).not.toHaveBeenCalled();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//
//         expect(document.querySelector('owl-date-time-container')).not.toBeNull();
//
//         const increaseMinuteBtn = document.querySelector('[aria-label="Add a minute"]');
//         dispatchMouseEvent(increaseMinuteBtn, 'click');
//         fixture.detectChanges();
//         flush();
//         testComponent.dateTimePicker.confirmSelect();
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//
//         const decreaseMinuteBtn = document.querySelector('[aria-label="Minus a minute"]');
//         dispatchMouseEvent(decreaseMinuteBtn, 'click');
//         fixture.detectChanges();
//         flush();
//         testComponent.dateTimePicker.confirmSelect();
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         expect(testComponent.handleChange).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeChange).toHaveBeenCalledTimes(2);
//         expect(testComponent.handleInput).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeInput).toHaveBeenCalledTimes(2);
//       }));
//
//       it('should fire dateTimeChange and dateTimeInput events when user change second', fakeAsync(() => {
//         expect(testComponent.handleChange).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeChange).not.toHaveBeenCalled();
//         expect(testComponent.handleInput).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeInput).not.toHaveBeenCalled();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//
//         expect(document.querySelector('owl-date-time-container')).not.toBeNull();
//
//         const increaseSecondBtn = document.querySelector('[aria-label="Add a second"]');
//         dispatchMouseEvent(increaseSecondBtn, 'click');
//         fixture.detectChanges();
//         flush();
//         testComponent.dateTimePicker.confirmSelect();
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//
//         const decreaseSecondBtn = document.querySelector('[aria-label="Minus a second"]');
//         dispatchMouseEvent(decreaseSecondBtn, 'click');
//         fixture.detectChanges();
//         flush();
//         testComponent.dateTimePicker.confirmSelect();
//         fixture.detectChanges();
//         flush();
//         fixture.detectChanges();
//
//         expect(testComponent.handleChange).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeChange).toHaveBeenCalledTimes(2);
//         expect(testComponent.handleInput).not.toHaveBeenCalled();
//         expect(testComponent.handleDateTimeInput).toHaveBeenCalledTimes(2);
//       }));
//
//       it('should NOT fire the dateTimeInput event if the value has not changed', () => {
//         expect(testComponent.handleDateTimeInput).not.toHaveBeenCalled();
//
//         inputEl.value = '12/12/2012';
//         dispatchFakeEvent(inputEl, 'input');
//         fixture.detectChanges();
//
//         expect(testComponent.handleDateTimeInput).toHaveBeenCalledTimes(1);
//         dispatchFakeEvent(inputEl, 'input');
//         fixture.detectChanges();
//
//         expect(testComponent.handleDateTimeInput).toHaveBeenCalledTimes(1);
//       });
//     });
//
//     describe('DateTimePicker with ISO strings', () => {
//       let fixture: ComponentFixture<DateTimePickerWithISOStringsComponent>;
//       let testComponent: DateTimePickerWithISOStringsComponent;
//
//       beforeEach(fakeAsync(() => {
//         fixture = createComponent(DateTimePickerWithISOStringsComponent, [
//           OwlNativeDateTimeModule,
//         ]);
//         fixture.detectChanges();
//         testComponent = fixture.componentInstance;
//       }));
//
//       afterEach(fakeAsync(() => {
//         testComponent.dateTimePicker.close();
//         fixture.detectChanges();
//         flush();
//       }));
//
//       it('should coerce ISO strings', fakeAsync(() => {
//         expect(() => fixture.detectChanges()).not.toThrow();
//         flush();
//         fixture.detectChanges();
//
//         expect(testComponent.dateTimePicker.startAt).toEqual(new Date(2017, JUL, 1));
//         expect(testComponent.dateTimePickerInput.value).toEqual(new Date(2017, JUN, 1));
//         expect(testComponent.dateTimePickerInput.min).toEqual(new Date(2017, JAN, 1));
//         expect(testComponent.dateTimePickerInput.max).toEqual(new Date(2017, DEC, 31));
//       }));
//     });
//
//     describe('DateTimePicker with events', () => {
//       let fixture: ComponentFixture<DateTimePickerWithEventsComponent>;
//       let testComponent: DateTimePickerWithEventsComponent;
//
//       beforeEach(fakeAsync(() => {
//         fixture = createComponent(DateTimePickerWithEventsComponent, [
//           OwlNativeDateTimeModule,
//         ]);
//         fixture.detectChanges();
//         testComponent = fixture.componentInstance;
//       }));
//
//       afterEach(fakeAsync(() => {
//         testComponent.dateTimePicker.close();
//         fixture.detectChanges();
//         flush();
//       }));
//
//       it('should dispatch an event when a dateTimePicker is opened', fakeAsync(() => {
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//         flush();
//
//         expect(testComponent.openedSpy).toHaveBeenCalled();
//       }));
//
//       it('should dispatch an event when a dateTimePicker is closed', fakeAsync(() => {
//         testComponent.dateTimePicker.open();
//         fixture.detectChanges();
//         flush();
//
//         testComponent.dateTimePicker.close();
//         flush();
//         fixture.detectChanges();
//
//         expect(testComponent.closedSpy).toHaveBeenCalled();
//       }));
//     });
//   });
//
//   describe('with missing DateTimeAdapter and OWL_DATE_TIME_FORMATS', () => {
//     it('should throw when created', () => {
//       expect(() => createComponent(StandardDateTimePickerComponent)).toThrowError(
//         /OwlDateTimePicker: No provider found for .*/,
//       );
//     });
//   });
// });
//
// @Component({
//   template: `
//     <input
//       [owlDateTime]="dt"
//       [value]="date"
//     />
//     <owl-date-time
//       [opened]="opened"
//       [disabled]="disabled"
//       [pickerType]="pickerType"
//       [pickerMode]="pickerMode"
//       #dt
//     ></owl-date-time>
//   `,
// })
// class StandardDateTimePickerComponent {
//   date: Date | null = new Date(2020, JAN, 1);
//   pickerType = 'both';
//   pickerMode = 'popup';
//   opened = false;
//   disabled = false;
//   @ViewChild('dt', { static: true })
//   dateTimePicker: OwlDateTimeComponent<Date>;
//   @ViewChild(OwlDateTimeInputDirective, { static: true })
//   dateTimePickerInput: OwlDateTimeInputDirective<Date>;
// }
//
// @Component({
//   template: `
//     <input
//       [owlDateTime]="dt"
//       [selectMode]="selectMode"
//       [values]="dates"
//     />
//     <owl-date-time
//       [startAt]="startAt"
//       [endAt]="endAt"
//       [pickerType]="pickerType"
//       #dt
//     ></owl-date-time>
//   `,
// })
// class RangeDateTimePickerComponent {
//   dates: Date[] | null = [new Date(2020, JAN, 1), new Date(2020, FEB, 1)];
//   selectMode = 'range';
//   pickerType = 'both';
//   startAt = new Date(2020, JAN, 1);
//   endAt = new Date(2020, JAN, 2);
//   @ViewChild('dt', { static: true })
//   dateTimePicker: OwlDateTimeComponent<Date>;
//   @ViewChild(OwlDateTimeInputDirective, { static: true })
//   dateTimePickerInput: OwlDateTimeInputDirective<Date>;
// }
//
// @Component({
//   template: `
//     <input [owlDateTime]="dt" />
//     <input [owlDateTime]="dt" />
//     <owl-date-time #dt></owl-date-time>
//   `,
// })
// class MultiInputDateTimePickerComponent {}
//
// @Component({
//   template: ` <owl-date-time #dt></owl-date-time> `,
// })
// class NoInputDateTimePickerComponent {
//   @ViewChild('dt', { static: true })
//   dateTimePicker: OwlDateTimeComponent<Date>;
// }
//
// @Component({
//   template: `
//     <input
//       [owlDateTime]="dt"
//       [value]="date"
//     />
//     <owl-date-time
//       #dt
//       [startAt]="startDate"
//     ></owl-date-time>
//   `,
// })
// class DateTimePickerWithStartAtComponent {
//   date = new Date(2020, JAN, 1);
//   startDate = new Date(2010, JAN, 1);
//   @ViewChild('dt', { static: true })
//   dateTimePicker: OwlDateTimeComponent<Date>;
// }
//
// @Component({
//   template: `
//     <input
//       [owlDateTime]="dt"
//       [value]="date"
//     />
//     <owl-date-time
//       #dt
//       [startView]="startView"
//       (monthSelected)="onMonthSelection()"
//       (yearSelected)="onYearSelection()"
//     ></owl-date-time>
//   `,
// })
// class DateTimePickerWithStartViewComponent {
//   date = new Date(2020, JAN, 1);
//   startView = 'month';
//   @ViewChild('dt', { static: true })
//   dateTimePicker: OwlDateTimeComponent<Date>;
//
//   onMonthSelection() {}
//
//   onYearSelection() {}
// }
//
// @Component({
//   template: `
//     <input
//       [(ngModel)]="moment"
//       [selectMode]="selectMode"
//       [owlDateTime]="dt"
//     />
//     <owl-date-time #dt></owl-date-time>
//   `,
// })
// class DateTimePickerWithNgModelComponent {
//   moment: Date[] | Date | null = null;
//   selectMode = 'single';
//   @ViewChild('dt', { static: true })
//   dateTimePicker: OwlDateTimeComponent<Date>;
//   @ViewChild(OwlDateTimeInputDirective, { static: true })
//   dateTimePickerInput: OwlDateTimeInputDirective<Date>;
// }
//
// @Component({
//   template: `
//     <input
//       [formControl]="formControl"
//       [owlDateTime]="dt"
//       [owlDateTimeTrigger]="dt"
//     />
//     <owl-date-time #dt></owl-date-time>
//   `,
// })
// class DateTimePickerWithFormControlComponent {
//   formControl = new FormControl();
//   @ViewChild('dt', { static: true })
//   dateTimePicker: OwlDateTimeComponent<Date>;
//   @ViewChild(OwlDateTimeInputDirective, { static: true })
//   dateTimePickerInput: OwlDateTimeInputDirective<Date>;
//   @ViewChild(OwlDateTimeTriggerDirective, { static: true })
//   dateTimePickerToggle: OwlDateTimeTriggerDirective<Date>;
// }
//
// @Component({
//   template: `
//     <input [owlDateTime]="dt" />
//     <button [owlDateTimeTrigger]="dt">Icon</button>
//     <owl-date-time #dt></owl-date-time>
//   `,
// })
// class DateTimePickerWithTriggerComponent {
//   @ViewChild('dt', { static: true })
//   dateTimePicker: OwlDateTimeComponent<Date>;
//   @ViewChild(OwlDateTimeInputDirective, { static: true })
//   dateTimePickerInput: OwlDateTimeInputDirective<Date>;
// }
//
// @Component({
//   template: `
//     <input
//       [(ngModel)]="date"
//       [min]="min"
//       [max]="max"
//       [owlDateTime]="dt"
//       [owlDateTimeTrigger]="dt"
//     />
//     <owl-date-time
//       [showSecondsTimer]="true"
//       #dt
//     ></owl-date-time>
//   `,
// })
// class DateTimePickerWithMinAndMaxValidationComponent {
//   @ViewChild('dt', { static: true })
//   dateTimePicker: OwlDateTimeComponent<Date>;
//   @ViewChild(OwlDateTimeInputDirective, { static: true })
//   dateTimePickerInput: OwlDateTimeInputDirective<Date>;
//   @ViewChild(OwlDateTimeTriggerDirective, { static: true })
//   dateTimePickerToggle: OwlDateTimeTriggerDirective<Date>;
//
//   date: Date | null;
//   min: Date;
//   max: Date;
// }
//
// @Component({
//   template: `
//     <input
//       [(ngModel)]="date"
//       [owlDateTimeFilter]="filter"
//       [owlDateTime]="dt"
//       [owlDateTimeTrigger]="dt"
//     />
//     <owl-date-time
//       [showSecondsTimer]="true"
//       #dt
//     ></owl-date-time>
//   `,
// })
// class DateTimePickerWithFilterValidationComponent {
//   @ViewChild('dt', { static: true })
//   dateTimePicker: OwlDateTimeComponent<Date>;
//   @ViewChild(OwlDateTimeInputDirective, { static: true })
//   dateTimePickerInput: OwlDateTimeInputDirective<Date>;
//   @ViewChild(OwlDateTimeTriggerDirective, { static: true })
//   dateTimePickerToggle: OwlDateTimeTriggerDirective<Date>;
//   date: Date;
//   filter = (date: Date) => date.getDate() !== 1;
// }
//
// @Component({
//   template: `
//     <input
//       [owlDateTime]="dt"
//       [owlDateTimeTrigger]="dt"
//       (change)="handleChange()"
//       (input)="handleInput()"
//       (dateTimeChange)="handleDateTimeChange()"
//       (dateTimeInput)="handleDateTimeInput()"
//     />
//     <owl-date-time
//       [showSecondsTimer]="true"
//       #dt
//     ></owl-date-time>
//   `,
// })
// class DateTimePickerWithChangeAndInputEventsComponent {
//   @ViewChild('dt', { static: true })
//   dateTimePicker: OwlDateTimeComponent<Date>;
//   @ViewChild(OwlDateTimeInputDirective, { static: true })
//   dateTimePickerInput: OwlDateTimeInputDirective<Date>;
//   @ViewChild(OwlDateTimeTriggerDirective, { static: true })
//   dateTimePickerToggle: OwlDateTimeTriggerDirective<Date>;
//
//   handleChange() {}
//
//   handleInput() {}
//
//   handleDateTimeChange() {}
//
//   handleDateTimeInput() {}
// }
//
// @Component({
//   template: `
//     <input
//       [owlDateTime]="dt"
//       [(ngModel)]="value"
//       [min]="min"
//       [max]="max"
//     />
//     <owl-date-time
//       #dt
//       [startAt]="startAt"
//     ></owl-date-time>
//   `,
// })
// class DateTimePickerWithISOStringsComponent {
//   value = new Date(2017, JUN, 1).toISOString();
//   min = new Date(2017, JAN, 1).toISOString();
//   max = new Date(2017, DEC, 31).toISOString();
//   startAt = new Date(2017, JUL, 1).toISOString();
//   @ViewChild('dt', { static: true })
//   dateTimePicker: OwlDateTimeComponent<Date>;
//   @ViewChild(OwlDateTimeInputDirective, { static: true })
//   dateTimePickerInput: OwlDateTimeInputDirective<Date>;
// }
//
// @Component({
//   template: `
//     <input
//       [(ngModel)]="selected"
//       [owlDateTime]="dt"
//     />
//     <owl-date-time
//       (afterPickerOpen)="openedSpy()"
//       (afterPickerClosed)="closedSpy()"
//       #dt
//     ></owl-date-time>
//   `,
// })
// class DateTimePickerWithEventsComponent {
//   selected: Date | null = null;
//   openedSpy = jasmine.createSpy('opened spy');
//   closedSpy = jasmine.createSpy('closed spy');
//   @ViewChild('dt', { static: true })
//   dateTimePicker: OwlDateTimeComponent<Date>;
// }
