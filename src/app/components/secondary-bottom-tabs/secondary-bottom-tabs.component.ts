import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-secondary-bottom-tabs',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './secondary-bottom-tabs.component.html',
  styleUrls: ['./secondary-bottom-tabs.component.scss']
})
export class SecondaryBottomTabsComponent {}
