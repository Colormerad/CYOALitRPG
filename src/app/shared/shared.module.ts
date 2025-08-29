import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { LoadingOverlayComponent } from './loading-overlay/loading-overlay.component';

@NgModule({
  imports: [CommonModule, IonicModule, LoadingOverlayComponent],
  exports: [LoadingOverlayComponent]
})
export class SharedModule {}
