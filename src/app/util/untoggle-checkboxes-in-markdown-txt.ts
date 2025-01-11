export const unToggleCheckboxesInMarkdownTxt = (txt: string): string => {
  return txt.replace(/- \[x\] /g, '- [ ] ');
};
