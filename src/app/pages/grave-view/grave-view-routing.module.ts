import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { GraveViewPage } from './grave-view.page';

const routes: Routes = [
  {
    path: '',
    component: GraveViewPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GraveViewPageRoutingModule {}
