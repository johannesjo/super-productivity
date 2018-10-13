import { Component, OnInit } from '@angular/core';
import { ProjectService } from '../../project/project.service';

@Component({
  selector: 'project-page',
  templateUrl: './project-page.component.html',
  styleUrls: ['./project-page.component.css']
})
export class ProjectPageComponent implements OnInit {
  constructor(public readonly projectService: ProjectService) {
  }

  ngOnInit() {
  }

}
