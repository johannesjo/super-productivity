import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor() {
    this.load();
  }

  load() {
    // load project cfg
  }

  update() {
  }
}
