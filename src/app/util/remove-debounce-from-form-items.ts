import { FormlyFieldConfig } from '@ngx-formly/core';

export const removeDebounceFromFormItems = (
  items: FormlyFieldConfig[],
): FormlyFieldConfig[] => {
  return items.map((item) => {
    if (item.type === 'input') {
      return {
        ...item,
        modelOptions: {
          ...item.modelOptions,
          debounce: {
            default: 0,
          },
        },
      };
    }
    return item;
  });
};
