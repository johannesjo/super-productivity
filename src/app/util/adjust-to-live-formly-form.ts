import { FormlyFieldConfig } from '@ngx-formly/core';
import { stringToMs } from '../ui/duration/string-to-ms.pipe';

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
      item.type === 'icon' ||
      item.type === 'color'
    ) {
      return {
        ...item,
        templateOptions: {
          ...item.templateOptions,
          keydown: (field: FormlyFieldConfig, event: KeyboardEvent) => {
            if (event.key === 'Enter' && (event.target as any)?.tagName !== 'TEXTAREA') {
              event.preventDefault();
              const value = (event?.target as any)?.value;
              // For duration fields, convert the string to milliseconds
              if (item.type === 'duration') {
                field.formControl?.setValue(value ? stringToMs(value) : null);
              } else if (item?.templateOptions?.type === 'number') {
                field.formControl?.setValue(value ? Number(value) : 0);
              } else {
                field.formControl?.setValue(value);
              }
            }
          },
        },
        modelOptions: {
          ...item.modelOptions,
          updateOn: 'blur',
        },
      };
    }

    if (Array.isArray(item?.fieldGroup)) {
      return {
        ...item,
        fieldGroup: adjustToLiveFormlyForm(item?.fieldGroup),
      };
    }

    if (
      item.type === 'repeat' &&
      (item?.fieldArray as any)?.fieldGroup &&
      Array.isArray((item.fieldArray as any).fieldGroup)
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
