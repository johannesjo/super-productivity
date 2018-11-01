import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';

import { SplitComponent } from './split.component';
import { SplitAreaDirective } from './split-area.directive';
import { SplitHandleComponent } from './split-handle.component';

@NgModule({
  declarations: [SplitComponent, SplitAreaDirective, SplitHandleComponent],
  exports: [SplitComponent, SplitAreaDirective, SplitHandleComponent],
  imports: [CommonModule, FlexLayoutModule]
})
export class SplitModule {
}