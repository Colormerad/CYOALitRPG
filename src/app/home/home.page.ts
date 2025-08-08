import { Component, OnInit } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { Character } from '../models/character.model';
import { StoryNode, Choice } from '../models/story.model';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  currentCharacter: Character | null = null;
  currentStoryNode: StoryNode | null = null;
  availableChoices: Choice[] = [];
  isConnected = false;
  isLoading = false;

  constructor(
    private databaseService: DatabaseService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.checkDatabaseConnection();
    this.initializeGame();
  }

  async checkDatabaseConnection() {
    try {
      await this.databaseService.checkConnection().toPromise();
      this.isConnected = true;
      this.showToast('Database connected successfully!', 'success');
    } catch (error) {
      this.isConnected = false;
      this.showToast('Database connection failed. Make sure the backend server is running.', 'danger');
      console.error('Database connection error:', error);
    }
  }

  async initializeGame() {
    // Create a demo character for testing
    const demoCharacter: Character = {
      accountId: 1,
      name: 'Demo Hero',
      level: 1,
      experience: 0,
      health: 100,
      mana: 50,
      strength: 10,
      dexterity: 10,
      intelligence: 10
    };

    this.currentCharacter = demoCharacter;
    this.databaseService.setCurrentCharacter(demoCharacter);
    
    // Load the first story node
    this.loadStoryNode(1);
  }

  async loadStoryNode(nodeId: number) {
    this.isLoading = true;
    try {
      // Load story node
      const storyNode = await this.databaseService.getStoryNode(nodeId).toPromise();
      this.currentStoryNode = storyNode || null;
      if (storyNode) {
        this.databaseService.setCurrentStoryNode(storyNode);
      }

      // Load available choices from the story node itself
      this.availableChoices = storyNode && storyNode.choices ? storyNode.choices : [];
    } catch (error) {
      this.showToast('Error loading story content', 'danger');
      console.error('Error loading story node:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async makeChoice(choice: Choice) {
    if (!this.currentCharacter) {
      this.showToast('No character selected', 'warning');
      return;
    }

    this.isLoading = true;
    try {
      // Use makeChoice with correct arguments (characterId and choiceId)
const result = await this.databaseService.makeChoice(this.currentCharacter.id!, choice.id!).toPromise();

// Update character stats if PlayerProgress includes updated character info
if (result && result.metadata && result.metadata.updatedCharacter) {
  this.currentCharacter = result.metadata.updatedCharacter;
  this.databaseService.setCurrentCharacter(this.currentCharacter!);
}

// Show a generic success message (customize if you add consequences to PlayerProgress)
this.showToast('Choice made!', 'success');

// Load next story node if available
if (result && result.currentNode && result.currentNode.id) {
  setTimeout(() => {
    this.loadStoryNode(result.currentNode.id!);
  }, 1500);
}
    } catch (error) {
      this.showToast('Error making choice', 'danger');
      console.error('Error making choice:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async showCharacterStats() {
    if (!this.currentCharacter) return;

    const alert = await this.alertController.create({
      header: 'Character Stats',
      message: `
        <strong>Name:</strong> ${this.currentCharacter.name}<br>
        <strong>Level:</strong> ${this.currentCharacter.level}<br>
        <strong>Experience:</strong> ${this.currentCharacter.experience}<br>
        <strong>Health:</strong> ${this.currentCharacter.health}<br>
        <strong>Mana:</strong> ${this.currentCharacter.mana}<br>
        <strong>Strength:</strong> ${this.currentCharacter.strength}<br>
        <strong>Dexterity:</strong> ${this.currentCharacter.dexterity}<br>
        <strong>Intelligence:</strong> ${this.currentCharacter.intelligence}
      `,
      buttons: ['OK']
    });

    await alert.present();
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    toast.present();
  }

  restartGame() {
    this.initializeGame();
  }
}
