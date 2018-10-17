import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { Validators } from '@angular/forms';

@Component({
  selector: 'jira-cfg-stepper',
  templateUrl: './jira-cfg-stepper.component.html',
  styleUrls: ['./jira-cfg-stepper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JiraCfgStepperComponent implements OnInit {
  firstFormGroup: FormGroup = this._formBuilder.group({
    firstCtrl: ['', Validators.required]
  });
  secondFormGroup: FormGroup = this._formBuilder.group({
    secondCtrl: ['', Validators.required]
  });
  thirdFormGroup: FormGroup = this._formBuilder.group({
    secondCtrl: ['', Validators.required]
  });

  constructor(private _formBuilder: FormBuilder) {
  }

  ngOnInit() {
  }

}
