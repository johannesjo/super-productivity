import { inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export interface CustomTheme {
  id: string;
  name: string;
  url: string;
}

export const AVAILABLE_CUSTOM_THEMES: CustomTheme[] = [
  {
    id: 'default',
    name: 'Default',
    url: '',
  },
  {
    id: 'dracula',
    name: 'Dracula',
    url: 'assets/themes/dracula.css',
  },
  {
    id: 'nord-polar-night',
    name: 'Nord Polar Night',
    url: 'assets/themes/nord-polar-night.css',
  },
  {
    id: 'nord-snow-storm',
    name: 'Nord Snow Storm',
    url: 'assets/themes/nord-snow-storm.css',
  },
  {
    id: 'arc',
    name: 'Arc',
    url: 'assets/themes/arc.css',
  },
  {
    id: 'dark-base',
    name: 'Dark Base',
    url: 'assets/themes/dark-base.css',
  },
];

@Injectable({ providedIn: 'root' })
export class CustomThemeService {
  private document = inject<Document>(DOCUMENT);
  private currentThemeLinkElement: HTMLLinkElement | null = null;

  loadTheme(themeId: string): void {
    const theme = AVAILABLE_CUSTOM_THEMES.find((t) => t.id === themeId);

    if (!theme) {
      console.error(`Theme with id ${themeId} not found`);
      return;
    }

    // Remove existing theme
    this.unloadCurrentTheme();

    // If default theme, no need to load external CSS
    if (theme.id === 'default' || !theme.url) {
      return;
    }

    // Create new link element for theme
    const linkElement = this.document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = theme.url;
    linkElement.id = 'custom-theme-stylesheet';

    // Add to head
    this.document.head.appendChild(linkElement);
    this.currentThemeLinkElement = linkElement;
  }

  unloadCurrentTheme(): void {
    if (this.currentThemeLinkElement) {
      this.currentThemeLinkElement.remove();
      this.currentThemeLinkElement = null;
    }

    // Also remove any existing custom theme stylesheets
    const existingThemeLink = this.document.getElementById('custom-theme-stylesheet');
    if (existingThemeLink) {
      existingThemeLink.remove();
    }
  }

  getAvailableThemes(): CustomTheme[] {
    return AVAILABLE_CUSTOM_THEMES;
  }
}
