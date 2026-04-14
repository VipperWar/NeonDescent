// js/AudioManager.js

class AudioManager {
  constructor() {
    this.sounds = {};
    this.music = null;
    this.isMuted = false;

    const savedMusic = localStorage.getItem("neonDescent_musicVolume");
    const savedSFX = localStorage.getItem("neonDescent_sfxVolume");
    this.musicVolume = savedMusic !== null ? parseFloat(savedMusic) : 0.3;
    this.sfxVolume = savedSFX !== null ? parseFloat(savedSFX) : 0.5;

    this.init();
  }

  init() {
    this.sounds.jump = new Howl({
      src: ["audio/jump.wav"],
      volume: this.sfxVolume,
    });
    this.sounds.bit = new Howl({
      src: ["audio/bit_sound.wav"],
      volume: this.sfxVolume,
    });
    this.sounds.damage = new Howl({
      src: ["audio/glitch.wav"],
      volume: this.sfxVolume,
    });
    this.sounds.overclock = new Howl({
      src: ["audio/overclock.wav"],
      volume: this.sfxVolume,
    });
    this.sounds.gameover = new Howl({
      src: ["audio/game_over.wav"],
      volume: this.sfxVolume,
    });

    this.music = new Howl({
      src: ["audio/synthwave_loop.wav"],
      loop: true,
      volume: this.musicVolume,
    });
  }

  play(soundName) {
    if (this.isMuted) return;
    const sound = this.sounds[soundName];
    if (sound) sound.play();
  }

  playMusic() {
    if (this.isMuted) return;
    if (this.music && !this.music.playing()) this.music.play();
  }

  stopMusic() {
    if (this.music) this.music.stop();
  }

  setMusicVolume(value) {
    this.musicVolume = Math.max(0, Math.min(1, value));
    if (this.music) this.music.volume(this.musicVolume);
    localStorage.setItem("neonDescent_musicVolume", this.musicVolume);
  }

  setSFXVolume(value) {
    this.sfxVolume = Math.max(0, Math.min(1, value));
    Object.values(this.sounds).forEach((sound) => sound.volume(this.sfxVolume));
    localStorage.setItem("neonDescent_sfxVolume", this.sfxVolume);
  }

  getMusicVolume() {
    return this.musicVolume;
  }

  getSFXVolume() {
    return this.sfxVolume;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    Howler.mute(this.isMuted);
  }
}

window.AudioManager = AudioManager;
