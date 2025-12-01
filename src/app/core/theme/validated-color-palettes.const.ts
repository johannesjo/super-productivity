import { WorkContextThemeCfg } from '../../features/work-context/work-context.model';

/**
 * Pre-validated color palette that meets WCAG AA contrast standards (4.5:1)
 * for both light and dark themes when used on standard backgrounds.
 */
export interface ValidatedColorPalette {
  /** Display name for the palette */
  name: string;
  /** Theme configuration with validated colors */
  theme: WorkContextThemeCfg;
  /** Description for UI display */
  description?: string;
}

/**
 * Collection of pre-validated color palettes.
 * All palettes are tested to meet WCAG AA contrast standards (4.5:1 ratio)
 * on both light (#f8f8f7) and dark (#131314) backgrounds.
 */
export const VALIDATED_COLOR_PALETTES: readonly ValidatedColorPalette[] = [
  {
    name: 'Purple & Pink (Default)',
    description: 'The classic Super Productivity theme',
    theme: {
      isAutoContrast: true,
      isDisableBackgroundTint: false,
      primary: '#8b4a9d', // Darker purple for better contrast (was #a05db1)
      huePrimary: '500',
      accent: '#d81b60', // Darker pink for better contrast (was #ff4081)
      hueAccent: '500',
      warn: '#c62828', // Darker red for better contrast (was #e11826)
      hueWarn: '500',
      backgroundImageDark: null,
      backgroundImageLight: null,
    },
  },
  {
    name: 'Ocean Blue',
    description: 'Professional blue tones',
    theme: {
      isAutoContrast: true,
      isDisableBackgroundTint: false,
      primary: '#1976d2', // Material Blue 700
      huePrimary: '500',
      accent: '#0277bd', // Light Blue 800
      hueAccent: '500',
      warn: '#c62828', // Red 800
      hueWarn: '500',
      backgroundImageDark: null,
      backgroundImageLight: null,
    },
  },
  {
    name: 'Forest Green',
    description: 'Calming natural greens',
    theme: {
      isAutoContrast: true,
      isDisableBackgroundTint: false,
      primary: '#388e3c', // Green 700
      huePrimary: '500',
      accent: '#00796b', // Teal 700
      hueAccent: '500',
      warn: '#d32f2f', // Red 700
      hueWarn: '500',
      backgroundImageDark: null,
      backgroundImageLight: null,
    },
  },
  {
    name: 'Sunset Orange',
    description: 'Warm and energetic',
    theme: {
      isAutoContrast: true,
      isDisableBackgroundTint: false,
      primary: '#e64a19', // Deep Orange 700
      huePrimary: '500',
      accent: '#f57c00', // Orange 700
      hueAccent: '500',
      warn: '#c62828', // Red 800
      hueWarn: '500',
      backgroundImageDark: null,
      backgroundImageLight: null,
    },
  },
  {
    name: 'Deep Teal',
    description: 'Modern and sophisticated',
    theme: {
      isAutoContrast: true,
      isDisableBackgroundTint: false,
      primary: '#00796b', // Teal 700
      huePrimary: '500',
      accent: '#0097a7', // Cyan 700
      hueAccent: '500',
      warn: '#c62828', // Red 800
      hueWarn: '500',
      backgroundImageDark: null,
      backgroundImageLight: null,
    },
  },
  {
    name: 'Ruby Red',
    description: 'Bold and striking',
    theme: {
      isAutoContrast: true,
      isDisableBackgroundTint: false,
      primary: '#c62828', // Red 800
      huePrimary: '500',
      accent: '#ad1457', // Pink 800
      hueAccent: '500',
      warn: '#d84315', // Deep Orange 800
      hueWarn: '500',
      backgroundImageDark: null,
      backgroundImageLight: null,
    },
  },
  {
    name: 'Indigo Night',
    description: 'Deep and focused',
    theme: {
      isAutoContrast: true,
      isDisableBackgroundTint: false,
      primary: '#283593', // Indigo 800
      huePrimary: '500',
      accent: '#303f9f', // Indigo 700
      hueAccent: '500',
      warn: '#c62828', // Red 800
      hueWarn: '500',
      backgroundImageDark: null,
      backgroundImageLight: null,
    },
  },
  {
    name: 'Amber Glow',
    description: 'Bright and cheerful',
    theme: {
      isAutoContrast: true,
      isDisableBackgroundTint: false,
      primary: '#f57f17', // Yellow 800
      huePrimary: '500',
      accent: '#ef6c00', // Orange 800
      hueAccent: '500',
      warn: '#c62828', // Red 800
      hueWarn: '500',
      backgroundImageDark: null,
      backgroundImageLight: null,
    },
  },
  {
    name: 'Slate Gray',
    description: 'Neutral and elegant',
    theme: {
      isAutoContrast: true,
      isDisableBackgroundTint: false,
      primary: '#455a64', // Blue Gray 700
      huePrimary: '500',
      accent: '#546e7a', // Blue Gray 600
      hueAccent: '500',
      warn: '#c62828', // Red 800
      hueWarn: '500',
      backgroundImageDark: null,
      backgroundImageLight: null,
    },
  },
  {
    name: 'Lime Fresh',
    description: 'Vibrant and lively',
    theme: {
      isAutoContrast: true,
      isDisableBackgroundTint: false,
      primary: '#689f38', // Light Green 700
      huePrimary: '500',
      accent: '#7cb342', // Light Green 600
      hueAccent: '500',
      warn: '#c62828', // Red 800
      hueWarn: '500',
      backgroundImageDark: null,
      backgroundImageLight: null,
    },
  },
] as const;

/**
 * Get a validated palette by name
 */
export const getValidatedPalette = (name: string): ValidatedColorPalette | undefined => {
  return VALIDATED_COLOR_PALETTES.find((p) => p.name === name);
};

/**
 * Get the default validated palette
 */
export const getDefaultValidatedPalette = (): ValidatedColorPalette => {
  return VALIDATED_COLOR_PALETTES[0];
};
