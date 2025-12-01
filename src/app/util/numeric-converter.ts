/* eslint-disable @typescript-eslint/naming-convention */
const arabicNumberMap = {
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
  '٠': '0',
};

export const convertToWesternArabic = (data: string): string => {
  return _replaceHinduArabic(data);
};

const _replaceHinduArabic = (val: string): string =>
  val.replace(/[١٢٣٤٥٦٧٨٩٠]/g, (match) => {
    return (arabicNumberMap as any)[match];
  });
