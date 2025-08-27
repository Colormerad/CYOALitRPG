import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-bottom-tabs',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './bottom-tabs.component.html',
  styleUrls: ['./bottom-tabs.component.scss']
})
export class BottomTabsComponent implements OnInit {
  @Input() characterId?: number;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    if (this.characterId == null) {
      this.route.paramMap.subscribe(params => {
        const id = Number(params.get('id'));
        if (!isNaN(id)) this.characterId = id;
      });
    }
  }
}
