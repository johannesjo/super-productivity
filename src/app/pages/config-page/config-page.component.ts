import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { GlobalConfigService } from '../../features/config/global-config.service';
import {
  GLOBAL_CONFIG_FORM_CONFIG,
  GLOBAL_IMEX_FORM_CONFIG,
  GLOBAL_PRODUCTIVITY_FORM_CONFIG,
} from '../../features/config/global-config-form-config.const';
import {
  ConfigFormConfig,
  ConfigFormSection,
  GlobalConfigSectionKey,
  GlobalConfigState,
  GlobalSectionConfig,
} from '../../features/config/global-config.model';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { ProjectCfgFormKey } from '../../features/project/project.model';
import { T } from '../../t.const';
import { versions } from '../../../environments/versions';
import { IS_ELECTRON } from '../../app.constants';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { getAutomaticBackUpFormCfg } from '../../features/config/form-cfgs/automatic-backups-form.const';
import {
  MatButtonToggle,
  MatButtonToggleChange,
  MatButtonToggleGroup,
} from '@angular/material/button-toggle';
import { getAppVersionStr } from '../../util/get-app-version-str';
import { MatIcon } from '@angular/material/icon';
import { ConfigSectionComponent } from '../../features/config/config-section/config-section.component';
import { ConfigSoundFormComponent } from '../../features/config/config-sound-form/config-sound-form.component';
import { TranslatePipe } from '@ngx-translate/core';
import { SYNC_FORM } from '../../features/config/form-cfgs/sync-form.const';
import { PfapiService } from '../../pfapi/pfapi.service';
import { map, tap } from 'rxjs/operators';
import { SyncConfigService } from '../../imex/sync/sync-config.service';
import { GlobalThemeService } from '../../core/theme/global-theme.service';
import { AsyncPipe } from '@angular/common';
import { PluginManagementComponent } from '../../plugins/ui/plugin-management/plugin-management.component';
import { CollapsibleComponent } from '../../ui/collapsible/collapsible.component';
import { PluginBridgeService } from '../../plugins/plugin-bridge.service';
import { createPluginShortcutFormItems } from '../../features/config/form-cfgs/plugin-keyboard-shortcuts';
import { PluginService } from '../../plugins/plugin.service';
import { PluginShortcutCfg } from '../../plugins/plugin-api.model';

@Component({
  selector: 'config-page',
  templateUrl: './config-page.component.html',
  styleUrls: ['./config-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonToggleGroup,
    MatButtonToggle,
    MatIcon,
    ConfigSectionComponent,
    ConfigSoundFormComponent,
    TranslatePipe,
    AsyncPipe,
    PluginManagementComponent,
    CollapsibleComponent,
  ],
})
export class ConfigPageComponent implements OnInit, OnDestroy {
  private readonly _cd = inject(ChangeDetectorRef);
  private readonly _pfapiService = inject(PfapiService);
  readonly configService = inject(GlobalConfigService);
  readonly syncSettingsService = inject(SyncConfigService);
  readonly globalThemeService = inject(GlobalThemeService);
  private readonly _pluginBridgeService = inject(PluginBridgeService);
  private readonly _pluginService = inject(PluginService);

  T: typeof T = T;
  globalConfigFormCfg: ConfigFormConfig;
  globalImexFormCfg: ConfigFormConfig;
  globalProductivityConfigFormCfg: ConfigFormConfig;
  globalSyncConfigFormCfg = { ...SYNC_FORM };

  globalCfg?: GlobalConfigState;

  appVersion: string = getAppVersionStr();
  versions?: any = versions;

  // TODO needs to contain all sync providers....
  // TODO maybe handling this in an effect would be better????
  syncFormCfg$: Observable<any> = combineLatest([
    this._pfapiService.currentProviderPrivateCfg$,
    this.configService.sync$,
  ])
    .pipe(
      map(([currentProviderCfg, syncCfg]) => {
        if (!currentProviderCfg) {
          return syncCfg;
        }
        return {
          ...syncCfg,
          [currentProviderCfg.providerId]: currentProviderCfg.privateCfg,
        };
      }),
    )
    .pipe(tap((v) => console.log('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXA', v)));

  private _subs: Subscription = new Subscription();

  constructor() {
    // somehow they are only unproblematic if assigned here
    this.globalConfigFormCfg = GLOBAL_CONFIG_FORM_CONFIG.slice();
    this.globalImexFormCfg = GLOBAL_IMEX_FORM_CONFIG.slice();
    this.globalProductivityConfigFormCfg = GLOBAL_PRODUCTIVITY_FORM_CONFIG.slice();

    // NOTE: needs special handling cause of the async stuff
    if (IS_ANDROID_WEB_VIEW) {
      this.globalImexFormCfg = [...this.globalImexFormCfg, getAutomaticBackUpFormCfg()];
    } else if (IS_ELECTRON) {
      window.ea.getBackupPath().then((backupPath) => {
        this.globalImexFormCfg = [
          ...this.globalImexFormCfg,
          getAutomaticBackUpFormCfg(backupPath),
        ];
        this._cd.detectChanges();
      });
    }
  }

  ngOnInit(): void {
    this._subs.add(
      this.configService.cfg$.subscribe((cfg) => {
        this.globalCfg = cfg;
        // this._cd.detectChanges();
      }),
    );

    // Subscribe to plugin shortcuts changes for live updates
    this._subs.add(
      this._pluginBridgeService.shortcuts$.subscribe((shortcuts) => {
        console.log('Plugin shortcuts changed:', { shortcuts });
        this._updateKeyboardFormWithPluginShortcuts(shortcuts);
      }),
    );
  }

  private _updateKeyboardFormWithPluginShortcuts(shortcuts: PluginShortcutCfg[]): void {
    // Find keyboard form section
    const keyboardFormIndex = this.globalConfigFormCfg.findIndex(
      (section) => section.key === 'keyboard',
    );

    if (keyboardFormIndex === -1) {
      console.warn('Keyboard form section not found');
      return;
    }

    const keyboardSection = this.globalConfigFormCfg[keyboardFormIndex];

    // Remove existing plugin shortcuts and header from the form
    const filteredItems = (keyboardSection.items || []).filter((item) => {
      // Remove plugin shortcut items
      if (item.key?.toString().startsWith('plugin_')) {
        return false;
      }
      // Remove plugin shortcuts header
      if (
        item.type === 'tpl' &&
        item.templateOptions?.text ===
          (T.GCF.KEYBOARD.PLUGIN_SHORTCUTS || 'Plugin Shortcuts')
      ) {
        return false;
      }
      return true;
    });

    // Add current plugin shortcuts to the form
    let newItems = [...filteredItems];
    if (shortcuts.length > 0) {
      const pluginShortcutItems = createPluginShortcutFormItems(shortcuts);
      newItems = [...filteredItems, ...pluginShortcutItems];
      console.log(`Updated keyboard form with ${shortcuts.length} plugin shortcuts`);
    } else {
      console.log('No plugin shortcuts to add to keyboard form');
    }

    // Create a new keyboard section object to trigger change detection
    const newKeyboardSection = {
      ...keyboardSection,
      items: newItems,
    };

    // Create a new config array to ensure Angular detects the change
    this.globalConfigFormCfg = [
      ...this.globalConfigFormCfg.slice(0, keyboardFormIndex),
      newKeyboardSection,
      ...this.globalConfigFormCfg.slice(keyboardFormIndex + 1),
    ];

    // Trigger change detection
    this._cd.detectChanges();
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  trackBySectionKey(
    i: number,
    section: ConfigFormSection<{ [key: string]: any }>,
  ): string {
    return section.key;
  }

  saveGlobalCfg($event: {
    sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey;
    config: any;
  }): void {
    const config = $event.config;
    const sectionKey = $event.sectionKey as GlobalConfigSectionKey;

    if (!sectionKey || !config) {
      throw new Error('Not enough data');
    } else {
      this.configService.updateSection(sectionKey, config);
    }
  }

  // TODO
  saveSyncFormCfg($event: { config: any }): void {}

  updateDarkMode(ev: MatButtonToggleChange): void {
    if (ev.value) {
      this.globalThemeService.darkMode$.next(ev.value);
    }
  }

  getGlobalCfgSection(
    sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey,
  ): GlobalSectionConfig {
    return (this.globalCfg as any)[sectionKey];
  }
}
