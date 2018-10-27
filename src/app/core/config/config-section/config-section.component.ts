import { Component, Input, OnInit } from '@angular/core';
import { expandAnimation } from '../../../ui/animations/expand.ani';

@Component({
  selector: 'config-section',
  templateUrl: './config-section.component.html',
  styleUrls: ['./config-section.component.scss'],
  animations: expandAnimation,
})
export class ConfigSectionComponent implements OnInit {
  @Input() section;
  @Input() cfg;

  constructor() {
  }

  ngOnInit() {
  }

}
