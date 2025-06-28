# Timezone Behavior Analysis for Super Productivity

## Overview

This document analyzes the desired timezone behavior for various date/time functions in Super Productivity. The key principle is that **scheduled times should be consistent in local time**, not UTC time.

## Key Functions Analysis

### 1. `add-tasks-for-tomorrow.service.ts` - Tomorrow Date Calculation

**Current Implementation:**

```typescript
const d = new Date(todayStr);
d.setDate(d.getDate() + 1);
```

**Potential Issue:**

- Uses `new Date(todayStr)` which interprets YYYY-MM-DD as UTC
- In negative timezones, this could make "tomorrow" calculation off by one day

**Analysis:**

- **SHOULD BE FIXED**: The tomorrow calculation should be based on the user's local date
- If today is "2024-01-15" in the user's timezone, tomorrow should be "2024-01-16"
- The current implementation could show tomorrow's tasks a day early/late in certain timezones

**Recommended Fix:**

```typescript
const d = dateStrToUtcDate(todayStr); // Parse as local date
d.setDate(d.getDate() + 1);
```

### 2. `getDateRangeForDay()` - Day Boundary Calculation

**Current Implementation:**

```typescript
const d = new Date(rs);
d.setHours(0, 0, 0, 0); // Start of day
d.setHours(23, 59, 59, 0); // End of day
```

**Analysis:**

- **KEEP AS IS**: This is correct behavior
- Day boundaries SHOULD be in local time
- Midnight should be midnight in the user's timezone, not UTC
- A task scheduled for "today" should appear from local midnight to local midnight

**No Changes Needed** ✓

### 3. `getDateTimeFromClockString()` - Clock Time to Timestamp

**Current Implementation:**

```typescript
const d = new Date(date);
d.setHours(+h);
d.setMinutes(+m);
```

**Analysis:**

- **KEEP AS IS**: This is correct behavior
- A task scheduled for "8:00 AM" should be at 8:00 AM local time
- This function correctly sets the hours/minutes in local time
- Example: "08:00" should always mean 8 AM in the user's current timezone

**No Changes Needed** ✓

### 4. `getDateRangeForWeek()` - Week Boundary Calculation

**Current Implementation:**

- Similar to day range, uses local time calculations
- Week starts on Monday (or Sunday depending on locale)

**Analysis:**

- **KEEP AS IS**: Week boundaries should be in local time
- A week should start at midnight local time on Sunday/Monday
- This ensures consistent week grouping regardless of timezone

**No Changes Needed** ✓

### 5. Other Date String Parsing Issues

**Pattern to Look For:**

```typescript
new Date('YYYY-MM-DD'); // BAD - interprets as UTC
dateStrToUtcDate('YYYY-MM-DD'); // GOOD - interprets as local
```

**Analysis:**

- Any place where we parse a date string that represents a calendar date (not a timestamp)
- Should use `dateStrToUtcDate()` to ensure consistent local date interpretation

## Summary of Required Changes

### **NEEDS FIXING:**

1. **add-tasks-for-tomorrow.service.ts** - Tomorrow calculation uses `new Date(todayStr)`
   - This has the same bug pattern as the original issue #4653
   - Should use `dateStrToUtcDate(todayStr)`

### **KEEP AS IS:**

1. **getDateRangeForDay()** - Correctly uses local time for day boundaries
2. **getDateTimeFromClockString()** - Correctly converts clock times to local timestamps
3. **getDateRangeForWeek()** - Correctly uses local time for week boundaries

## General Principles

1. **Calendar Dates (YYYY-MM-DD)**: Should always be interpreted in local time
   - Use `dateStrToUtcDate()` instead of `new Date()`
2. **Clock Times (HH:MM)**: Should always represent local time
   - 8:00 AM is 8:00 AM regardless of timezone
3. **Day/Week/Month Boundaries**: Should always be in local time
   - Midnight is local midnight, not UTC midnight
4. **Repeating Tasks**: Should fire at the same local time
   - A daily task at 9:00 AM should always be at 9:00 AM local

## Testing Strategy

1. **Test with Multiple Timezones**: Especially negative offsets (Americas) and positive (Asia/Australia)
2. **Test DST Transitions**: Tasks scheduled during spring forward/fall back
3. **Test Date Boundaries**: Tasks at 23:59 and 00:01
4. **Test Week Boundaries**: Tasks on Sunday/Monday transition

## Conclusion

Most of the codebase correctly handles timezone behavior. The main issue is with date string parsing using `new Date("YYYY-MM-DD")` which should be replaced with `dateStrToUtcDate()` to ensure consistent local date interpretation.
