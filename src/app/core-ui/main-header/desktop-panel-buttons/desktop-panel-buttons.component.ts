import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { LayoutService } from '../../layout/layout.service';
import { TaskViewCustomizerService } from '../../../features/task-view-customizer/task-view-customizer.service';
import { T } from '../../../t.const';
import { KeyboardConfig } from '../../../features/config/keyboard-config.model';

@Component({
  selector: 'desktop-panel-buttons',
  standalone: true,
  imports: [MatIconButton, MatIcon, MatTooltip, TranslatePipe],
  template: `
    <button
      class="panel-btn"
      [disabled]="!isRouteWithSidePanel()"
      [class.isActive]="isShowTaskViewCustomizerPanel()"
      [class.isCustomized]="taskViewCustomizerService.isCustomized()"
      (click)="layoutService.toggleTaskViewCustomizerPanel()"
      mat-icon-button
      matTooltip="{{ T.GCF.KEYBOARD.TOGGLE_TASK_VIEW_CUSTOMIZER_PANEL | translate }} {{
        kb()?.toggleTaskViewCustomizerPanel
          ? '[' + kb()?.toggleTaskViewCustomizerPanel + ']'
          : ''
      }}"
    >
      <mat-icon>filter_list</mat-icon>
    </button>

    <button
      class="panel-btn e2e-toggle-issue-provider-panel"
      [disabled]="!isRouteWithSidePanel()"
      [class.isActive]="isShowIssuePanel()"
      (click)="layoutService.toggleAddTaskPanel()"
      mat-icon-button
      matTooltip="{{ T.MH.TOGGLE_SHOW_ISSUE_PANEL | translate }} {{
        kb()?.toggleIssuePanel ? '[' + kb()?.toggleIssuePanel + ']' : ''
      }}"
    >
      <mat-icon>playlist_add</mat-icon>
    </button>

    <button
      class="panel-btn e2e-toggle-notes-btn"
      [disabled]="!isRouteWithSidePanel()"
      [class.isActive]="isShowNotes()"
      (click)="layoutService.toggleNotes()"
      mat-icon-button
      matTooltip="{{ T.MH.TOGGLE_SHOW_NOTES | translate }} {{
        kb()?.openProjectNotes ? '[' + kb()?.openProjectNotes + ']' : ''
      }}"
    >
      <mat-icon>comment</mat-icon>
    </button>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .panel-btn {
        position: relative;
        transition: all 0.2s ease;
        overflow: visible !important;

        &.isActive {
          background-color: transparent;

          .mat-icon {
            transition: all 0.2s ease;
            transform: rotate(45deg);
          }

          &::after {
            border-radius: 4px;
            box-shadow: 0px -2px 3px 0px var(--theme-separator-alpha);
            background: var(--theme-sidebar-bg);
            content: '';
            width: 100%;
            position: absolute;
            left: 1px;
            top: 0;
            bottom: -5px;
            z-index: -1;
          }

          &.isCustomized::after {
            background: var(--c-accent);
          }
        }

        &:hover:not(.isActive):not(:disabled) {
          background-color: var(--hover-color, rgba(0, 0, 0, 0.04));
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: transparent !important;
        }

        &:disabled::after {
          background: transparent !important;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesktopPanelButtonsComponent {
  readonly T = T;
  readonly layoutService = inject(LayoutService);
  readonly taskViewCustomizerService = inject(TaskViewCustomizerService);

  readonly kb = input<KeyboardConfig | null>();
  readonly isRouteWithSidePanel = input.required<boolean>();
  readonly isShowTaskViewCustomizerPanel = input.required<boolean>();
  readonly isShowIssuePanel = input.required<boolean>();
  readonly isShowNotes = input.required<boolean>();
}
