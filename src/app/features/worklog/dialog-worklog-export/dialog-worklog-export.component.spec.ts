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

describe('DialogWorklogExportComponent moment replacement', () => {
  describe('date formatting', () => {
    it('should format dates in locale short date format (en-US fixed)', () => {
      // Make test independent from host OS/browser locale by forcing en-US
      const fmt = new Intl.DateTimeFormat('en-US');
      const expectedPattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/; // M/D/YYYY
      const testCases = [
        new Date(2023, 9, 15),
        new Date(2024, 0, 1),
        new Date(2024, 11, 31),
      ];

      testCases.forEach((date) => {
        const formatted = fmt.format(date);
        expect(formatted).toMatch(expectedPattern);
      });
    });

    it('should handle same day comparison', () => {
      const fmt = new Intl.DateTimeFormat('en-US');
      const date1 = new Date(2023, 9, 15);
      const date2 = new Date(2023, 9, 15);
      const date3 = new Date(2023, 9, 16);

      const str1 = fmt.format(date1);
      const str2 = fmt.format(date2);
      const str3 = fmt.format(date3);

      expect(str1 === str2).toBe(true);
      expect(str1 === str3).toBe(false);
    });
  });
});
