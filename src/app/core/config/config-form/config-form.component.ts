import { Component, OnInit } from '@angular/core';
import { Input } from '@angular/core';

@Component({
  selector: 'config-form',
  templateUrl: './config-form.component.html',
  styleUrls: ['./config-form.component.css']
})
export class ConfigFormComponent implements OnInit {
  @Input() formCfg;
  @Input() cfg;

  constructor() {
  }

  ngOnInit() {
  }

}
