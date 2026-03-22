export class AudioManager {
  private masterVolume = 0.8;
  private sounds = new Map<string, HTMLAudioElement>();

  playSound(name: string, volume: number = 1.0) {
    try {
      const audio = new Audio(`/assets/audio/${name}.wav`);
      audio.volume = Math.max(0, Math.min(1, volume * this.masterVolume));
      audio.play().catch(e => {
        // Silenciar erros (browser pode bloquear autoplay)
        console.debug(`Audio play failed for ${name}:`, e.message);
      });
    } catch (e) {
      console.debug(`Audio error for ${name}:`, e);
    }
  }

  setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  getVolume(): number {
    return this.masterVolume;
  }

  stopAll() {
    this.sounds.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }
}
