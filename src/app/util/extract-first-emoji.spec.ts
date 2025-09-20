import { containsEmoji, extractFirstEmoji, isSingleEmoji } from './extract-first-emoji';

describe('extractFirstEmoji', () => {
  it('should extract the first emoji from a string with multiple emojis', () => {
    expect(extractFirstEmoji('😀🚀✅')).toBe('😀');
    expect(extractFirstEmoji('🎉🎊🎈')).toBe('🎉');
    expect(extractFirstEmoji('❤️💙💚')).toBe('❤️');
  });

  it('should extract the first emoji from a string with emojis and text', () => {
    expect(extractFirstEmoji('Hello 😀 world')).toBe('😀');
    expect(extractFirstEmoji('🚀 Rocket ship')).toBe('🚀');
    expect(extractFirstEmoji('Task ✅ completed')).toBe('✅');
  });

  it('should return empty string for strings without emojis', () => {
    expect(extractFirstEmoji('Hello world')).toBe('');
    expect(extractFirstEmoji('123')).toBe('');
    expect(extractFirstEmoji('')).toBe('');
  });

  it('should handle edge cases', () => {
    expect(extractFirstEmoji('   ')).toBe('');
    expect(extractFirstEmoji('😀')).toBe('😀');
    expect(extractFirstEmoji('😀 ')).toBe('😀');
  });

  it('should handle emojis with skin tone modifiers', () => {
    expect(extractFirstEmoji('👍🏻👍🏿')).toBe('👍🏻');
    expect(extractFirstEmoji('👋🏽 Hello')).toBe('👋🏽');
  });
});

describe('isSingleEmoji', () => {
  it('should return true for single emojis', () => {
    expect(isSingleEmoji('😀')).toBe(true);
    expect(isSingleEmoji('🚀')).toBe(true);
    expect(isSingleEmoji('✅')).toBe(true);
  });

  it('should return true for emojis with skin tone modifiers', () => {
    expect(isSingleEmoji('👍🏻')).toBe(true);
    expect(isSingleEmoji('👋🏽')).toBe(true);
  });

  it('should return false for multiple emojis', () => {
    expect(isSingleEmoji('😀🚀')).toBe(false);
    expect(isSingleEmoji('🎉🎊')).toBe(false);
  });

  it('should return false for emojis with text', () => {
    expect(isSingleEmoji('😀 Hello')).toBe(false);
    expect(isSingleEmoji('Hello 😀')).toBe(false);
  });

  it('should return false for non-emoji strings', () => {
    expect(isSingleEmoji('Hello')).toBe(false);
    expect(isSingleEmoji('123')).toBe(false);
    expect(isSingleEmoji('')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(isSingleEmoji('   ')).toBe(false);
    expect(isSingleEmoji('😀 ')).toBe(true); // Trimming removes the space
  });
});

describe('containsEmoji', () => {
  it('should return true for strings containing emojis', () => {
    expect(containsEmoji('Hello 😀 world')).toBe(true);
    expect(containsEmoji('🚀 Launch!')).toBe(true);
    expect(containsEmoji('Complete ✅')).toBe(true);
    expect(containsEmoji('😀🚀✅')).toBe(true);
  });

  it('should return true for strings with just emojis', () => {
    expect(containsEmoji('😀')).toBe(true);
    expect(containsEmoji('🚀')).toBe(true);
    expect(containsEmoji('✅')).toBe(true);
  });

  it('should return false for strings without emojis', () => {
    expect(containsEmoji('Hello world')).toBe(false);
    expect(containsEmoji('123')).toBe(false);
    expect(containsEmoji('folder')).toBe(false);
    expect(containsEmoji('')).toBe(false);
    expect(containsEmoji('   ')).toBe(false);
  });

  it('should handle complex emojis', () => {
    expect(containsEmoji('Love ❤️ you')).toBe(true);
    expect(containsEmoji('Great job 👍🏻')).toBe(true);
    expect(containsEmoji('Star ⭐ rating')).toBe(true);
  });

  it('should handle null/undefined gracefully', () => {
    expect(containsEmoji(null as any)).toBe(false);
    expect(containsEmoji(undefined as any)).toBe(false);
    expect(containsEmoji(123 as any)).toBe(false);
  });
});
