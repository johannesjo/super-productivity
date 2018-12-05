import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { ConfigSectionKey } from '../config.model';
import { ProjectCfgFormKey } from '../../../project/project.model';

@Component({
  selector: 'config-section',
  templateUrl: './config-section.component.html',
  styleUrls: ['./config-section.component.scss'],
  animations: expandAnimation,
})
export class ConfigSectionComponent implements OnInit {
  @Input() section;
  @Input() cfg;
  @Output() save: EventEmitter<{ sectionKey: ConfigSectionKey | ProjectCfgFormKey, config: any }> = new EventEmitter();

  public isExpanded = false;

  constructor() {
  }

  ngOnInit() {
  }

  onSave($event) {
    this.isExpanded = false;
    this.save.emit($event);
  }
}
