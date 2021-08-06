import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { T } from '../../t.const';
import {
  ConfigFormConfig,
  ConfigFormSection,
  GlobalConfigSectionKey,
} from '../../features/config/global-config.model';
import { Subscription } from 'rxjs';
import { GLOBAL_CONFIG_FORM_CONFIG } from '../../features/config/global-config-form-config.const';
import { IS_ELECTRON } from '../../app.constants';
import {
  WorkContext,
  WorkContextAdvancedCfg,
  WorkContextThemeCfg,
} from '../../features/work-context/work-context.model';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { Tag, TagCfgFormKey } from '../../features/tag/tag.model';
import { TagService } from '../../features/tag/tag.service';
import { ProjectCfgFormKey } from '../../features/project/project.model';
import { WORK_CONTEXT_THEME_CONFIG_FORM_CONFIG } from '../../features/work-context/work-context.const';
import { BASIC_TAG_CONFIG_FORM_CONFIG } from '../../features/tag/tag-form-cfg.const';
import { distinctUntilChanged } from 'rxjs/operators';
import { isObject } from '../../util/is-object';

@Component({
  selector: 'project-settings',
  templateUrl: './tag-settings-page.component.html',
  styleUrls: ['./tag-settings-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagSettingsPageComponent implements OnInit, OnDestroy {
  T: typeof T = T;
  tagThemeSettingsFormCfg: ConfigFormSection<WorkContextThemeCfg>;
  globalConfigFormCfg: ConfigFormConfig;
  basicFormCfg: ConfigFormSection<Tag>;

  activeWorkContext: WorkContext | null = null;
  workContextAdvCfg: WorkContextAdvancedCfg | null = null;
  currentWorkContextTheme?: WorkContextThemeCfg;

  private _subs: Subscription = new Subscription();

  constructor(
    public readonly tagService: TagService,
    public readonly workContextService: WorkContextService,
    private _cd: ChangeDetectorRef,
  ) {
    // somehow they are only unproblematic if assigned here
    this.tagThemeSettingsFormCfg = WORK_CONTEXT_THEME_CONFIG_FORM_CONFIG;
    this.basicFormCfg = BASIC_TAG_CONFIG_FORM_CONFIG;
    this.globalConfigFormCfg = GLOBAL_CONFIG_FORM_CONFIG.filter(
      (cfg) => IS_ELECTRON || !cfg.isElectronOnly,
    );
  }

  ngOnInit(): void {
    this._subs.add(
      this.workContextService.activeWorkContext$
        .pipe(
          distinctUntilChanged((a: WorkContext, b: WorkContext): boolean => {
            // needed because otherwise this wouldn't work while tracking time; see: #1428
            if (isObject(a) && isObject(b)) {
              return (
                a.title === a.title &&
                a.icon === a.icon &&
                JSON.stringify(a.advancedCfg) === JSON.stringify(b.advancedCfg)
              );
            } else {
              return a === b;
            }
          }),
        )
        .subscribe((ac) => {
          this.activeWorkContext = ac;
          this.workContextAdvCfg = ac.advancedCfg;
          this.currentWorkContextTheme = ac.theme;
          this._cd.detectChanges();
        }),
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  saveTagThemCfg($event: {
    sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey | TagCfgFormKey;
    config: WorkContextThemeCfg;
  }): void {
    if (!$event.config || this.activeWorkContext === null) {
      throw new Error('Not enough data');
    } else {
      this.tagService.updateTag(this.activeWorkContext.id, {
        theme: {
          ...$event.config,
        },
      });
    }
  }

  saveBasicSettings($event: {
    sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey | TagCfgFormKey;
    config: Tag;
  }): void {
    if (!$event.config || this.activeWorkContext === null) {
      throw new Error('Not enough data');
    } else {
      const { title, icon, color } = $event.config;
      this.tagService.updateTag(this.activeWorkContext.id, {
        title,
        icon,
        color,
      });
    }
  }
}
