import { Component, OnInit } from '@angular/core';
import { ProjectService } from '../project/project.service';

@Component({
  selector: 'main-header',
  templateUrl: './main-header.component.html',
  styleUrls: ['./main-header.component.scss']
})
export class MainHeaderComponent implements OnInit {
  constructor(public readonly projectService: ProjectService) {
  }

  ngOnInit() {
  }

  switchProject(projectId) {
    this.projectService.setCurrentId(projectId);
  }
}
