import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FieldType } from '@ngx-formly/material';
import { MATERIAL_ICONS } from '../../../ui/material-icons.const';
import { Observable } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';
import { FormlyFieldConfig } from '@ngx-formly/core';

@Component({
  selector: 'icon-input',
  templateUrl: './icon-input.component.html',
  styleUrls: ['./icon-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconInputComponent extends FieldType<FormlyFieldConfig> implements OnInit {
  // @ViewChild(MatInput) formFieldControl: MatInput;

  customIcons: string[] = MATERIAL_ICONS;
  filteredIcons$?: Observable<string[]>;

  get type(): string {
    return this.to.type || 'text';
  }

  ngOnInit(): void {
    this.filteredIcons$ = this.formControl.valueChanges.pipe(
      startWith(''),
      filter((searchTerm) => !!searchTerm),
      map((searchTerm) => {
        // Note: the outer array signifies the observable stream the other is the value
        return this.customIcons.filter(
          (icoStr) => icoStr && icoStr.toLowerCase().includes(searchTerm.toLowerCase()),
        );
      }),
    );
  }

  trackByIndex(i: number, p: any): number {
    return i;
  }
}
