import {Injectable} from '@angular/core';
import * as RemoteStorage from 'remotestoragejs';
import {GOOGLE_SETTINGS} from '../../features/google/google.const';

@Injectable({
  providedIn: 'root'
})
export class RemoteStorageService {

  rs: RemoteStorage = new RemoteStorage({logging: true});

  constructor() {
    this.rs.access.claim('superproductivity', 'rw');
    this.rs.caching.enable('/superproductivity/');
    this.rs.setApiKeys({
      googledrive: GOOGLE_SETTINGS.CLIENT_ID
    });
  }
}

