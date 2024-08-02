import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'config-sound-form',
  templateUrl: './config-sound-form.component.html',
  styleUrls: ['./config-sound-form.component.scss'],
})
export class ConfigSoundFormComponent {
  readonly soundForm = new FormGroup({
    formC: new FormControl(null),
    doneSound: new FormControl(null),
    breakSound: new FormControl(null),
    increasePitch: new FormControl(null),
  });
  doneSounds: Array<string> = ['sound1', 'sound2'];
  breakSounds: Array<string> = ['sound1', 'sound2'];
  incCheck = false;
  constructor() {}
}
