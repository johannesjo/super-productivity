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
  '٠': '0'
};

export function convertToWesternArabic(data: string): string {
  const converted = _replaceHinduArabic(data);
  return converted;
}

function _replaceHinduArabic(val: string): string {
  return val.replace(/[١٢٣٤٥٦٧٨٩٠]/g, (match) => {
    return (arabicNumberMap as any)[match];
  });
}
