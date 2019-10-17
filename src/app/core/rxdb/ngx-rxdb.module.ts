// tslint:disable:member-access array-type max-classes-per-file
import {APP_INITIALIZER, InjectionToken, Injector, ModuleWithProviders, NgModule} from '@angular/core';
import {NgxRxdbCollectionService} from './ngx-rxdb-collection.service';
import {NgxRxdbCollectionConfig, NgxRxdbConfig} from './ngx-rxdb.interface';
import {NgxRxdbService} from './ngx-rxdb.service';

export const RXDB_CONFIG = new InjectionToken<NgxRxdbConfig>('RXDB_CONFIG');

export function dbInitializerFactory(rxdb: NgxRxdbService, injector: Injector): any {
  const config: NgxRxdbConfig = injector.get('RXDB_CONFIG');
  return async () => {
    await rxdb.initDb(config);
  };
}

/**
 * main module which should be imported once in app module, will init RxDbDatabase with given configuration
 */
@NgModule()
export class NgxRxdbModule {
  constructor(private rxdb: NgxRxdbService) {
  }

  static forFeature(config: NgxRxdbCollectionConfig): ModuleWithProviders {
    return {
      ngModule: NgxRxdbFeatureModule,
      providers: [{provide: 'RXDB_FEATURE_CONFIG', useValue: config /* , multi: true */}, NgxRxdbCollectionService],
    };
  }

  static forRoot(config: NgxRxdbConfig): ModuleWithProviders {
    return {
      ngModule: NgxRxdbModule,
      providers: [
        {provide: 'RXDB_CONFIG', useValue: config},
        NgxRxdbService,
        {
          provide: APP_INITIALIZER,
          useFactory: dbInitializerFactory,
          deps: [NgxRxdbService, Injector],
          multi: true,
        },
      ],
    };
  }

}

/**
 * feature module which should be imported in lazy feature modules, will init RxDbCollection with given configuration
 */
@NgModule({})
export class NgxRxdbFeatureModule {
  constructor(private collectionService: NgxRxdbCollectionService<any>) {
    // init collection via loader
    this.collectionService.collectionLoaded$().subscribe(() => {
    });
  }
}
