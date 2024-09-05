import { Directive, HostListener } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';

@Directive({
  selector: '[contextMenu]',
})
export class ContextMenuDirective {
  contextMenuPosition: { x: string; y: string } = { x: '0px', y: '0px' };

  constructor(private readonly matMenuTrigger: MatMenuTrigger) {}

  @HostListener('contextmenu', ['$event'])
  onRightClick(event: MouseEvent): void {
    this.openContextMenu(event);
  }

  @HostListener('longPressIOS', ['$event'])
  onLongPress(event: TouchEvent): void {
    this.openContextMenu(event);
  }

  private openContextMenu(event: TouchEvent | MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuPosition.x =
      ('touches' in event ? event.touches[0].clientX : event.clientX) + 'px';
    this.contextMenuPosition.y =
      ('touches' in event ? event.touches[0].clientY : event.clientY) + 'px';
    this.matMenuTrigger.menuData = {
      x: this.contextMenuPosition.x,
      y: this.contextMenuPosition.y,
    };
    this.matMenuTrigger.openMenu();
  }
}
