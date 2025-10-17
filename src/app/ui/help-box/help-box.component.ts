import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  WritableSignal,
  signal,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { expandFadeAnimation } from '../animations/expand.ani';
import { lsGetBoolean, lsSetItem } from '../../util/ls-util';

@Component({
  selector: 'help-box',
  templateUrl: './help-box.component.html',
  styleUrls: ['./help-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation],
  imports: [MatIcon, MatIconButton],
})
export class HelpBoxComponent implements OnInit {
  @Input({ required: true }) lsKey!: string;

  isVisible: WritableSignal<boolean> = signal(true);

  ngOnInit(): void {
    // Check localStorage to determine if the help box should be shown
    const isDismissed = lsGetBoolean(this.lsKey, false);
    this.isVisible.set(!isDismissed);
  }

  onClose(): void {
    // Set the localStorage key to true to indicate the box was dismissed
    lsSetItem(this.lsKey, true);
    this.isVisible.set(false);
  }
}
