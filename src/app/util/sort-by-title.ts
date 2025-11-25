export const sortByTitle = <T extends { title: string }>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => a.title.localeCompare(b.title));
