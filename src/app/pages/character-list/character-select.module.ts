import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CharacterSelectPageRoutingModule } from './character-select-routing.module';
import { CharacterSelectPage } from './character-select.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CharacterSelectPageRoutingModule,
    CharacterSelectPage
  ]
})
export class CharacterSelectPageModule {}
