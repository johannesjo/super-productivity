import { AfterViewInit, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ShepherdService } from './shepherd.service';
import { LS } from '../../core/persistence/storage-keys.const';
import { concatMap, first } from 'rxjs/operators';
import { ProjectService } from '../project/project.service';
import { DataInitStateService } from '../../core/data-init/data-init-state.service';

@Component({
  selector: 'shepherd',
  template: '',
  // templateUrl: './shepherd.component.html',
  // styleUrls: ['./shepherd.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShepherdComponent implements AfterViewInit {
  private shepherdMyService = inject(ShepherdService);
  private _dataInitStateService = inject(DataInitStateService);
  private _projectService = inject(ProjectService);

  ngAfterViewInit(): void {
    if (!localStorage.getItem(LS.IS_SHOW_TOUR) && navigator.userAgent !== 'NIGHTWATCH') {
      this._dataInitStateService.isAllDataLoadedInitially$
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
