import { FormlyFieldConfig } from '@ngx-formly/core';

export const addDebounceToFormlyInputs = (
  items: FormlyFieldConfig[],
): FormlyFieldConfig[] => {
  return items.map((item) => {
    if (item.type === 'input') {
      return {
        ...item,
        modelOptions: {
          ...item.modelOptions,
          debounce: {
            default: 1500,
          },
        },
      };
    }
    return item;
  });
};
