import { FormlyFieldConfig } from '@ngx-formly/core';
import { isArray } from 'rxjs/internal-compatibility';

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
    if (item.type === 'input' || item.type === 'textarea' || item.type === 'duration') {
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

    if (item.type === 'repeat' && isArray(item?.fieldGroup)) {
      return {
        ...item,
        fieldGroup: adjustToLiveFormlyForm(item?.fieldGroup),
      };
    }

    if (
      item.type === 'repeat' &&
      item?.fieldArray?.fieldGroup &&
      isArray(item.fieldArray.fieldGroup)
    ) {
      return {
        ...item,
        fieldArray: {
          ...item.fieldArray,
          fieldGroup: adjustToLiveFormlyForm(item?.fieldArray?.fieldGroup),
        },
      };
    }
    return item;
  });
};
