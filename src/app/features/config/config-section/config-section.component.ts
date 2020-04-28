import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentFactory,
  ComponentFactoryResolver,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import {expandAnimation} from '../../../ui/animations/expand.ani';
import {ConfigFormSection, CustomCfgSection, GlobalConfigSectionKey} from '../global-config.model';
import {ProjectCfgFormKey} from '../../project/project.model';
import {GoogleSyncCfgComponent} from '../../google/google-sync-cfg/google-sync-cfg.component';
import {JiraCfgComponent} from '../../issue/providers/jira/jira-view-components/jira-cfg/jira-cfg.component';
import {FileImexComponent} from '../../../imex/file-imex/file-imex.component';
import {Subscription} from 'rxjs';
import {TranslateService} from '@ngx-translate/core';
import {WorkContextService} from '../../work-context/work-context.service';
import {TagCfgFormKey} from '../../tag/tag.model';
import {SimpleCounterCfgComponent} from '../../simple-counter/simple-counter-cfg/simple-counter-cfg.component';

@Component({
  selector: 'config-section',
  templateUrl: './config-section.component.html',
  styleUrls: ['./config-section.component.scss'],
  animations: expandAnimation,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigSectionComponent implements OnInit, OnDestroy {
  @Input() section: ConfigFormSection<{ [key: string]: any }>;
  @Output() save: EventEmitter<{ sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey | TagCfgFormKey, config: any }> = new EventEmitter();
  @ViewChild('customForm', {read: ViewContainerRef, static: true}) customFormRef: ViewContainerRef;
  isExpanded = false;
  private _subs = new Subscription();
  private _instance;
  private _viewDestroyTimeout: number;

  constructor(
    private _cd: ChangeDetectorRef,
    private _componentFactoryResolver: ComponentFactoryResolver,
    private _workContextService: WorkContextService,
    private _translateService: TranslateService,
  ) {
  }

  private _cfg: any;

  get cfg() {
    return this._cfg;
  }

  @Input() set cfg(v: any) {
    this._cfg = v;
    if (v && this._instance) {
      this._instance.cfg = {...v};
    }
  }

  ngOnInit(): void {
    if (this.section && this.section.customSection) {
      this._loadCustomSection(this.section.customSection);
    }

    // mark for check manually to make translations work with ngx formly
    this._subs.add(this._translateService.onLangChange.subscribe(() => {
      this._cd.detectChanges();
    }));

    // mark for check manually to make it work with ngx formly
    this._subs.add(this._workContextService.onWorkContextChange$.subscribe(() => {
      this._cd.markForCheck();

      if (this.section && this.section.customSection) {
        this.customFormRef.clear();
        // dirty trick to make sure data is actually there
        this._viewDestroyTimeout = setTimeout(() => {
          this._loadCustomSection(this.section.customSection);
          this._cd.detectChanges();
        });
      }
    }));
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
    if (this._viewDestroyTimeout) {
      window.clearTimeout(this._viewDestroyTimeout);
    }
  }

  onSave($event) {
    this.isExpanded = false;
    this.save.emit($event);
  }

  private _loadCustomSection(customSection: CustomCfgSection) {
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

      case 'SIMPLE_COUNTER_CFG':
        componentToRender = SimpleCounterCfgComponent;
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
      this._instance = ref.instance;
    }
  }
}
