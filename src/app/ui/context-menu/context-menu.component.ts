import {
  ChangeDetectionStrategy,
  Component,
  input,
  OnInit,
  TemplateRef,
  viewChild,
} from '@angular/core';
import {
  MatMenu,
  MatMenuContent,
  MatMenuItem,
  MatMenuTrigger,
} from '@angular/material/menu';
import { MatIconButton } from '@angular/material/button';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'context-menu',
  imports: [MatMenu, MatMenuTrigger, MatMenuContent, NgTemplateOutlet],
  templateUrl: './context-menu.component.html',
  styleUrl: './context-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextMenuComponent implements OnInit {
  leftClickTriggerEl = input<HTMLElement | MatMenuItem | MatIconButton | undefined>();
  rightClickTriggerEl = input.required<HTMLElement | MatMenuItem | MatIconButton>();
  contextMenu = input.required<TemplateRef<any>>();

  readonly contextMenuTriggerEl = viewChild.required('contextMenuTriggerEl', {
    read: MatMenuTrigger,
  });
  contextMenuPosition: { x: string; y: string } = { x: '0px', y: '0px' };

  ngOnInit(): void {
    const tEl = this.rightClickTriggerEl();
    const el = tEl instanceof HTMLElement ? tEl : (tEl as any)._elementRef.nativeElement;

    el.addEventListener('contextmenu', (ev) => {
      this.openContextMenu(ev);
    });
    el.addEventListener('longPressIOS', (ev) => {
      this.openContextMenu(ev);
    });

    const leftClickEl = this.leftClickTriggerEl();
    if (leftClickEl) {
      const htmlLeftClickEl =
        leftClickEl instanceof HTMLElement
          ? leftClickEl
          : (leftClickEl as any)._elementRef.nativeElement;
      htmlLeftClickEl.addEventListener('click', (ev) => {
        this.openContextMenu(ev);
      });
    }
  }

  private openContextMenu(event: TouchEvent | MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuPosition.x =
      ('touches' in event ? event.touches[0].clientX : event.clientX) + 'px';
    this.contextMenuPosition.y =
      ('touches' in event ? event.touches[0].clientY : event.clientY) + 'px';
    const contextMenuTriggerEl = this.contextMenuTriggerEl();
    contextMenuTriggerEl.menuData = {
      x: this.contextMenuPosition.x,
      y: this.contextMenuPosition.y,
    };
    contextMenuTriggerEl.openMenu();
  }
}
