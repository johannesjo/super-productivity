import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogMigrateComponent } from './dialog-migrate/dialog-migrate.component';
import { UiModule } from '../../ui/ui.module';
import { MigrateService } from './migrate.service';

@NgModule({
  declarations: [DialogMigrateComponent],
  imports: [
    UiModule,
    CommonModule
  ],
  entryComponents: [DialogMigrateComponent],
  providers: [MigrateService],
})
export class MigrateModule {
}
