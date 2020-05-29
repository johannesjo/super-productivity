import {Injectable} from '@angular/core';

import {Dropbox} from 'dropbox';
import {DROPBOX_API_TOKEN} from './dropbox.const';

@Injectable({
  providedIn: 'root'
})
export class DropboxApiService {
  dbx: Dropbox = new Dropbox({accessToken: DROPBOX_API_TOKEN});

  constructor() {
    console.log(this.dbx);

    this.dbx.filesListFolder({path: ''})
      .then((response) => {
        console.log(response);
      })
      .catch((error) => {
        console.log(error);
      });
  }
}
