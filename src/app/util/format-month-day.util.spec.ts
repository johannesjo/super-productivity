import { DateTimeLocale, DateTimeLocales } from '../core/locale.constants';
import { formatMonthDay } from './format-month-day.util';

describe('formatMonthDay', () => {
  const testDate = new Date(2023, 11, 25); // December 25, 2023
  const singleDigitDate = new Date(2023, 0, 5); // January 5, 2023

  describe('US locale (en-US)', () => {
    it('should format dates as MM/DD', () => {
      const result = formatMonthDay(testDate, DateTimeLocales.en_us);
      expect(result).toBe('12/25');
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, DateTimeLocales.en_us);
      expect(result).toBe('1/5');
    });
  });

  describe('UK locale (en-GB)', () => {
    it('should format dates as DD/MM', () => {
      const result = formatMonthDay(testDate, DateTimeLocales.en_gb);
      expect(result).toBe('25/12');
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, DateTimeLocales.en_gb);
      expect(result).toBe('5/1'); // Zero-padding removed for consistency
    });
  });

  describe('Turkish locale (tr-TR)', () => {
    it('should format dates as DD/MM', () => {
      const result = formatMonthDay(testDate, DateTimeLocales.tr_tr);
      expect(result).toBe('25/12'); // Turkish format: DD/MM or DD.MM
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, DateTimeLocales.tr_tr);
      expect(result).toBe('5/1'); // Zero-padding removed for consistency
    });
  });

  describe('German locale (de-DE)', () => {
    it('should format dates as DD.MM.', () => {
      const result = formatMonthDay(testDate, DateTimeLocales.de_de);
      expect(result).toBe('25.12.'); // Note: German includes trailing period
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, DateTimeLocales.de_de);
      expect(result).toBe('5.1.'); // Note: German format
    });
  });

  describe('French locale (fr-FR)', () => {
    it('should format dates as DD/MM', () => {
      const result = formatMonthDay(testDate, DateTimeLocales.fr_fr);
      expect(result).toBe('25/12');
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, DateTimeLocales.fr_fr);
      expect(result).toBe('5/1'); // Zero-padding removed for consistency
    });
  });

  describe('Spanish locale (es-ES)', () => {
    it('should format dates as DD/MM', () => {
      const result = formatMonthDay(testDate, DateTimeLocales.es_es);
      expect(result).toBe('25/12');
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, DateTimeLocales.es_es);
      expect(result).toBe('5/1'); // No zero-padding
    });
  });

  describe('Italian locale (it-IT)', () => {
    it('should format dates as DD/MM', () => {
      const result = formatMonthDay(testDate, DateTimeLocales.it_it);
      expect(result).toBe('25/12');
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, DateTimeLocales.it_it);
      expect(result).toBe('5/1'); // Zero-padding removed for consistency
    });
  });

  describe('Portuguese Brazil locale (pt-BR)', () => {
    it('should format dates as DD/MM', () => {
      const result = formatMonthDay(testDate, DateTimeLocales.pt_br);
      expect(result).toBe('25/12');
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, DateTimeLocales.pt_br);
      expect(result).toBe('5/1'); // Zero-padding removed for consistency
    });
  });

  describe('Russian locale (ru-RU)', () => {
    it('should format dates as DD.MM', () => {
      const result = formatMonthDay(testDate, DateTimeLocales.ru_ru);
      expect(result).toBe('25.12'); // Note: ru-RU uses dots, no trailing period
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, DateTimeLocales.ru_ru);
      expect(result).toBe('5.1'); // Zero-padding removed for consistency
    });
  });

  describe('Chinese Simplified locale (zh-CN)', () => {
    it('should format dates as MM/DD', () => {
      const result = formatMonthDay(testDate, DateTimeLocales.zh_cn);
      expect(result).toBe('12/25'); // Chinese uses MM/DD format
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, DateTimeLocales.zh_cn);
      expect(result).toBe('1/5'); // No zero-padding
    });
  });

  describe('Japanese locale (ja-JP)', () => {
    it('should format dates as MM/DD', () => {
      const result = formatMonthDay(testDate, DateTimeLocales.ja_jp);
      expect(result).toBe('12/25'); // Japanese uses MM/DD format for month/day
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, DateTimeLocales.ja_jp);
      expect(result).toBe('1/5');
    });
  });

  describe('Korean locale (ko-KR)', () => {
    it('should format dates as MM. DD.', () => {
      const result = formatMonthDay(testDate, DateTimeLocales.ko_kr);
      expect(result).toBe('12. 25.'); // Korean uses MM. DD. format with periods and spaces
    });

    it('should handle single digit months and days', () => {
      const result = formatMonthDay(singleDigitDate, DateTimeLocales.ko_kr);
      expect(result).toBe('1. 5.'); // No zero-padding, uses periods with spaces
    });
  });

  describe('Error handling', () => {
    it('should return empty string for invalid dates', () => {
      const result = formatMonthDay(new Date('invalid'), DateTimeLocales.en_us);
      expect(result).toBe('');
    });

    it('should return empty string for null dates', () => {
      const result = formatMonthDay(null as any, DateTimeLocales.en_us);
      expect(result).toBe('');
    });

    it('should handle different year formats without including them in result', () => {
      // Test that both 2-digit and 4-digit years are properly removed
      const result = formatMonthDay(testDate, DateTimeLocales.en_us);
      expect(result).not.toContain('23');
      expect(result).not.toContain('2023');
    });

    it('should fallback to basic format when locale data is missing', () => {
      // Use a non-existent locale to trigger fallback
      const result = formatMonthDay(testDate, 'xx-XX' as DateTimeLocale);
      expect(result).toBe('25/12'); // Should fallback to d/M format
    });
  });

  describe('Locale-specific expectations', () => {
    it('should respect locale ordering differences', () => {
      // Same date should format differently for US vs GB
      const usResult = formatMonthDay(testDate, DateTimeLocales.en_us);
      const gbResult = formatMonthDay(testDate, DateTimeLocales.en_gb);

      expect(usResult).toBe('12/25'); // Month/Day
      expect(gbResult).toBe('25/12'); // Day/Month
      expect(usResult).not.toBe(gbResult); // Should be different
    });

    it('should handle various separator styles', () => {
      const usResult = formatMonthDay(testDate, DateTimeLocales.en_us); // Uses /
      const deResult = formatMonthDay(testDate, DateTimeLocales.de_de); // Uses . with trailing period
      const ruResult = formatMonthDay(testDate, DateTimeLocales.ru_ru); // Uses . without trailing period
      const krResult = formatMonthDay(testDate, DateTimeLocales.ko_kr); // Uses . with spaces

      expect(usResult).toContain('/');
      expect(deResult).toContain('.');
      expect(ruResult).toContain('.');
      expect(krResult).toContain('. '); // Korean has space after period
    });

    it('should differentiate between MM/DD and DD/MM locales', () => {
      // MM/DD format locales
      const mmddLocales = [
        DateTimeLocales.en_us,
        DateTimeLocales.zh_cn,
        DateTimeLocales.ja_jp,
      ];

      // DD/MM format locales
      const ddmmLocales = [
        DateTimeLocales.en_gb,
        DateTimeLocales.fr_fr,
        DateTimeLocales.es_es,
        DateTimeLocales.it_it,
        DateTimeLocales.pt_br,
        DateTimeLocales.tr_tr,
      ];

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
        DateTimeLocales.en_us,
        DateTimeLocales.en_gb,
        DateTimeLocales.de_de,
        DateTimeLocales.fr_fr,
        DateTimeLocales.es_es,
        DateTimeLocales.it_it,
        DateTimeLocales.pt_br,
        DateTimeLocales.tr_tr,
        DateTimeLocales.ru_ru,
        DateTimeLocales.zh_cn,
        DateTimeLocales.ja_jp,
        DateTimeLocales.ko_kr,
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
