import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'tree-drop-zones',
  standalone: true,
  template: `
    <div
      class="drop drop--before"
      data-drop-zone="before"
      [attr.data-node-id]="nodeId()"
      [class.is-over]="overBefore()"
    ></div>
    <div
      class="drop drop--after"
      data-drop-zone="after"
      [attr.data-node-id]="nodeId()"
      [class.is-over]="overAfter()"
    ></div>
  `,
  styles: [
    `
      .drop {
        height: 50%;
        pointer-events: none;
        width: 100%;
        background: transparent;
        position: absolute;
        z-index: 1;

        :host-context(.tree.is-dragging) & {
          pointer-events: all;
          background: rgba(0, 123, 255, 0.1);
          z-index: 10;
        }

        &:hover {
          background: rgba(0, 123, 255, 0.15);
        }
      }

      .drop--before,
      .drop--after {
      }

      .drop--before {
        top: 0px;

        :host-context(.tree.is-dragging) & {
          background: rgba(255, 165, 0, 0.1); /* Light orange when dragging */
        }

        &.is-over {
          background: rgba(
            255,
            165,
            0,
            0.25
          ) !important; /* Darker orange when hovering */
        }
      }

      .drop--after {
        bottom: 0px;

        :host-context(.tree.is-dragging) & {
          background: rgba(34, 139, 34, 0.1); /* Light green when dragging */
        }

        &.is-over {
          background: rgba(34, 139, 34, 0.25) !important; /* Darker green when hovering */
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeDropZonesComponent {
  readonly nodeId = input.required<string>();
  readonly overBefore = input(false);
  readonly overAfter = input(false);
}
