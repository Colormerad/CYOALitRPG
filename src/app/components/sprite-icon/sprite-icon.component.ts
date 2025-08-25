import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Standalone component to render a single icon from a sprite sheet (atlas).
 *
 * Usage:
 * <app-sprite-icon [index]="10" [size]="24"></app-sprite-icon>
 * <app-sprite-icon [row]="2" [col]="5" [cell]="16" [columns]="32"></app-sprite-icon>
 *
 * Defaults assume a 21x21 atlas with ~12.19px cells (256px / 21).
 */
@Component({
  selector: 'app-sprite-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="sprite-icon"
          [ngStyle]="style"
          role="img"
          [attr.aria-label]="ariaLabel || title || 'icon'"
          [attr.title]="title || ariaLabel || ''"></span>
  `,
  styles: [`
    :host { display: inline-block; line-height: 0; }
    .sprite-icon {
      display: inline-block;
      background-repeat: no-repeat;
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
    }
  `]
})
export class SpriteIconComponent implements OnChanges {
  /** Path to sprite sheet image */
  @Input() src: string = '/assets/icons/icon-atlas.png';
  /** Size of one cell (icon) in px in the sprite */
  @Input() cell: number = 32;
  /** Number of columns in the sprite sheet (defaults to 21) */
  @Input() columns: number = 21;
  /** Target display size in px (defaults to cell) */
  @Input() size?: number;
  /** Optional: set specific row and col (0-based). If provided, overrides index. */
  @Input() row?: number;
  @Input() col?: number;
  /** Optional: 0-based index into the sprite sheet (row-major). */
  @Input() index?: number;
  /** Accessibility */
  @Input() ariaLabel?: string;
  @Input() title?: string;

  style: { [k: string]: string } = {};

  ngOnChanges(_: SimpleChanges): void {
    this.style = this.computeStyle();
  }

  private computeStyle(): { [k: string]: string } {
    const cell = Number(this.cell) || 16;
    const cols = Number(this.columns) || 21;

    let r = this.row ?? 0;
    let c = this.col ?? 0;

    if (this.index != null && (this.row == null || this.col == null)) {
      const i = Number(this.index);
      r = Math.floor(i / cols);
      c = i % cols;
    }

    const size = (this.size ?? cell);

    return {
      width: `${size}px`,
      height: `${size}px`,
      backgroundImage: `url(${this.src})`,
      backgroundPosition: `${-c * cell}px ${-r * cell}px`,
      backgroundSize: 'auto',
    };
  }
}
