// tslint:disable:variable-name
import { Inject, Injectable, OnDestroy } from '@angular/core';
import { RxCollection, RxDocument, RxLocalDocument } from 'rxdb';
import RxDB from 'rxdb/plugins/core';
import { defer, from, Observable, ReplaySubject } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { NgxRxdbCollectionConfig } from './ngx-rxdb.interface';
import { NgxRxdbService } from './ngx-rxdb.service';

@Injectable()
export class NgxRxdbCollectionService<T> implements OnDestroy {
  private _config: NgxRxdbCollectionConfig;
  private _inited: ReplaySubject<boolean>;
  private _collection: RxCollection<T>;
  public get collection() {
    if (RxDB.isRxCollection(this._collection)) {
      return this._collection;
    } else {
      console.warn(`RxdbService: returned false for RxDB.isRxCollection(${this._config.name})`);
      return null;
    }
  }
  public get db() {
    return this.dbService.db;
  }

  constructor(private dbService: NgxRxdbService, @Inject('RXDB_FEATURE_CONFIG') private config: NgxRxdbCollectionConfig) {
    this._config = config;
  }

  async ngOnDestroy() {
    // tslint:disable-next-line:no-unused-expression
    this.collection && await this.collection.destroy();
  }

  collectionLoaded$(): Observable<boolean> {
    if (this._inited) {
      return this._inited.asObservable();
    }

    this._inited = new ReplaySubject();

    this.dbService.createCollection(this._config).then(collection => {
      this._collection = collection;
      this._inited.next(true);
      this._inited.complete();
    });

    return this._inited.asObservable();
  }

  docs(rules?: any, sortBy?: string, limit?: number): Observable<RxDocument<T>[]> {
    return this.collectionLoaded$().pipe(
      filter(inited => !!inited),
      switchMap(() => this.collection
      .find(rules)
      .sort(sortBy || 'primary')
      .limit(limit)
      .$)
    );
  }

  insertLocal(id: string, data: any): Observable<RxLocalDocument<any>> {
    return from(this.collection.upsertLocal(id, data));
  }

  getLocal(id: string): Observable<RxLocalDocument<any>> {
    return from(this.collection.getLocal(id));
  }

  updateLocal(id: string, prop: string, value: any): Observable<any> {
    return defer(async () => {
      const localDoc = await this.collection.getLocal(id);
      // change data
      localDoc.set(prop, value);
      await localDoc.save();
    });
  }

  removeLocal(id: string): Observable<any> {
    return defer(async () => {
      const localDoc = await this.collection.getLocal(id);
      return localDoc.remove();
    });
  }

  insert(data: T): Observable<RxDocument<T>> {
    return from(this.collection.insert(data));
  }

  upsert(data: T): Observable<RxDocument<T>> {
    return from(this.collection.upsert(data));
  }

  update(id, data: Partial<T>): Observable<RxDocument<T>> {
    return defer(async () => {
      const doc = await this.collection.findOne(id).exec();
      return doc.update({$set: { ...data }});
    });
  }

  set(id, prop: string, value: any): Observable<any> {
    return defer(async () => {
      const doc = await this.collection.findOne(id).exec();
      doc.set(prop, value);
      return doc.save();
    });
  }

  remove(id): Observable<any> {
    return defer(async () => {
      const doc = await this.collection.findOne(id).exec();
      return doc.remove();
    });
  }

  /**
   * removes all docs by given query
   * also represents a way ti use 'pouch.bulkDocs' with RxDb
   */
  removeBulkBy(rulesObj) {
    return defer(async () => {
      try {
        const docs = await this.collection.find(rulesObj).exec();
        if (docs && docs.length) {
          // tslint:disable-next-line:no-string-literal
          const deletedDocs = docs.map(doc => ({ _id: doc.primary, _rev: doc['_rev'], _deleted: true}));
          return this.collection.pouch.bulkDocs(deletedDocs);
        }
      } catch (error) {
        console.log(error);
        return null;
      }
    });
  }
}
