import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
/**
 * AudioService provides centralized audio control functionality
 * Manages volume and mute state across the application
 * Uses BehaviorSubjects to maintain reactive state
 * 
 * Usage:
 * - Inject in components: constructor(private audioService: AudioService)
 * - Subscribe to volume changes: audioService.volume$.subscribe(volume => ...)
 * - Subscribe to mute changes: audioService.muted$.subscribe(muted => ...)
 * - Set volume: audioService.setVolume(0.5)
 * - Toggle mute: audioService.toggleMute()
 */
export class AudioService {
  private volumeSubject = new BehaviorSubject<number>(0.5); // Default volume
  private mutedSubject = new BehaviorSubject<boolean>(false);

  volume$ = this.volumeSubject.asObservable();
  muted$ = this.mutedSubject.asObservable();

  constructor() {}

  setVolume(volume: number) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.volumeSubject.next(clampedVolume);
  }

  toggleMute() {
    const isMuted = this.mutedSubject.value;
    this.mutedSubject.next(!isMuted);
  }

  isMuted() {
    return this.mutedSubject.value;
  }

  getVolume() {
    return this.volumeSubject.value;
  }
}
