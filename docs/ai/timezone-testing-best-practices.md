# Timezone Testing Best Practices for Super Productivity

## Current State

Super Productivity currently uses a simple but effective approach:

- All tests run with `TZ='Europe/Berlin'` environment variable
- This is set in both `package.json` test scripts and `karma.conf.js`
- Ensures consistent test results across different developer machines and CI environments

## Identified Issues

1. **Limited timezone coverage**: Only testing in one timezone (Europe/Berlin) may miss bugs that occur in:

   - Negative UTC offset timezones (e.g., America/Los_Angeles)
   - Timezones near the International Date Line
   - During DST transitions

2. **The specific bug from issue #4653**: Day of week mismatch in negative UTC offset timezones was not caught by tests

## Recommended Testing Strategy

### 1. **Multi-Timezone Test Suite**

Create a dedicated test suite that runs critical date-related tests in multiple timezones:

```json
// package.json
{
  "scripts": {
    "test:tz:la": "cross-env TZ='America/Los_Angeles' ng test --include='**/*.tz.spec.ts'",
    "test:tz:tokyo": "cross-env TZ='Asia/Tokyo' ng test --include='**/*.tz.spec.ts'",
    "test:tz:sydney": "cross-env TZ='Australia/Sydney' ng test --include='**/*.tz.spec.ts'",
    "test:tz:all": "npm run test:tz:la && npm run test:tz:tokyo && npm run test:tz:sydney"
  }
}
```

### 2. **Critical Functions to Test Across Timezones**

Based on the codebase analysis, these functions should have timezone-specific tests:

1. `dateStrToUtcDate()` - Core utility for parsing date strings
2. `formatDayStr()` - Formats day names (where the bug was found)
3. `formatDayMonthStr()` - Formats day and month strings
4. `getWorklogStr()` - Generates worklog date strings
5. Date range utilities (day/week/month calculations)

### 3. **Example Timezone Test Pattern**

```typescript
// format-day-str.tz.spec.ts
describe('formatDayStr timezone tests', () => {
  const testCases = [
    { dateStr: '2024-01-15', expectedDayBerlin: 'Mon', expectedDayLA: 'Mon' },
    { dateStr: '2024-12-31', expectedDayBerlin: 'Tue', expectedDayLA: 'Tue' },
    // Edge cases near midnight
    { dateStr: '2024-01-01', expectedDayBerlin: 'Mon', expectedDayLA: 'Mon' },
  ];

  testCases.forEach(({ dateStr, expectedDayBerlin, expectedDayLA }) => {
    it(`should format ${dateStr} correctly in current timezone`, () => {
      const result = formatDayStr(dateStr, 'en-US');
      const expectedDay =
        process.env.TZ === 'America/Los_Angeles' ? expectedDayLA : expectedDayBerlin;
      expect(result).toBe(expectedDay);
    });
  });
});
```

### 4. **DST Transition Testing**

Test dates around Daylight Saving Time transitions:

```typescript
describe('DST transition tests', () => {
  const dstTransitionDates = [
    '2024-03-10', // Spring forward in US
    '2024-11-03', // Fall back in US
    '2024-03-31', // Spring forward in EU
    '2024-10-27', // Fall back in EU
  ];

  dstTransitionDates.forEach((date) => {
    it(`should handle DST transition on ${date}`, () => {
      // Test date parsing and formatting around DST transitions
    });
  });
});
```

### 5. **Mock Timezone Testing (Alternative Approach)**

For more dynamic timezone testing without changing environment variables:

```bash
npm install --save-dev timezone-mock
```

```typescript
import * as timezoneMock from 'timezone-mock';

describe('Timezone mock tests', () => {
  afterEach(() => {
    timezoneMock.unregister();
  });

  it('should work in Los Angeles timezone', () => {
    timezoneMock.register('US/Pacific');
    const result = formatDayStr('2024-01-15', 'en-US');
    expect(result).toBe('Mon');
  });

  it('should work in Tokyo timezone', () => {
    timezoneMock.register('Asia/Tokyo');
    const result = formatDayStr('2024-01-15', 'en-US');
    expect(result).toBe('Mon');
  });
});
```

### 6. **CI/CD Integration**

Add timezone testing to the CI pipeline:

```yaml
# .github/workflows/test.yml
test-timezones:
  strategy:
    matrix:
      timezone: ['America/Los_Angeles', 'Europe/Berlin', 'Asia/Tokyo']
  steps:
    - name: Run tests in ${{ matrix.timezone }}
      env:
        TZ: ${{ matrix.timezone }}
      run: npm test
```

### 7. **Key Test Scenarios**

1. **Date string parsing**: Test `YYYY-MM-DD` format parsing in different timezones
2. **Day boundaries**: Test dates at 23:59 and 00:01 in different timezones
3. **Week boundaries**: Test Sunday/Monday transitions
4. **Month boundaries**: Test last/first day of month
5. **Year boundaries**: Test Dec 31/Jan 1
6. **DST transitions**: Test dates during spring forward/fall back
7. **Leap years**: Test Feb 28/29 in leap years

### 8. **Debugging Timezone Issues**

When debugging timezone-related test failures:

```typescript
console.log({
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  offset: new Date().getTimezoneOffset(),
  envTZ: process.env.TZ,
  date: new Date('2024-01-15').toString(),
  utcDate: new Date('2024-01-15').toUTCString(),
});
```

## Implementation Priority

1. **High Priority**: Add timezone tests for the fixed bug functions (`formatDayStr`, `formatDayMonthStr`)
2. **Medium Priority**: Create a timezone test suite for core date utilities
3. **Low Priority**: Consider timezone-mock library for more comprehensive testing

## Conclusion

The current approach of fixing timezone to 'Europe/Berlin' is good for consistency, but adding targeted timezone tests for critical date functions would catch timezone-specific bugs like issue #4653 before they reach production.
