export const isValidProjectExport = (d: any): boolean => {
  return !!(
    d &&
    d.id &&
    d.title &&
    d.relatedModels &&
    d.advancedCfg &&
    d.relatedModels.task
  );
};
