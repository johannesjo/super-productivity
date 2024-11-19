import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { IssuePanelItemComponent } from './issue-panel-item/issue-panel-item.component';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { UiModule } from '../../../ui/ui.module';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { DropListService } from '../../../core-ui/drop-list/drop-list.service';
import { T } from 'src/app/t.const';
import { AsyncPipe } from '@angular/common';
import { AddTaskPanel } from '../add-task-panel.model';

@Component({
  selector: 'add-issues-panel',
  standalone: true,
  imports: [
    UiModule,
    IssuePanelItemComponent,
    MatIcon,
    MatFormField,
    MatLabel,
    CdkDropList,
    CdkDrag,
    AsyncPipe,
  ],
  templateUrl: './add-issues-panel.component.html',
  styleUrl: './add-issues-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddIssuesPanelComponent implements OnDestroy, AfterViewInit {
  items: AddTaskPanel.IssueItem[] = [
    {
      id: 'A',
      data: {
        title: 'Issue 1',
        issueType: 'GITHUB',
        issueData: {
          id: 'A_IssueId',
        } as any,
        titleHighlighted: 'Issue',
      },
    },
  ];

  @ViewChild(CdkDropList) dropList?: CdkDropList;

  T: typeof T = T;

  constructor(public dropListService: DropListService) {}

  ngAfterViewInit(): void {
    console.log(this.dropList);

    this.dropListService.registerDropList(this.dropList!);
  }

  ngOnDestroy(): void {
    this.dropListService.unregisterDropList(this.dropList!);
  }
}
