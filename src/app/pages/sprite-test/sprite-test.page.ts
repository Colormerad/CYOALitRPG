import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-sprite-test',
  templateUrl: './sprite-test.page.html',
  styleUrls: ['./sprite-test.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class SpriteTestPage {
  
  // Generate test grid data
  firstRowSprites = Array.from({length: 10}, (_, i) => ({
    row: 0,
    col: i,
    class: `obj-r0-c${i}`
  }));

  secondRowSprites = Array.from({length: 10}, (_, i) => ({
    row: 1,
    col: i,
    class: `obj-r1-c${i}`
  }));

  constructor() { }

}
