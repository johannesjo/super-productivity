const WORK_CONTEXT_COLORS: string[] = [
  '#29a1aa',
  '#a05db1',
  '#ef5350',
  '#ec407a',
  '#ab47bc',
  '#7e57c2',
  '#5c6bc0',
  '#42a5f5',
  '#29b6f6',
  '#26c6da',
  '#26a69a',
  '#66bb6a',
  '#9ccc65',
  '#d4e157',
  '#ffee58',
  '#ffca28',
  '#ffa726',
  '#ff7043',
  '#8d6e63',
  '#bdbdbd',
  '#78909c',
];

export const getRandomWorkContextColor = (): string => {
  const index = Math.floor(Math.random() * WORK_CONTEXT_COLORS.length);
  return WORK_CONTEXT_COLORS[index];
};
