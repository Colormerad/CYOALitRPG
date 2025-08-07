import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { DatabaseService, InventoryItem, Character, PlayerProgress } from '../../services/database.service';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.page.html',
  styleUrls: ['./inventory.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
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
    if (this.activeTab === 'all') {
      return this.items;
    }
    return this.items.filter(item => item.type === this.activeTab);
  }

  // Set the active tab
  setActiveTab(tab: 'all' | 'equipment' | 'consumables' | 'quest'): void {
    this.activeTab = tab;
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
        if (item.equipSlot === 'weapon') return '⚔️';
        if (item.equipSlot === 'body') return '🛡️';
        if (item.equipSlot === 'head') return '🪖';
        if (item.equipSlot === 'hands') return '🧤';
        if (item.equipSlot === 'feet') return '👢';
        if (item.equipSlot === 'accessory') return '💍';
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
      // If equipping, unequip any item in the same slot
      const equippedItemInSlot = this.items.find(
        i => i.equipSlot === item.equipSlot && i.isEquipped && i.id !== item.id
      );
      
      if (equippedItemInSlot) {
        equippedItemInSlot.isEquipped = false;
        // Update the previously equipped item
        this.updateInventoryItem(equippedItemInSlot);
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
