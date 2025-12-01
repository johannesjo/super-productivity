// import { async, ComponentFixture, TestBed } from '@angular/core/testing';
//
// import { DialogSimpleTaskSummaryComponent } from './dialog-worklog-export.component';
//
// describe('DialogSimpleTaskSummaryComponent', () => {
//   let component: DialogSimpleTaskSummaryComponent;
//   let fixture: ComponentFixture<DialogSimpleTaskSummaryComponent>;
//
//   beforeEach(async(() => {
//     TestBed.configureTestingModule({
//       declarations: [DialogSimpleTaskSummaryComponent]
//     })
//       .compileComponents();
//   }));
//
//   beforeEach(() => {
//     fixture = TestBed.createComponent(DialogSimpleTaskSummaryComponent);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });
//
//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });

// describe('DialogWorklogExportComponent moment replacement', () => {
//   describe('date formatting', () => {
//     it('should format dates in locale short date format', () => {
//       // moment.format('l') produces locale-specific short date format
//       // For en-US this would be M/D/YYYY
//       const testCases = [
//         {
//           date: new Date(2023, 9, 15),
//           expectedPattern: /^\d{1,2}\/\d{1,2}\/\d{4}$/,
//         },
//         {
//           date: new Date(2024, 0, 1),
//           expectedPattern: /^\d{1,2}\/\d{1,2}\/\d{4}$/,
//         },
//         {
//           date: new Date(2024, 11, 31),
//           expectedPattern: /^\d{1,2}\/\d{1,2}\/\d{4}$/,
//         },
//       ];

//       testCases.forEach(({ date, expectedPattern }) => {
//         // Using toLocaleDateString with default locale
//         const formatted = date.toLocaleDateString();
//         expect(formatted).toMatch(expectedPattern);
//       });
//     });

//     it('should handle same day comparison', () => {
//       const date1 = new Date(2023, 9, 15);
//       const date2 = new Date(2023, 9, 15);
//       const date3 = new Date(2023, 9, 16);

//       const str1 = date1.toLocaleDateString();
//       const str2 = date2.toLocaleDateString();
//       const str3 = date3.toLocaleDateString();

//       expect(str1 === str2).toBe(true);
//       expect(str1 === str3).toBe(false);
//     });
//   });
// });
