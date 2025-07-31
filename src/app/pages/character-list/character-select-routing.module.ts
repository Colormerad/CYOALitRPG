import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CharacterSelectPage } from './character-select.page';
import { AuthGuard } from '../../services/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: CharacterSelectPage,
    canActivate: [AuthGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CharacterSelectPageRoutingModule {}

