import { ShareFormatter, WorkSummaryData } from './share-formatter';

describe('ShareFormatter', () => {
  describe('formatWorkSummary', () => {
    it('should format basic work summary', () => {
      const data: WorkSummaryData = {
        totalTimeSpent: 3600000, // 1 hour
        tasksCompleted: 5,
      };

      const payload = ShareFormatter.formatWorkSummary(data);

      expect(payload.text).toContain('📊 My productivity summary');
      expect(payload.text).toContain('1h');
      expect(payload.text).toContain('5 tasks completed');
      expect(payload.url).toBeDefined();
    });

    it('should include date range when provided', () => {
      const data: WorkSummaryData = {
        totalTimeSpent: 3600000,
        tasksCompleted: 5,
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-07',
        },
      };

      const payload = ShareFormatter.formatWorkSummary(data);

      expect(payload.text).toContain('2024-01-01');
      expect(payload.text).toContain('2024-01-07');
    });

    it('should include top tasks when provided', () => {
      const data: WorkSummaryData = {
        totalTimeSpent: 3600000,
        tasksCompleted: 5,
        topTasks: [
          { title: 'Task 1', timeSpent: 1800000 },
          { title: 'Task 2', timeSpent: 1200000 },
        ],
      };

      const payload = ShareFormatter.formatWorkSummary(data);

      expect(payload.text).toContain('Task 1');
      expect(payload.text).toContain('Task 2');
    });

    it('should include UTM parameters when requested', () => {
      const data: WorkSummaryData = {
        totalTimeSpent: 3600000,
        tasksCompleted: 5,
      };

      const payload = ShareFormatter.formatWorkSummary(data, {
        includeUTM: true,
      });

      expect(payload.url).toContain('utm_source');
      expect(payload.url).toContain('utm_medium');
      expect(payload.url).toContain('utm_campaign');
    });

    it('should include hashtags when requested', () => {
      const data: WorkSummaryData = {
        totalTimeSpent: 3600000,
        tasksCompleted: 5,
      };

      const payload = ShareFormatter.formatWorkSummary(data, {
        includeHashtags: true,
      });

      expect(payload.text).toContain('#productivity');
      expect(payload.text).toContain('#SuperProductivity');
    });

    it('should set project name in title when provided', () => {
      const data: WorkSummaryData = {
        totalTimeSpent: 3600000,
        tasksCompleted: 5,
        projectName: 'My Project',
      };

      const payload = ShareFormatter.formatWorkSummary(data);

      expect(payload.title).toBe('Work Summary - My Project');
    });
  });

  describe('formatPromotion', () => {
    it('should format default promotional text', () => {
      const payload = ShareFormatter.formatPromotion();

      expect(payload.text).toContain('Super Productivity');
      expect(payload.title).toBe('Super Productivity');
      expect(payload.url).toBeDefined();
    });

    it('should use custom text when provided', () => {
      const customText = 'Check out this awesome app!';
      const payload = ShareFormatter.formatPromotion(customText);

      expect(payload.text).toBe(customText);
    });

    it('should include UTM parameters when requested', () => {
      const payload = ShareFormatter.formatPromotion(undefined, {
        includeUTM: true,
        utmSource: 'custom',
      });

      expect(payload.url).toContain('utm_source=custom');
    });
  });

  describe('optimizeForTwitter', () => {
    it('should truncate long text for Twitter', () => {
      const longText = 'a'.repeat(300);
      const payload = {
        text: longText,
        url: 'https://example.com',
      };

      const optimized = ShareFormatter.optimizeForTwitter(payload);

      expect(optimized.text!.length).toBeLessThanOrEqual(280 - 23 - 1); // 280 - URL length - space
      expect(optimized.text ?? '').toMatch(/\.\.\.$/);
    });

    it('should not truncate short text', () => {
      const shortText = 'Short text';
      const payload = {
        text: shortText,
        url: 'https://example.com',
      };

      const optimized = ShareFormatter.optimizeForTwitter(payload);

      expect(optimized.text).toBe(shortText);
    });
  });
});
