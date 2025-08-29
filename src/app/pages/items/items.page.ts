import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-items',
  standalone: true,
  templateUrl: './items.page.html',
  styleUrls: ['./items.page.scss'],
  imports: [CommonModule, IonicModule]
})
export class ItemsPage implements OnInit {
  loading = true;
  error: string | null = null;
  items: any[] = [];

  constructor(private db: DatabaseService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.db.getAllItems().subscribe({
      next: (rows) => {
        this.items = rows || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load all items', err);
        this.error = 'Failed to load items.';
        this.loading = false;
      }
    });
  }

  trackById = (_: number, item: any) => item?.id ?? item?.itemid ?? _;

  get prettyJson(): string {
    try {
      return JSON.stringify(this.items, null, 2);
    } catch {
      return String(this.items);
    }
  }
}
