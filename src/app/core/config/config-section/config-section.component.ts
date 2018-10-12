import { Component, OnInit } from '@angular/core';
import { Input } from '@angular/core';

@Component({
  selector: 'config-section',
  templateUrl: './config-section.component.html',
  styleUrls: ['./config-section.component.css']
})
export class ConfigSectionComponent implements OnInit {

  @Input() section;
  @Input() cfg;

  constructor() {
  }

  ngOnInit() {
  }

}
