# Global Styling Guide

## Overview
All styling has been consolidated into a global stylesheet system to maintain consistency across the application and improve maintainability.

## File Structure
```
src/
├── global.scss                    # Main global imports
├── styles/
│   └── global-components.scss     # All component styles
└── theme/
    ├── retro-theme.scss          # Color variables and base theme
    ├── retro-ionic-overrides.scss # Ionic component overrides
    └── variables.scss            # CSS custom properties
```

## Available Global Classes

### Layout Components
- `.page-container` - Universal page container ensuring consistent background
- `.app-container` - Main application container (replaces `.game-container`, etc.)
- `.content-container` - Content wrapper with flex layout
- `.centered-container` - Centered layout for forms/modals
- `.full-width-container` - Full-width container for entire screen
- `.nav-padded-container` - Container with bottom padding for navigation menu

### Page Templates
- `.standard-page` - Standard page with header and content area
- `.auth-page` - Authentication pages (login, register) template
- `.game-page` - Game pages with full content area
- `.list-page` - List pages (character select, inventory, etc.)
- `.profile-page` - Profile/settings pages template

### Header Components
- `.page-header` - Page title headers with back buttons
- `.section-header` - Section titles within pages

### Button Components
- `.btn-primary` - Primary action buttons
- `.btn-secondary` - Secondary action buttons  
- `.btn-danger` - Destructive action buttons
- `.btn-small`, `.btn-large` - Size variants
- `.btn-block` - Full-width buttons
- `.back-button` - Navigation back buttons

### Form Components
- `.form-group` - Form field wrapper
- `.form-input` - Text inputs
- `.form-textarea` - Textarea inputs
- `.form-select` - Select dropdowns

### Card Components
- `.card` - Basic card container
- `.card-header`, `.card-body`, `.card-footer` - Card sections
- `.entity-card` - Character/entity display cards

### Progress Components
- `.progress-bar` - Progress bar container
- `.progress-fill` - Progress bar fill with variants:
  - `.health` - Health bars
  - `.enemy-health` - Enemy health bars
  - `.mana` - Mana bars
  - `.experience` - XP bars

### List Components
- `.item-list` - List container
- `.list-item` - Individual list items with hover effects

### Loading States
- `.loading` - Loading text with pulse animation
- `.loading-spinner` - Spinning loader icon

### Utility Classes
- `.text-center`, `.text-left`, `.text-right` - Text alignment
- `.mb-small`, `.mb-medium`, `.mb-large` - Margin bottom
- `.mt-small`, `.mt-medium`, `.mt-large` - Margin top
- `.flex`, `.flex-column`, `.flex-center`, `.flex-between` - Flexbox utilities
- `.gap-small`, `.gap-medium`, `.gap-large` - Gap utilities
- `.hidden`, `.visible` - Visibility utilities

### Animation Classes
- `.fade-in` - Fade in animation
- `.slide-in` - Slide in animation

## Migration Guide

### Before (Component-specific styles)
```scss
.game-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'VT323', monospace;
  background-color: var(--retro-bg);
  color: var(--retro-text);
  min-height: 100vh;
}
```

### After (Global classes)
```html
<div class="app-container">
  <!-- content -->
</div>
```

```scss
// Component SCSS file can be minimal or removed entirely
// All styling handled by global classes
```

## HTML Template Updates

### Page Headers
```html
<!-- Before -->
<div class="header">
  <h1>Page Title</h1>
  <button class="back-button">Back</button>
</div>

<!-- After -->
<div class="page-header">
  <h1>Page Title</h1>
  <button class="back-button">Back</button>
</div>
```

### Forms
```html
<!-- Before -->
<div class="form-group">
  <label>Name</label>
  <input type="text" />
</div>

<!-- After -->
<div class="form-group">
  <label>Name</label>
  <input type="text" class="form-input" />
</div>
```

### Buttons
```html
<!-- Before -->
<button class="custom-button">Action</button>

<!-- After -->
<button class="btn-primary">Action</button>
```

### Cards/Entities
```html
<!-- Before -->
<div class="entity">
  <div class="name">Character Name</div>
</div>

<!-- After -->
<div class="entity-card">
  <div class="entity-name">Character Name</div>
</div>
```

## Benefits

1. **Consistency** - All components use the same styling patterns
2. **Maintainability** - Single source of truth for styles
3. **Performance** - Reduced CSS duplication
4. **Developer Experience** - Predictable class names and behavior
5. **Responsive** - Built-in responsive design patterns

## Page Background Consistency

**IMPORTANT:** Every page MUST use the same dark green background for a unified experience.

### Automatic Background Enforcement
The global styles automatically enforce consistent backgrounds on:
- `html`, `body` - Base page elements
- `ion-app`, `ion-content`, `ion-router-outlet` - Ionic framework elements
- All page containers and templates
- Modals, popovers, and overlays

### Page Template Usage
Always use one of the provided page templates:

```html
<!-- Standard Page -->
<div class="standard-page">
  <div class="page-content">
    <!-- Your content here -->
  </div>
</div>

<!-- Auth Page -->
<div class="auth-page">
  <div class="auth-card">
    <!-- Login/register form -->
  </div>
</div>

<!-- Game Page -->
<div class="game-page">
  <!-- Game content -->
</div>

<!-- List Page -->
<div class="list-page">
  <div class="list-header">
    <h1>Page Title</h1>
  </div>
  <div class="list-content">
    <!-- List items -->
  </div>
</div>
```

### Background Override Prevention
- All background styles use `!important` to prevent accidental overrides
- Ionic component backgrounds are explicitly set to retro theme colors
- Custom scrollbar styling maintains the dark green aesthetic

## Best Practices

1. **Always use page templates** for consistent layout and background
2. Use global classes whenever possible
3. Only create component-specific styles for truly unique elements
4. Follow the established naming conventions
5. Test responsive behavior on mobile devices
6. Use utility classes for spacing and layout adjustments
7. **Never override background colors** - let the global styles handle consistency

## Color Variables
All colors are defined in `theme/retro-theme.scss`:
- `--retro-green-darkest` - Background color
- `--retro-green-dark` - Card backgrounds
- `--retro-green-medium` - Borders and accents
- `--retro-green-light` - Highlights
- `--retro-green-lightest` - Text color

## Responsive Breakpoints
- Mobile: `max-width: 480px`
- Tablet: `max-width: 768px`
- Desktop: `min-width: 769px`

## Sprite Icon Usage

Place the provided sprite atlas image at:

`src/assets/icons/icon-atlas.png`

Defaults assume a 21x21 atlas of 16px cells (21 columns x 21 rows). Adjust if your atlas differs.

### Option A: Angular component

Use the standalone component `app-sprite-icon` from `src/app/components/sprite-icon/sprite-icon.component.ts`.

Basic (by index, row-major):

```html
<app-sprite-icon [index]="10"></app-sprite-icon>
```

Explicit row/col and size:

```html
<app-sprite-icon [row]="2" [col]="5" [size]="24"></app-sprite-icon>
```

Non-default atlas (e.g., 32px cells, 20 columns):

```html
<app-sprite-icon
  src="assets/icons/icon-atlas.png"
  [cell]="32"
  [columns]="20"
  [index]="37"
  [size]="32"
></app-sprite-icon>
```

Accessibility:

```html
<app-sprite-icon [index]="0" ariaLabel="Heart icon"></app-sprite-icon>
```

### Option B: SCSS mixin

Global mixin is defined in `styles/global-components.scss`:

```scss
// Creates a class with the specified sprite frame
.icon-heart { @include sprite-icon(0, 1); }

// Upscale helpers (pixel-perfect)
<span class="icon-heart sprite-2x"></span>
```

Parameters: `@mixin sprite-icon($row, $col, $cell: 16px, $src: 'assets/icons/icon-atlas.png')`

Notes:
- `.sprite-2x`, `.sprite-3x`, `.sprite-4x` scale from top-left for crisp pixels.
- The component and mixin both use pixel-art rendering and no smoothing.
