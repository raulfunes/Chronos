import { AmbientSound } from '../types';

type AmbientProfile = {
  bufferFactory: (context: BaseAudioContext) => AudioBuffer;
  filterFrequency: number;
  filterQ: number;
  gain: number;
};

function createWhiteNoiseBuffer(context: BaseAudioContext, seconds: number, tint = 1) {
  const frameCount = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < frameCount; index += 1) {
    channel[index] = (Math.random() * 2 - 1) * tint;
  }

  return buffer;
}

function createBrownNoiseBuffer(context: BaseAudioContext, seconds: number) {
  const frameCount = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);

  let last = 0;
  for (let index = 0; index < frameCount; index += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    channel[index] = last * 3.5;
  }

  return buffer;
}

function createRainBuffer(context: BaseAudioContext) {
  return createWhiteNoiseBuffer(context, 3, 0.7);
}

function createRiverBuffer(context: BaseAudioContext) {
  return createBrownNoiseBuffer(context, 4);
}

function createWhiteNoise(context: BaseAudioContext) {
  return createWhiteNoiseBuffer(context, 2, 0.9);
}

const AMBIENT_PROFILES: Record<Exclude<AmbientSound, 'NONE'>, AmbientProfile> = {
  RAIN: {
    bufferFactory: createRainBuffer,
    filterFrequency: 4200,
    filterQ: 0.7,
    gain: 0.26,
  },
  RIVER: {
    bufferFactory: createRiverBuffer,
    filterFrequency: 900,
    filterQ: 0.9,
    gain: 0.38,
  },
  WHITE_NOISE: {
    bufferFactory: createWhiteNoise,
    filterFrequency: 14000,
    filterQ: 0.1,
    gain: 0.22,
  },
};

export class AmbientAudioEngine {
  private context: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private cueGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private currentSound: AmbientSound = 'NONE';
  private currentVolume = 35;
  private currentProfileGain = 0.2;
  private duckFactor = 1;
  private activeCueNodes = new Set<OscillatorNode>();

  async prime() {
    const context = this.ensureContext();
    if (context.state !== 'running') {
      await context.resume();
    }
  }

  async play(sound: AmbientSound, volume: number) {
    if (sound === 'NONE') {
      this.stop();
      return;
    }

    const context = this.ensureContext();
    if (context.state !== 'running') {
      await context.resume();
    }

    if (this.currentSound !== sound || !this.sourceNode) {
      this.stopCurrentSource();
      this.startProfile(sound, volume);
      return;
    }

    this.setVolume(volume);
  }

  setVolume(volume: number) {
    this.currentVolume = volume;
    if (!this.context || !this.ambientGain) {
      return;
    }

    this.ambientGain.gain.setTargetAtTime(this.getAmbientTargetGain(volume), this.context.currentTime, 0.08);
  }

  playBlockTransitionCue() {
    this.playCue({
      startFrequency: 880,
      endFrequency: 1320,
      durationSeconds: 0.22,
      gain: 0.22,
      type: 'triangle',
    });
  }

  playSessionStartCue() {
    this.playCue({
      startFrequency: 640,
      endFrequency: 980,
      durationSeconds: 0.16,
      gain: 0.18,
      type: 'sine',
    });
  }

  playSessionCompleteCue() {
    this.playCue({
      startFrequency: 920,
      endFrequency: 620,
      durationSeconds: 0.24,
      gain: 0.2,
      type: 'triangle',
    });
  }

  playCountdownTick(tick: 3 | 2 | 1) {
    const frequencyByTick: Record<3 | 2 | 1, number> = {
      3: 760,
      2: 920,
      1: 1080,
    };

    this.playCue({
      startFrequency: frequencyByTick[tick],
      endFrequency: frequencyByTick[tick],
      durationSeconds: 0.1,
      gain: 0.18,
      type: 'square',
    });
  }

  duckAmbient(factor: number, attackMs: number) {
    this.duckFactor = Math.max(0, Math.min(1, factor));
    if (!this.context || !this.ambientGain) {
      return;
    }

    const now = this.context.currentTime;
    this.ambientGain.gain.cancelScheduledValues(now);
    this.ambientGain.gain.linearRampToValueAtTime(this.getAmbientTargetGain(), now + attackMs / 1000);
  }

  restoreAmbient(releaseMs: number) {
    this.duckFactor = 1;
    if (!this.context || !this.ambientGain) {
      return;
    }

    const now = this.context.currentTime;
    this.ambientGain.gain.cancelScheduledValues(now);
    this.ambientGain.gain.linearRampToValueAtTime(this.getAmbientTargetGain(), now + releaseMs / 1000);
  }

  stopTransitionCues() {
    for (const oscillator of this.activeCueNodes) {
      try {
        oscillator.stop();
      } catch {
        // Ignore oscillators already ended.
      }
      oscillator.disconnect();
    }
    this.activeCueNodes.clear();
  }

  stop() {
    this.stopCurrentSource();
    this.stopTransitionCues();
    this.duckFactor = 1;
    this.currentSound = 'NONE';
  }

  destroy() {
    this.stop();
    if (this.context) {
      void this.context.close();
      this.context = null;
      this.ambientGain = null;
      this.cueGain = null;
      this.filterNode = null;
    }
  }

  private ensureContext() {
    if (!this.context) {
      const AudioContextConstructor = window.AudioContext ?? (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

      if (!AudioContextConstructor) {
        throw new Error('Web Audio API is not supported in this browser');
      }

      this.context = new AudioContextConstructor();
      this.ambientGain = this.context.createGain();
      this.cueGain = this.context.createGain();
      this.filterNode = this.context.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.connect(this.ambientGain);
      this.ambientGain.connect(this.context.destination);
      this.cueGain.connect(this.context.destination);
    }

    return this.context;
  }

  private startProfile(sound: Exclude<AmbientSound, 'NONE'>, volume: number) {
    const context = this.ensureContext();
    const profile = AMBIENT_PROFILES[sound];
    const sourceNode = context.createBufferSource();
    sourceNode.buffer = profile.bufferFactory(context);
    sourceNode.loop = true;

    if (!this.filterNode || !this.ambientGain) {
      return;
    }

    this.filterNode.frequency.setValueAtTime(profile.filterFrequency, context.currentTime);
    this.filterNode.Q.setValueAtTime(profile.filterQ, context.currentTime);
    this.ambientGain.gain.setValueAtTime(0, context.currentTime);

    sourceNode.connect(this.filterNode);
    sourceNode.start();

    this.sourceNode = sourceNode;
    this.currentSound = sound;
    this.currentVolume = volume;
    this.currentProfileGain = profile.gain;
    this.ambientGain.gain.cancelScheduledValues(context.currentTime);
    this.ambientGain.gain.linearRampToValueAtTime(this.getAmbientTargetGain(volume), context.currentTime + 0.15);
  }

  private stopCurrentSource() {
    if (!this.context || !this.sourceNode) {
      this.sourceNode = null;
      return;
    }

    if (this.ambientGain) {
      this.ambientGain.gain.cancelScheduledValues(this.context.currentTime);
      this.ambientGain.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
    }

    try {
      this.sourceNode.stop(this.context.currentTime + 0.1);
    } catch {
      this.sourceNode.stop();
    }
    this.sourceNode.disconnect();
    this.sourceNode = null;
  }

  private getAmbientTargetGain(volume = this.currentVolume) {
    const normalizedVolume = Math.max(0, Math.min(100, volume)) / 100;
    return normalizedVolume * this.currentProfileGain * this.duckFactor;
  }

  private playCue({
    startFrequency,
    endFrequency,
    durationSeconds,
    gain,
    type,
  }: {
    startFrequency: number;
    endFrequency: number;
    durationSeconds: number;
    gain: number;
    type: OscillatorType;
  }) {
    const context = this.ensureContext();
    if (!this.cueGain) {
      return;
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const now = context.currentTime;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.linearRampToValueAtTime(endFrequency, now + durationSeconds);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

    oscillator.connect(gainNode);
    gainNode.connect(this.cueGain);

    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
      this.activeCueNodes.delete(oscillator);
    };

    this.activeCueNodes.add(oscillator);
    oscillator.start(now);
    oscillator.stop(now + durationSeconds + 0.02);
  }
}
