import { FormlyFieldConfig } from '@ngx-formly/core';

export const adjustToLiveFormlyForm = (
  items: FormlyFieldConfig[],
): FormlyFieldConfig[] => {
  return items.map((item) => {
    if (item.type === 'checkbox') {
      return {
        ...item,
        type: 'toggle',
      };
    }
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
