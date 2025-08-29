import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-overlay',
  templateUrl: './loading-overlay.component.html',
  styleUrls: ['./loading-overlay.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
})
export class LoadingOverlayComponent {
  @Input() show: boolean = false;
  @Input() size: 'small' | 'medium' | 'large' | 'extra-large' = 'medium';
  @Input() message: string = 'Loading...';
}
