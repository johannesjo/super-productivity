/**
 * Represents a CSS style object
 * @example
 * const style: StyleObject = { width: '100px', height: '200px' };
 */
export type StyleObject = Record<string, string>;

/**
 * Represents a CSS string
 * @example
 * const css: CssString = "width: 100px; height: 200px;";
 */
export type CssString = `${string}: ${string};`;

/**
 * Converts a StyleObject to CssString
 *
 * @example
 * const style: StyleObject = { width: '100px', height: '200px' };
 * const cssString: CssString = StyleObjectToString(style);
 * console.log(cssString); // "width: 100px; height: 200px;"
 */
export const StyleObjectToString = (style: StyleObject): CssString => {
  return Object.entries(style)
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ') as CssString;
};
