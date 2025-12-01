# Timezone Test Failures in LA Timezone

## Root Cause

When `karma.conf.js` line 7 is commented out (removing `process.env.TZ = 'Europe/Berlin'`), tests fail in LA timezone due to date parsing issues.

## Main Issues

### 1. Date Constructor Ambiguity

**Problem**: `new Date('2020-07-06')` creates different dates in different timezones:

- **Berlin**: July 6, 2020 at 00:00 local time
- **LA**: July 5, 2020 at 17:00 (5 PM) local time (UTC interprets as July 6 00:00, then converts to LA time)

**Affected Tests**:

- `get-week-number.spec.ts`: Expects week 28 but gets week 27
- `get-date-range-for-week.spec.ts`: Week boundaries are off by one day

### 2. DST (Daylight Saving Time) Issues

**Problem**: Tests expecting 24-hour days fail during DST transitions:

- Spring forward: Day is 23 hours
- Fall back: Day is 25 hours

**Affected Tests**:

- `get-date-range-for-day.spec.ts`: DST transition tests

### 3. Week Start/End Calculations

**Problem**: Week boundary calculations assume consistent timezone behavior

- Week calculations are off by one day when dates cross timezone boundaries

**Affected Tests**:

- `create-blocked-blocks-by-day-map.spec.ts`: Date keys in maps don't match

## Recommended Fixes

### Option 1: Keep Berlin Timezone for Tests (Current Approach)

- **Pros**: All tests pass consistently, predictable behavior
- **Cons**: Doesn't catch real timezone issues that users might face

### Option 2: Fix Date Creation in Tests

Replace ambiguous date constructors:

```typescript
// BAD - timezone dependent
new Date('2020-07-06');

// GOOD - explicit local time
new Date(2020, 6, 6); // July 6, 2020 (month is 0-indexed)

// GOOD - explicit UTC
new Date(Date.UTC(2020, 6, 6));
```

### Option 3: Use UTC for All Test Dates

Consistently use UTC dates in tests to avoid timezone issues:

```typescript
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';
const testDate = dateStrToUtcDate('2020-07-06');
```

### Option 4: Mock Date/Time in Tests

Use a library like `@sinonjs/fake-timers` to control time in tests:

```typescript
import { install } from '@sinonjs/fake-timers';
const clock = install({ now: new Date('2020-07-06T12:00:00Z') });
// Run tests
clock.uninstall();
```

## Tests That Need Fixing (Sample)

1. **get-week-number.spec.ts**

   - Line 5: `new Date('2020-07-06')` → `new Date(2020, 6, 6)`
   - Line 11: `new Date('2020-01-01')` → `new Date(2020, 0, 1)`
   - Line 17, 21: `new Date('2020-01-08')` → `new Date(2020, 0, 8)`
   - Line 27: `new Date('2020-12-31')` → `new Date(2020, 11, 31)`
   - Line 33: `new Date('2021-12-31')` → `new Date(2021, 11, 31)`

2. **get-date-range-for-week.spec.ts**

   - Line 11: `new Date('2020-07-06')` → `new Date(2020, 6, 6)`
   - Line 12: `new Date('2020-07-12')` → `new Date(2020, 6, 12)`
   - Line 17: `new Date('2020-12-28')` → `new Date(2020, 11, 28)`
   - Line 18: `new Date('2021-01-03')` → `new Date(2021, 0, 3)`
   - Line 23: `new Date('2021-01-04')` → `new Date(2021, 0, 4)`
   - Line 24: `new Date('2021-01-10')` → `new Date(2021, 0, 10)`

3. **Issue #4840 Tests** (our new tests)
   - These correctly demonstrate the timezone-dependent behavior
   - They SHOULD fail in LA to prove the bug exists

## Conclusion

The current approach (hardcoding Berlin timezone in karma.conf.js) ensures consistent test behavior but masks real timezone issues. To properly support users in all timezones, either:

1. Keep the Berlin timezone for tests but add specific timezone edge case tests
2. Fix all date creation in tests to use explicit local dates
3. Run tests in multiple timezones in CI/CD to catch issues

The issue #4840 we discovered is a real bug that affects users in different timezones differently, and our tests correctly identify it when run in LA timezone.
