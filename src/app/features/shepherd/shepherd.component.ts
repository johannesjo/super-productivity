import { AfterViewInit, ChangeDetectionStrategy, Component } from '@angular/core';
import { ShepherdService } from './shepherd.service';
import { LS } from '../../core/persistence/storage-keys.const';
import { concatMap, first } from 'rxjs/operators';
import { DataInitService } from '../../core/data-init/data-init.service';
import { ProjectService } from '../project/project.service';

@Component({
  selector: 'shepherd',
  template: '',
  // templateUrl: './shepherd.component.html',
  // styleUrls: ['./shepherd.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ShepherdComponent implements AfterViewInit {
  constructor(
    private shepherdMyService: ShepherdService,
    private _dataInitService: DataInitService,
    private _projectService: ProjectService,
  ) {}

  ngAfterViewInit(): void {
    if (!localStorage.getItem(LS.IS_SHOW_TOUR) && navigator.userAgent !== 'NIGHTWATCH') {
      this._dataInitService.isAllDataLoadedInitially$
        .pipe(concatMap(() => this._projectService.list$.pipe(first())))
        .subscribe((projectList) => {
          if (projectList.length <= 2) {
            this.shepherdMyService.init();
          } else {
            localStorage.setItem(LS.IS_SHOW_TOUR, 'true');
          }
        });
    }
  }
}
