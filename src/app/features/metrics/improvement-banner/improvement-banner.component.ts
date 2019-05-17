import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';

@Component({
  selector: 'improvement-banner',
  templateUrl: './improvement-banner.component.html',
  styleUrls: ['./improvement-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImprovementBannerComponent implements OnInit {
  improvementSuggestions = [
    'Be less stressed out',
    'Plan more ahead',
    'Take more breaks',
  ];

  constructor() {
  }

  ngOnInit() {
  }

  remove(suggestion: string) {
    this.improvementSuggestions.splice(this.improvementSuggestions.indexOf(suggestion), 1);
  }

}
