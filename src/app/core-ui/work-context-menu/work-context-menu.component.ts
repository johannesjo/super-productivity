import { ChangeDetectionStrategy, Component, Input, OnDestroy } from '@angular/core';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { T } from 'src/app/t.const';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { from, Observable, of, Subscription } from 'rxjs';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { MatDialog } from '@angular/material/dialog';
import { TagService } from '../../features/tag/tag.service';
import { concatMap, filter, first, switchMap, take, tap } from 'rxjs/operators';
import { Tag } from '../../features/tag/tag.model';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { Router } from '@angular/router';

@Component({
  selector: 'work-context-menu',
  templateUrl: './work-context-menu.component.html',
  styleUrls: ['./work-context-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkContextMenuComponent implements OnDestroy {
  @Input() contextId?: string;
  T: typeof T = T;
  TODAY_TAG_ID: string = TODAY_TAG.id as string;
  isForProject: boolean = true;
  base: string = 'project';
  private _subs: Subscription = new Subscription();

  constructor(
    private _matDialog: MatDialog,
    private _tagService: TagService,
    private _workContextService: WorkContextService,
    private _router: Router,
  ) {
  }

  @Input('contextType') set contextTypeSet(v: WorkContextType) {
    this.isForProject = (v === WorkContextType.PROJECT);
    this.base = (this.isForProject)
      ? 'project'
      : 'tag';
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  deleteTag() {
    this._subs.add(this._confirmTagDelete().pipe(
      filter(isDelete => isDelete && !!this.contextId),
      switchMap(() => this._workContextService.activeWorkContextTypeAndId$.pipe(take(1))),
      tap(({activeId}) => console.log(activeId, this.contextId)),
      switchMap(({activeId}) => (activeId === this.contextId)
        ? from(this._router.navigateByUrl('/'))
        : of(true)
      ),
    ).subscribe(() => {
      if (this.contextId) {
        this._tagService.removeTag(this.contextId);
      }
    }));
  }

  private _confirmTagDelete(): Observable<boolean> {
    if (!this.contextId) {
      throw new Error('No context id');
    }

    return this._tagService.getTagById$(this.contextId).pipe(
      first(),
      concatMap((tag: Tag) => this._matDialog.open(DialogConfirmComponent, {
        restoreFocus: true,
        data: {
          message: T.F.TAG.D_DELETE.CONFIRM_MSG,
          translateParams: {tagName: tag.title},
        }
      }).afterClosed()),
    );
  }

}
