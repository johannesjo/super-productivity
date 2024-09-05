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
    if (
      item.type === 'input' ||
      item.type === 'textarea' ||
      item.type === 'duration' ||
      item.type === 'icon'
    ) {
      return {
        ...item,
        templateOptions: {
          ...item.templateOptions,
          keydown: (field: FormlyFieldConfig, event: KeyboardEvent) => {
            if (event.key === 'Enter' && (event.target as any)?.tagName !== 'TEXTAREA') {
              field.formControl?.setValue((event?.target as any)?.value);
            }
          },
        },
        modelOptions: {
          ...item.modelOptions,
          updateOn: 'blur',
        },
      };
    }

    if (isArray(item?.fieldGroup)) {
      return {
        ...item,
        fieldGroup: adjustToLiveFormlyForm(item?.fieldGroup),
      };
    }

    if (
      item.type === 'repeat' &&
      (item?.fieldArray as any)?.fieldGroup &&
      isArray((item.fieldArray as any).fieldGroup)
    ) {
      return {
        ...item,
        fieldArray: {
          ...item.fieldArray,
          fieldGroup: adjustToLiveFormlyForm((item?.fieldArray as any)?.fieldGroup),
        },
      };
    }

    return item;
  });
};
