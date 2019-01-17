import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentFactory,
  ComponentFactoryResolver,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { ConfigFormSection, ConfigSectionKey } from '../config.model';
import { ProjectCfgFormKey } from '../../project/project.model';
import { GoogleSyncCfgComponent } from '../../google/google-sync-cfg/google-sync-cfg.component';
import { JiraCfgComponent } from '../../issue/jira/jira-cfg/jira-cfg.component';
import { FileImexComponent } from '../../../imex/file-imex/file-imex.component';

@Component({
  selector: 'config-section',
  templateUrl: './config-section.component.html',
  styleUrls: ['./config-section.component.scss'],
  animations: expandAnimation,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigSectionComponent implements OnInit {
  @Input() section: ConfigFormSection;
  @Input() cfg: any;
  @Output() save: EventEmitter<{ sectionKey: ConfigSectionKey | ProjectCfgFormKey, config: any }> = new EventEmitter();

  @ViewChild('customForm', {read: ViewContainerRef}) customFormRef: ViewContainerRef;

  isExpanded = false;

  constructor(
    private _cd: ChangeDetectorRef,
    private _componentFactoryResolver: ComponentFactoryResolver,
  ) {
  }

  ngOnInit(): void {
    if (this.section && this.section.customSection) {
      this._loadCustomSection(this.section.customSection);
    }
  }

  onSave($event) {
    this.isExpanded = false;
    this.save.emit($event);
  }

  private _loadCustomSection(customSection) {
    let componentToRender;

    switch (customSection) {
      case 'FILE_IMPORT_EXPORT':
        componentToRender = FileImexComponent;
        break;


      case 'GOOGLE_SYNC':
        componentToRender = GoogleSyncCfgComponent;
        break;

      case 'JIRA_CFG':
        componentToRender = JiraCfgComponent;
        break;
    }

    if (componentToRender) {
      const factory: ComponentFactory<any> = this._componentFactoryResolver.resolveComponentFactory(componentToRender);
      const ref = this.customFormRef.createComponent(factory);

      // NOTE: important that this is set only if we actually have a value
      // otherwise the default fallback will be overwritten
      if (this.cfg) {
        ref.instance.cfg = this.cfg;
      }

      ref.instance.section = this.section;

      if (ref.instance.save) {
        ref.instance.save.subscribe(v => {
          this.onSave(v);
          this._cd.detectChanges();
        });
      }
    }
  }
}
