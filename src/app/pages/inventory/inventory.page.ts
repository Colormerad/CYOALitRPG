import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { DatabaseService } from '../../services/database.service';
import { BottomTabsComponent } from '../../components/bottom-tabs/bottom-tabs.component';
import { InventoryItem } from '../../models/inventory.model';
import { Character } from '../../models/character.model';
import { PlayerProgress } from '../../models/player-progress.model';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.page.html',
  styleUrls: ['./inventory.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, BottomTabsComponent]
})
export class InventoryPage implements OnInit {
  characterId: number = 0;
  character: Character | null = null;
  playerProgress: PlayerProgress | null = null;
  
  // Inventory data
  gold: number = 0;
  items: InventoryItem[] = [];
  
  // UI state
  loading: boolean = true;
  error: string | null = null;
  activeTab: 'all' | 'equipment' | 'consumables' | 'quest' = 'all';
  selectedItem: InventoryItem | null = null;
  
  // Paging state
  currentPage: number = 1;
  itemsPerPage: number = 20; // 4 rows × 5 items per row (desktop)
  itemsPerRow: number = 5;
  
  // Sorting state
  sortType: 'none' | 'alphabetical' | 'date' = 'none';
  sortOrder: 'asc' | 'desc' = 'asc';
  
  // Equipment view state
  showEquippedView: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private databaseService: DatabaseService,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.characterId = +params['id']; // Convert to number
      if (this.characterId) {
        this.loadCharacterData();
        this.loadPlayerProgress();
      } else {
        this.error = 'Invalid character ID';
        this.loading = false;
      }
    });
  }

  loadCharacterData(): void {
    this.databaseService.getCharacter(this.characterId).subscribe({
      next: (character) => {
        this.character = character;
      },
      error: (err: any) => {
        console.error('Error loading character data:', err);
        this.error = 'Failed to load character data';
        this.loading = false;
      }
    });
  }

  loadPlayerProgress(): void {
    this.databaseService.getPlayerProgress(this.characterId).subscribe({
      next: (progress) => {
        this.playerProgress = progress;
        
        // Load inventory data from database service
        this.loadInventoryData();
        
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading player progress:', err);
        this.error = 'Failed to load game progress';
        this.loading = false;
      }
    });
  }

  // Load inventory data from database service
  loadInventoryData(): void {
    this.databaseService.getCharacterInventory(this.characterId).subscribe({
      next: (inventoryData) => {
        this.items = inventoryData.items;
        this.gold = inventoryData.gold;
      },
      error: (err: any) => {
        console.error('Error loading inventory data:', err);
        this.error = 'Failed to load inventory data';
        this.loading = false;
      }
    });
  }
  
  // Method to update an inventory item (equip/unequip or use)
  updateInventoryItem(item: InventoryItem): void {
    this.databaseService.updateInventoryItem(this.characterId, item).subscribe({
      next: (updatedItem) => {
        // Update the item in the local items array
        const index = this.items.findIndex(i => i.id === updatedItem.id);
        if (index !== -1) {
          this.items[index] = updatedItem;
        }
      },
      error: (err: any) => {
        console.error('Error updating inventory item:', err);
        // Show an error message to the user
        this.showErrorAlert('Failed to update item');
      }
    });
  }

  // Show error alert
  async showErrorAlert(message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  // Filter items based on the active tab
  getFilteredItems(): InventoryItem[] {
    let filteredItems: InventoryItem[];
    if (this.activeTab === 'all') {
      filteredItems = this.items;
    } else {
      filteredItems = this.items.filter(item => item.type === this.activeTab);
    }
    
    // Apply sorting
    filteredItems = this.applySorting(filteredItems);
    
    // Apply paging with responsive items per page
    const itemsPerPage = this.getItemsPerPage();
    const startIndex = (this.currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }
  
  // Get items per page based on screen size
  getItemsPerPage(): number {
    // Check if mobile (screen width < 768px)
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 8; // Mobile: 4 rows × 2 items per row
    }
    return 20; // Desktop: 4 rows × 5 items per row
  }
  
  // Apply sorting to items
  applySorting(items: InventoryItem[]): InventoryItem[] {
    if (this.sortType === 'none') {
      return items;
    }
    
    const sortedItems = [...items]; // Create a copy to avoid mutating original array
    
    if (this.sortType === 'alphabetical') {
      sortedItems.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        
        if (this.sortOrder === 'asc') {
          return nameA.localeCompare(nameB);
        } else {
          return nameB.localeCompare(nameA);
        }
      });
    } else if (this.sortType === 'date') {
      sortedItems.sort((a, b) => {
        // Handle items without obtainedAt (treat as oldest)
        const dateA = a.obtainedAt ? new Date(a.obtainedAt).getTime() : 0;
        const dateB = b.obtainedAt ? new Date(b.obtainedAt).getTime() : 0;
        
        if (this.sortOrder === 'asc') {
          return dateA - dateB; // Oldest first
        } else {
          return dateB - dateA; // Newest first (most recent)
        }
      });
    }
    
    return sortedItems;
  }
  
  // Get all filtered items (without paging) for pagination calculations
  getAllFilteredItems(): InventoryItem[] {
    let filteredItems: InventoryItem[];
    if (this.activeTab === 'all') {
      filteredItems = this.items;
    } else {
      filteredItems = this.items.filter(item => item.type === this.activeTab);
    }
    
    // Apply sorting to get accurate count
    return this.applySorting(filteredItems);
  }
  
  // Get total number of pages
  getTotalPages(): number {
    const totalItems = this.getAllFilteredItems().length;
    const itemsPerPage = this.getItemsPerPage();
    return Math.ceil(totalItems / itemsPerPage);
  }
  
  // Check if there are multiple pages
  hasMultiplePages(): boolean {
    return this.getTotalPages() > 1;
  }
  
  // Go to previous page
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.selectedItem = null; // Clear selection when changing pages
    }
  }
  
  // Go to next page
  nextPage(): void {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
      this.selectedItem = null; // Clear selection when changing pages
    }
  }
  
  // Check if previous page is available
  hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }
  
  // Check if next page is available
  hasNextPage(): boolean {
    return this.currentPage < this.getTotalPages();
  }

  // Toggle alphabetical sorting
  toggleAlphabeticalSort(): void {
    if (this.sortType === 'alphabetical') {
      // Toggle order if already alphabetical
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      // Switch to alphabetical sorting
      this.sortType = 'alphabetical';
      this.sortOrder = 'asc';
    }
    
    this.currentPage = 1; // Reset to first page when sorting changes
    this.selectedItem = null; // Clear selection when sorting changes
  }
  
  // Toggle date sorting (most recent first)
  toggleDateSort(): void {
    if (this.sortType === 'date') {
      // Toggle order if already date sorting
      this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    } else {
      // Switch to date sorting (most recent first by default)
      this.sortType = 'date';
      this.sortOrder = 'desc';
    }
    
    this.currentPage = 1; // Reset to first page when sorting changes
    this.selectedItem = null; // Clear selection when sorting changes
  }
  
  // Clear all sorting
  clearSort(): void {
    this.sortType = 'none';
    this.sortOrder = 'asc';
    this.currentPage = 1;
    this.selectedItem = null;
  }
  
  // Get alphabetical sort icon
  getAlphabeticalSortIcon(): string {
    if (this.sortType === 'alphabetical') {
      return this.sortOrder === 'asc' ? '↑' : '↓';
    }
    return '⇅';
  }
  
  // Get alphabetical sort label
  getAlphabeticalSortLabel(): string {
    if (this.sortType === 'alphabetical') {
      return this.sortOrder === 'asc' ? 'A-Z' : 'Z-A';
    }
    return 'A-Z';
  }
  
  // Get date sort icon
  getDateSortIcon(): string {
    if (this.sortType === 'date') {
      return this.sortOrder === 'desc' ? '↓' : '↑';
    }
    return '⇅';
  }
  
  // Get date sort label
  getDateSortLabel(): string {
    if (this.sortType === 'date') {
      return this.sortOrder === 'desc' ? 'Recent' : 'Oldest';
    }
    return 'Recent';
  }
  
  // Check if alphabetical sort is active
  isAlphabeticalSortActive(): boolean {
    return this.sortType === 'alphabetical';
  }
  
  // Check if date sort is active
  isDateSortActive(): boolean {
    return this.sortType === 'date';
  }
  
  // Toggle equipped items view
  toggleEquippedView(): void {
    this.showEquippedView = !this.showEquippedView;
    this.selectedItem = null; // Clear selection when switching views
  }
  
  // Get equipped item for a specific slot
  getEquippedItem(slot: string): InventoryItem | null {
    return this.items.find(item => item.equipSlot === slot && item.isEquipped) || null;
  }
  
  // Get all equipped items
  getEquippedItems(): InventoryItem[] {
    return this.items.filter(item => item.isEquipped);
  }
  
  // Get equipment slot icon for empty slots
  getSlotIcon(slot: string): string {
    switch (slot) {
      case 'head': return '🎩';
      case 'necklace': return '📿';
      case 'body': return '👕';
      case 'hands': return '🧤';
      case 'mainhand': return '⚔️';
      case 'offhand': return '🛡️';
      case 'ring1':
      case 'ring2': return '💍';
      case 'feet': return '👢';
      default: return '📦';
    }
  }
  
  // Check if a hand slot is occupied by a 2-handed weapon
  isHandSlotBlockedByTwoHanded(): { mainhand: boolean; offhand: boolean } {
    const twoHandedWeapon = this.items.find(item => 
      item.isEquipped && item.weaponType === '2handed'
    );
    
    if (twoHandedWeapon) {
      return { mainhand: true, offhand: true };
    }
    
    return { mainhand: false, offhand: false };
  }
  
  // Get what's equipped in a hand slot, considering 2-handed weapons
  getHandSlotItem(slot: 'mainhand' | 'offhand'): InventoryItem | null {
    // Check for 2-handed weapon first
    const twoHandedWeapon = this.items.find(item => 
      item.isEquipped && item.weaponType === '2handed'
    );
    
    if (twoHandedWeapon) {
      return twoHandedWeapon;
    }
    
    // Check for 1-handed items in specific slot
    return this.items.find(item => 
      item.isEquipped && item.equipSlot === slot
    ) || null;
  }
  
  // Check if an item can be equipped in current hand configuration
  canEquipInHands(item: InventoryItem): boolean {
    if (item.equipSlot !== 'mainhand' && item.equipSlot !== 'offhand') {
      return true; // Not a hand item
    }
    
    const blockedSlots = this.isHandSlotBlockedByTwoHanded();
    
    if (item.weaponType === '2handed') {
      // 2-handed weapon needs both hands free
      const mainhandItem = this.getEquippedItem('mainhand');
      const offhandItem = this.getEquippedItem('offhand');
      return !mainhandItem && !offhandItem;
    } else {
      // 1-handed item needs the specific slot free
      if (item.equipSlot === 'mainhand') {
        return !blockedSlots.mainhand;
      } else if (item.equipSlot === 'offhand') {
        return !blockedSlots.offhand;
      }
    }
    
    return true;
  }
  
  // Set the active tab
  setActiveTab(tab: 'all' | 'equipment' | 'consumables' | 'quest'): void {
    this.activeTab = tab;
    this.currentPage = 1; // Reset to first page when changing tabs
    this.selectedItem = null; // Clear selection when changing tabs
  }

  // Select an item to view details
  selectItem(item: InventoryItem): void {
    this.selectedItem = item;
  }

  // Close the item details view
  closeItemDetails(): void {
    this.selectedItem = null;
  }

  // Use a consumable item
  useItem(item: InventoryItem): void {
    if (item.type === 'consumable') {
      // In a real implementation, this would call a service to use the item
      console.log(`Using item: ${item.name}`);
      
      // Decrease quantity
      item.quantity--;
      
      // Remove item if quantity is 0
      if (item.quantity <= 0) {
        this.items = this.items.filter(i => i.id !== item.id);
      } else {
        // Update the item in the database
        this.updateInventoryItem(item);
      }
      
      // Close item details
      this.closeItemDetails();
    }
  }

  // Equip or unequip an item
  toggleEquip(item: InventoryItem): void {
    if (item.type === 'equipment') {
      // If equipping, unequip any item in the same slot
      if (!item.isEquipped) {
        const equippedItemInSlot = this.items.find(
          i => i.equipSlot === item.equipSlot && i.isEquipped && i.id !== item.id
        );
        
        if (equippedItemInSlot) {
          equippedItemInSlot.isEquipped = false;
          // Update the previously equipped item
          this.updateInventoryItem(equippedItemInSlot);
        }
      }
      
      // Toggle equipped state
      item.isEquipped = !item.isEquipped;
      
      // Update the item in the database
      this.updateInventoryItem(item);
      
      // In a real implementation, this would call a service to update the character's equipment
      console.log(`${item.isEquipped ? 'Equipped' : 'Unequipped'} item: ${item.name}`);
      
      // Close item details
      this.closeItemDetails();
    }
  }

  // Get appropriate emoji for item type
  getItemEmoji(item: InventoryItem): string {
    if (!item) return '❓';
    
    switch(item.type) {
      case 'equipment':
        if (item.equipSlot === 'mainhand') return '⚔️';
        if (item.equipSlot === 'offhand') return '🛡️';
        if (item.equipSlot === 'body') return '🛡️';
        if (item.equipSlot === 'head') return '🪖';
        if (item.equipSlot === 'hands') return '🧤';
        if (item.equipSlot === 'feet') return '👢';
        if (item.equipSlot === 'necklace') return '📿';
        if (item.equipSlot === 'ring1' || item.equipSlot === 'ring2') return '💍';
        return '🧰';
      case 'consumable':
        return '🧪';
      case 'quest':
        return '📜';
      default:
        return '📦';
    }
  }
  
  // Equip an item
  equipItem(item: InventoryItem): void {
    if (item.type === 'equipment') {
      // Handle different slot types with special logic
      let itemsToUnequip: InventoryItem[] = [];
      
      if (item.equipSlot === 'ring1' || item.equipSlot === 'ring2') {
        // Ring logic: find any equipped ring if both slots are full
        const equippedRings = this.items.filter(i => 
          (i.equipSlot === 'ring1' || i.equipSlot === 'ring2') && i.isEquipped && i.id !== item.id
        );
        if (equippedRings.length >= 2) {
          itemsToUnequip.push(equippedRings[0]); // Unequip the first ring
        }
      } else if (item.equipSlot === 'mainhand' || item.equipSlot === 'offhand') {
        // Hand slot logic: handle 1-handed vs 2-handed weapons
        if (item.weaponType === '2handed') {
          // 2-handed weapon: unequip anything in both hands
          const mainhandItem = this.getEquippedItem('mainhand');
          const offhandItem = this.getEquippedItem('offhand');
          if (mainhandItem) itemsToUnequip.push(mainhandItem);
          if (offhandItem) itemsToUnequip.push(offhandItem);
        } else {
          // 1-handed item: check if 2-handed weapon is equipped
          const twoHandedWeapon = this.items.find(i => 
            i.isEquipped && i.weaponType === '2handed' && i.id !== item.id
          );
          if (twoHandedWeapon) {
            itemsToUnequip.push(twoHandedWeapon);
          } else {
            // Just unequip item in the same slot
            const equippedItemInSlot = this.items.find(
              i => i.equipSlot === item.equipSlot && i.isEquipped && i.id !== item.id
            );
            if (equippedItemInSlot) {
              itemsToUnequip.push(equippedItemInSlot);
            }
          }
        }
      } else {
        // Standard slot logic
        const equippedItemInSlot = this.items.find(
          i => i.equipSlot === item.equipSlot && i.isEquipped && i.id !== item.id
        );
        if (equippedItemInSlot) {
          itemsToUnequip.push(equippedItemInSlot);
        }
      }
      
      // Unequip all items that need to be unequipped
      for (const itemToUnequip of itemsToUnequip) {
        itemToUnequip.isEquipped = false;
        this.updateInventoryItem(itemToUnequip);
      }
      
      // Set equipped state
      item.isEquipped = true;
      
      // Update the item in the database
      this.updateInventoryItem(item);
      
      console.log(`Equipped item: ${item.name}`);
    }
  }
  
  // Unequip an item
  unequipItem(item: InventoryItem): void {
    if (item.type === 'equipment' && item.isEquipped) {
      // Set equipped state
      item.isEquipped = false;
      
      // Update the item in the database
      this.updateInventoryItem(item);
      
      console.log(`Unequipped item: ${item.name}`);
    }
  }
  
  // Navigate back to the game
  goBack(): void {
    this.router.navigate(['/game', this.characterId]);
  }
}
