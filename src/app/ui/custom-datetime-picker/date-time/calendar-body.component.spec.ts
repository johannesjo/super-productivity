// /**
//  * calendar-body.component.spec
//  */
// import { async, ComponentFixture, TestBed } from '@angular/core/testing';
// import { CalendarCell, OwlCalendarBodyComponent } from './calendar-body.component';
// import { Component } from '@angular/core';
// import { By } from '@angular/platform-browser';
//
// describe('OwlCalendarBodyComponent', () => {
//   beforeEach(async(() => {
//     TestBed.configureTestingModule({
//       declarations: [
//         OwlCalendarBodyComponent,
//
//         // Test components
//         StandardCalendarBodyComponent,
//       ],
//     }).compileComponents();
//   }));
//
//   describe('standard CalendarBodyComponent', () => {
//     let fixture: ComponentFixture<StandardCalendarBodyComponent>;
//     let testComponent: StandardCalendarBodyComponent;
//     let calendarBodyNativeElement: Element;
//     let rowEls: NodeListOf<Element>;
//     let cellEls: NodeListOf<Element>;
//
//     const refreshElementLists = () => {
//       rowEls = calendarBodyNativeElement.querySelectorAll('tr');
//       cellEls = calendarBodyNativeElement.querySelectorAll('.owl-dt-calendar-cell');
//     };
//
//     beforeEach(() => {
//       fixture = TestBed.createComponent(StandardCalendarBodyComponent);
//       fixture.detectChanges();
//
//       const calendarBodyDebugElement = fixture.debugElement.query(
//         By.directive(OwlCalendarBodyComponent),
//       );
//       calendarBodyNativeElement = calendarBodyDebugElement.nativeElement;
//       testComponent = fixture.componentInstance;
//
//       refreshElementLists();
//     });
//
//     it('should create body', () => {
//       expect(rowEls.length).toBe(2);
//       expect(cellEls.length).toBe(14);
//     });
//
//     it('should highlight today', () => {
//       const todayCell = calendarBodyNativeElement.querySelector(
//         '.owl-dt-calendar-cell-today',
//       );
//       expect(todayCell).not.toBeNull();
//       expect(todayCell.innerHTML.trim()).toBe('3');
//     });
//
//     it('should highlight selected', () => {
//       const selectedCell = calendarBodyNativeElement.querySelector(
//         '.owl-dt-calendar-cell-selected',
//       );
//       expect(selectedCell).not.toBeNull();
//       expect(selectedCell.innerHTML.trim()).toBe('4');
//     });
//
//     it('cell should be selected on click', () => {
//       spyOn(testComponent, 'handleSelect');
//       expect(testComponent.handleSelect).not.toHaveBeenCalled();
//       const todayElement = calendarBodyNativeElement.querySelector(
//         '.owl-dt-calendar-cell-today',
//       ) as HTMLElement;
//       todayElement.click();
//       fixture.detectChanges();
//
//       expect(testComponent.handleSelect).toHaveBeenCalled();
//     });
//
//     it('should mark active date', () => {
//       expect((cellEls[10] as HTMLElement).innerText.trim()).toBe('11');
//       expect(cellEls[10].classList).toContain('owl-dt-calendar-cell-active');
//     });
//   });
// });
//
// @Component({
//   template: ` <table
//     owl-date-time-calendar-body
//     [rows]="rows"
//     [todayValue]="todayValue"
//     [selectedValues]="selectedValues"
//     [selectMode]="'single'"
//     [activeCell]="activeCell"
//     (select)="handleSelect()"
//   ></table>`,
// })
// class StandardCalendarBodyComponent {
//   rows = [
//     [1, 2, 3, 4, 5, 6, 7],
//     [8, 9, 10, 11, 12, 13, 14],
//   ].map((r) => r.map(createCell));
//   todayValue = 3;
//   selectedValues = [4];
//   activeCell = 10;
//
//   handleSelect() {}
// }
//
// function createCell(value: number) {
//   return new CalendarCell(value, `${value}`, `${value}-label`, true);
// }
