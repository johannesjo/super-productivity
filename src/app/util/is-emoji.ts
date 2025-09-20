/**
 * Utility function to detect if a string is an emoji
 * @param str - The string to check
 * @returns true if the string is an emoji, false otherwise
 */
export const isEmoji = (str: string): boolean => {
  if (!str || typeof str !== 'string') {
    return false;
  }

  // Remove whitespace and check if it's a single character
  const trimmed = str.trim();
  if (trimmed.length === 0) {
    return false;
  }

  // Check if it's a single emoji character
  // This regex matches most emoji characters including:
  // - Basic emojis (😀, 🚀, ✅, etc.)
  // - Emojis with skin tone modifiers
  // - Flag emojis
  // - Other Unicode emoji ranges
  const emojiRegex =
    /^(?:[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F0FF}]|[\u{1F200}-\u{1F2FF}]|[\u{1FA70}-\u{1FAFF}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F251}])(?:\u{1F3FB}|\u{1F3FC}|\u{1F3FD}|\u{1F3FE}|\u{1F3FF}|\uFE0F)?$/u;

  return emojiRegex.test(trimmed);
};
