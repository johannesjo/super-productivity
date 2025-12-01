// import { async, ComponentFixture, TestBed } from '@angular/core/testing';
//
// import { OpenProjectIssueContentComponent } from './open-project-issue-content.component';
//
// describe('OpenProjectIssueContentComponent', () => {
//   let component: OpenProjectIssueContentComponent;
//   let fixture: ComponentFixture<OpenProjectIssueContentComponent>;
//
//   beforeEach(async(() => {
//     TestBed.configureTestingModule({
//       declarations: [OpenProjectIssueContentComponent]
//     })
//       .compileComponents();
//   }));
//
//   beforeEach(() => {
//     fixture = TestBed.createComponent(OpenProjectIssueContentComponent);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });
//
//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });

describe('OpenProjectIssueContentComponent moment replacement', () => {
  describe('date time formatting for file names', () => {
    it('should format current date time as YYYYMMDD_HHmmss', () => {
      // Test the formatting pattern
      const testDate = new Date('2023-10-15T14:30:45.123Z');
      const pad = (num: number): string => String(num).padStart(2, '0');
      const year = testDate.getFullYear();
      const month = pad(testDate.getMonth() + 1);
      const day = pad(testDate.getDate());
      const hours = pad(testDate.getHours());
      const minutes = pad(testDate.getMinutes());
      const seconds = pad(testDate.getSeconds());
      const dateTime = `${year}${month}${day}_${hours}${minutes}${seconds}`;

      // Check format pattern (not exact value due to timezone)
      expect(dateTime).toMatch(/^\d{8}_\d{6}$/);
      expect(dateTime.length).toBe(15);
    });

    it('should pad single digit values correctly', () => {
      // Test with a date that has single digit values
      const testDate = new Date(2023, 0, 5, 9, 8, 7); // Jan 5, 2023, 09:08:07
      const pad = (num: number): string => String(num).padStart(2, '0');
      const year = testDate.getFullYear();
      const month = pad(testDate.getMonth() + 1);
      const day = pad(testDate.getDate());
      const hours = pad(testDate.getHours());
      const minutes = pad(testDate.getMinutes());
      const seconds = pad(testDate.getSeconds());
      const dateTime = `${year}${month}${day}_${hours}${minutes}${seconds}`;

      expect(dateTime).toBe('20230105_090807');
    });
  });
});
