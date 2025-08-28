import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './services/auth.guard';


const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/register/register.module').then(m => m.RegisterPageModule)
  },
  {
    path: 'select-character',
    loadChildren: () =>
      import('./pages/character-list/character-select.module').then(
        (m) => m.CharacterSelectPageModule
      )
  },
  
  // Add other protected routes here, guarded by AuthGuard
  {
    path: 'profile',
    loadChildren: () => import('./pages/profile/profile.module').then( m => m.ProfilePageModule)
  },
  {
    path: 'theme-select',
    loadComponent: () => import('./pages/theme-select/theme-select.page').then(m => m.ThemeSelectPage)
  },
  {
    path: 'game/:id',
    loadComponent: () => import('./pages/game/game.page').then(m => m.GamePage)
  },
  {
    path: 'create-character',
    loadComponent: () => import('./pages/character-create/character-create.page').then(m => m.CharacterCreatePage)
  },
  {
    path: 'grave-view/:id',
    loadComponent: () => import('./pages/grave-view/grave-view.page').then(m => m.GraveViewPage)
  },
  {
    path: 'inventory/:id',
    loadComponent: () => import('./pages/inventory/inventory.page').then(m => m.InventoryPage)
  },
  {
    path: 'icon-select/:id',
    loadComponent: () => import('./pages/icon-select/icon-select.page').then(m => m.IconSelectPage)
  },
  {
    path: 'character-editor/:id',
    loadComponent: () => import('./pages/character-editor/character-editor.page').then(m => m.CharacterEditorPage)
  },
  {
    path: 'battle',
    loadComponent: () => import('./pages/battle/battle.page').then(m => m.BattlePage)
  },
  {
    path: 'last-time/:id',
    loadComponent: () => import('./pages/last-time/last-time.page').then(m => m.LastTimePage)
  },
  {
    path: 'sprite-test',
    loadComponent: () => import('./pages/sprite-test/sprite-test.page').then(m => m.SpriteTestPage)
  },
  {
    path: '',
    redirectTo: 'select-character',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }