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
  // Master/music/sfx individual volume tracks
  private masterVolumeSubject = new BehaviorSubject<number>(0.5);
  private musicVolumeSubject = new BehaviorSubject<number>(0.7);
  private sfxVolumeSubject = new BehaviorSubject<number>(0.8);
  private mutedSubject = new BehaviorSubject<boolean>(false);
  private currentMusicEl: HTMLAudioElement | null = null;

  // Public observables
  masterVolume$ = this.masterVolumeSubject.asObservable();
  musicVolume$ = this.musicVolumeSubject.asObservable();
  sfxVolume$ = this.sfxVolumeSubject.asObservable();
  muted$ = this.mutedSubject.asObservable();

  constructor() {}

  // Backward compatibility: treat single volume as master
  get volume$() { return this.masterVolume$; }
  setVolume(volume: number) { this.setMasterVolume(volume); }
  getVolume() { return this.masterVolumeSubject.value; }

  // Master volume
  setMasterVolume(volume: number) {
    const v = this.clamp01(volume);
    this.masterVolumeSubject.next(v);
  }
  getMasterVolume() { return this.masterVolumeSubject.value; }

  // Music volume
  setMusicVolume(volume: number) {
    const v = this.clamp01(volume);
    this.musicVolumeSubject.next(v);
  }
  getMusicVolume() { return this.musicVolumeSubject.value; }

  // SFX volume
  setSfxVolume(volume: number) {
    const v = this.clamp01(volume);
    this.sfxVolumeSubject.next(v);
  }
  getSfxVolume() { return this.sfxVolumeSubject.value; }

  // Global mute toggles all outputs (sliders remain adjustable)
  toggleMute() {
    this.mutedSubject.next(!this.mutedSubject.value);
  }
  isMuted() { return this.mutedSubject.value; }

  // Effective outputs can be used by audio engine (master * track, or 0 if muted)
  getEffectiveMusicVolume() {
    return this.isMuted() ? 0 : this.getMasterVolume() * this.getMusicVolume();
  }
  getEffectiveSfxVolume() {
    return this.isMuted() ? 0 : this.getMasterVolume() * this.getSfxVolume();
  }

  // Music element management
  registerMusicElement(el: HTMLAudioElement | null) {
    this.currentMusicEl = el;
  }

  getCurrentMusicElement(): HTMLAudioElement | null {
    return this.currentMusicEl;
  }

  pauseCurrentMusic() {
    try {
      this.currentMusicEl?.pause();
    } catch {}
  }

  async playElementWithCurrentSettings(el: HTMLAudioElement) {
    try {
      el.loop = true;
      el.volume = this.getEffectiveMusicVolume();
      el.muted = this.isMuted();
      await el.play();
      // set as current after successful play
      this.currentMusicEl = el;
    } catch (e) {
      // noop; caller may attach user-gesture retry
    }
  }

  private clamp01(v: number) {
    return Math.max(0, Math.min(1, v));
  }
}
