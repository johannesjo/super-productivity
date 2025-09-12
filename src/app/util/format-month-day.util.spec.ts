import { formatMonthDay } from './format-month-day.util';

describe('formatMonthDay', () => {
  const testDate = new Date(2023, 11, 25); // December 25, 2023
  const singleDigitDate = new Date(2023, 0, 5); // January 5, 2023

  describe('US locale (en-US)', () => {
    it('should format dates as MM/DD', () => {
      const result = formatMonthDay(testDate, 'en-US');
      expect(result).toBe('12/25');
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, 'en-US');
      expect(result).toBe('1/5');
    });
  });

  describe('UK locale (en-GB)', () => {
    it('should format dates as DD/MM', () => {
      const result = formatMonthDay(testDate, 'en-GB');
      expect(result).toBe('25/12');
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, 'en-GB');
      expect(result).toBe('5/1'); // Zero-padding removed for consistency
    });
  });

  describe('Turkish locale (tr-TR)', () => {
    it('should format dates as DD/MM', () => {
      const result = formatMonthDay(testDate, 'tr-TR');
      expect(result).toBe('25/12'); // Turkish format: DD/MM or DD.MM
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, 'tr-TR');
      expect(result).toBe('5/1'); // Zero-padding removed for consistency
    });
  });

  describe('German locale (de-DE)', () => {
    it('should format dates as DD.MM.', () => {
      const result = formatMonthDay(testDate, 'de-DE');
      expect(result).toBe('25.12.'); // Note: German includes trailing period
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, 'de-DE');
      expect(result).toBe('5.1.'); // Note: German format
    });
  });

  describe('French locale (fr-FR)', () => {
    it('should format dates as DD/MM', () => {
      const result = formatMonthDay(testDate, 'fr-FR');
      expect(result).toBe('25/12');
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, 'fr-FR');
      expect(result).toBe('5/1'); // Zero-padding removed for consistency
    });
  });

  describe('Spanish locale (es-ES)', () => {
    it('should format dates as DD/MM', () => {
      const result = formatMonthDay(testDate, 'es-ES');
      expect(result).toBe('25/12');
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, 'es-ES');
      expect(result).toBe('5/1'); // No zero-padding
    });
  });

  describe('Italian locale (it-IT)', () => {
    it('should format dates as DD/MM', () => {
      const result = formatMonthDay(testDate, 'it-IT');
      expect(result).toBe('25/12');
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, 'it-IT');
      expect(result).toBe('5/1'); // Zero-padding removed for consistency
    });
  });

  describe('Portuguese Brazil locale (pt-BR)', () => {
    it('should format dates as DD/MM', () => {
      const result = formatMonthDay(testDate, 'pt-BR');
      expect(result).toBe('25/12');
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, 'pt-BR');
      expect(result).toBe('5/1'); // Zero-padding removed for consistency
    });
  });

  describe('Russian locale (ru-RU)', () => {
    it('should format dates as DD.MM', () => {
      const result = formatMonthDay(testDate, 'ru-RU');
      expect(result).toBe('25.12'); // Note: ru-RU uses dots, no trailing period
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, 'ru-RU');
      expect(result).toBe('5.1'); // Zero-padding removed for consistency
    });
  });

  describe('Chinese Simplified locale (zh-CN)', () => {
    it('should format dates as MM/DD', () => {
      const result = formatMonthDay(testDate, 'zh-CN');
      expect(result).toBe('12/25'); // Chinese uses MM/DD format
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, 'zh-CN');
      expect(result).toBe('1/5'); // No zero-padding
    });
  });

  describe('Japanese locale (ja-JP)', () => {
    it('should format dates as MM/DD', () => {
      const result = formatMonthDay(testDate, 'ja-JP');
      expect(result).toBe('12/25'); // Japanese uses MM/DD format for month/day
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, 'ja-JP');
      expect(result).toBe('1/5');
    });
  });

  describe('Korean locale (ko-KR)', () => {
    it('should format dates as MM. DD.', () => {
      const result = formatMonthDay(testDate, 'ko-KR');
      expect(result).toBe('12. 25.'); // Korean uses MM. DD. format with periods and spaces
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, 'ko-KR');
      expect(result).toBe('1. 5.'); // No zero-padding, uses periods with spaces
    });
  });

  describe('Error handling', () => {
    it('should return empty string for invalid dates', () => {
      const result = formatMonthDay(new Date('invalid'), 'en-US');
      expect(result).toBe('');
    });

    it('should return empty string for null dates', () => {
      const result = formatMonthDay(null as any, 'en-US');
      expect(result).toBe('');
    });

    it('should handle different year formats without including them in result', () => {
      // Test that both 2-digit and 4-digit years are properly removed
      const result = formatMonthDay(testDate, 'en-US');
      expect(result).not.toContain('23');
      expect(result).not.toContain('2023');
    });

    it('should fallback to basic format when locale data is missing', () => {
      // Use a non-existent locale to trigger fallback
      const result = formatMonthDay(testDate, 'xx-XX');
      expect(result).toBe('12/25'); // Should fallback to M/d format
    });
  });

  describe('Locale-specific expectations', () => {
    it('should respect locale ordering differences', () => {
      // Same date should format differently for US vs GB
      const usResult = formatMonthDay(testDate, 'en-US');
      const gbResult = formatMonthDay(testDate, 'en-GB');

      expect(usResult).toBe('12/25'); // Month/Day
      expect(gbResult).toBe('25/12'); // Day/Month
      expect(usResult).not.toBe(gbResult); // Should be different
    });

    it('should handle various separator styles', () => {
      const usResult = formatMonthDay(testDate, 'en-US'); // Uses /
      const deResult = formatMonthDay(testDate, 'de-DE'); // Uses . with trailing period
      const ruResult = formatMonthDay(testDate, 'ru-RU'); // Uses . without trailing period
      const krResult = formatMonthDay(testDate, 'ko-KR'); // Uses . with spaces

      expect(usResult).toContain('/');
      expect(deResult).toContain('.');
      expect(ruResult).toContain('.');
      expect(krResult).toContain('. '); // Korean has space after period
    });

    it('should differentiate between MM/DD and DD/MM locales', () => {
      // MM/DD format locales
      const mmddLocales = ['en-US', 'zh-CN', 'ja-JP'];
      // DD/MM format locales
      const ddmmLocales = ['en-GB', 'fr-FR', 'es-ES', 'it-IT', 'pt-BR', 'tr-TR'];

      mmddLocales.forEach((locale) => {
        const result = formatMonthDay(testDate, locale);
        expect(result.startsWith('12')).toBe(true); // Should start with month
      });

      ddmmLocales.forEach((locale) => {
        const result = formatMonthDay(testDate, locale);
        expect(result.startsWith('25')).toBe(true); // Should start with day
      });
    });

    it('should consistently remove zero-padding across all locales', () => {
      // All locales should now have zero-padding removed for consistency
      const allLocales = [
        'en-US',
        'en-GB',
        'de-DE',
        'fr-FR',
        'es-ES',
        'it-IT',
        'pt-BR',
        'tr-TR',
        'ru-RU',
        'zh-CN',
        'ja-JP',
        'ko-KR',
      ];

      allLocales.forEach((locale) => {
        const result = formatMonthDay(singleDigitDate, locale);
        // Should not contain zero-padded single digits at word boundaries
        expect(result).not.toMatch(/\b0\d/); // No "05", "01", etc.
        // Should contain the actual single digits
        expect(result).toMatch(/[15]/); // Should contain either 1 or 5 (our test date digits)
      });
    });
  });
});
