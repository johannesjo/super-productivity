import { Component, inject } from '@angular/core';
import {
  MatButtonToggle,
  MatButtonToggleChange,
  MatButtonToggleGroup,
} from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { AsyncPipe } from '@angular/common';
import { GlobalThemeService } from '../global-theme.service';
import { CustomThemeService } from '../custom-theme.service';
import { GlobalConfigService } from '../../../features/config/global-config.service';

@Component({
  selector: 'theme-selector',
  standalone: true,
  imports: [
    MatButtonToggleGroup,
    MatButtonToggle,
    MatIcon,
    MatSelect,
    MatOption,
    MatFormField,
    MatLabel,
    AsyncPipe,
  ],
  template: `
    <div class="theme-selector-container">
      <div class="dark-mode-select">
        <h3>Dark Mode</h3>
        <mat-button-toggle-group
          name="darkMode"
          aria-label="Dark mode selection"
          [value]="globalThemeService.darkMode$ | async"
          (change)="updateDarkMode($event)"
        >
          <mat-button-toggle value="system">
            <mat-icon>computer</mat-icon>
            System
          </mat-button-toggle>
          <mat-button-toggle value="dark">
            <mat-icon>dark_mode</mat-icon>
            Dark
          </mat-button-toggle>
          <mat-button-toggle value="light">
            <mat-icon>light_mode</mat-icon>
            Light
          </mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <div class="theme-select">
        <h3>Theme</h3>
        <mat-form-field appearance="outline">
          <mat-label>Select Theme</mat-label>
          <mat-select
            [value]="(configService.misc$ | async)?.customTheme || 'default'"
            (selectionChange)="updateCustomTheme($event.value)"
          >
            @for (theme of customThemeService.getAvailableThemes(); track theme.id) {
              <mat-option [value]="theme.id">{{ theme.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
    </div>
  `,
  styles: [
    `
      .theme-selector-container {
        display: flex;
        flex-direction: column;
        gap: 24px;
        margin: 20px 0;
      }

      .dark-mode-select,
      .theme-select {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      h3 {
        margin: 0;
        min-width: 100px;
      }

      mat-form-field {
        flex: 1;
        max-width: 300px;
      }

      @media (max-width: 600px) {
        .dark-mode-select,
        .theme-select {
          flex-direction: column;
          align-items: flex-start;
        }

        mat-form-field {
          width: 100%;
          max-width: none;
        }
      }
    `,
  ],
})
export class ThemeSelectorComponent {
  readonly globalThemeService = inject(GlobalThemeService);
  readonly customThemeService = inject(CustomThemeService);
  readonly configService = inject(GlobalConfigService);

  updateDarkMode(ev: MatButtonToggleChange): void {
    if (ev.value) {
      this.globalThemeService.darkMode$.next(ev.value);
    }
  }

  updateCustomTheme(themeId: string): void {
    this.configService.updateSection('misc', { customTheme: themeId });
  }
}
