/**
 * Web Audio API synthesized chime for Saraswati Sweets Admin Order Notifications.
 * Generates an elegant, luxury two-tone chime without external audio files.
 */

const SOUND_MUTED_STORAGE_KEY = 'ss_admin_order_sound_muted';

let audioCtx: AudioContext | null = null;
let lastChimeTime = 0;

/**
 * Returns or initializes the shared AudioContext singleton.
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  return audioCtx;
}

/**
 * Checks if the AudioContext is currently suspended due to browser autoplay policies.
 */
export function isAudioContextSuspended(): boolean {
  const ctx = getAudioContext();
  return !ctx || ctx.state === 'suspended';
}

/**
 * Attempts to resume/unlock the AudioContext after user interaction.
 * Returns true if successfully running.
 */
export async function unlockAudioContext(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    // Play a gentle preview tone to verify and prime the audio output
    playSubtleTone(880, 0.08, 0.12);
    return ctx.state === 'running';
  } catch (err) {
    console.warn('[AudioContext] Could not resume audio context:', err);
    return false;
  }
}

/**
 * Checks if order notification sound is muted in localStorage.
 */
export function isOrderSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SOUND_MUTED_STORAGE_KEY) === 'true';
}

/**
 * Persists the sound mute preference in localStorage.
 */
export function setOrderSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_MUTED_STORAGE_KEY, muted ? 'true' : 'false');
}

/**
 * Synthesizes a gentle single tone with smooth exponential decay.
 */
function playSubtleTone(freq: number, duration: number, gainVolume = 0.15): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(gainVolume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch {}
}

/**
 * Plays a resonant, luxury two-tone chime (D5 -> A5) for newly received orders.
 * Safe against rapid bursts: debounced so tones do not harsh-clip when multiple orders arrive.
 */
export function playNewOrderChime(): boolean {
  if (typeof window === 'undefined') return false;
  if (isOrderSoundMuted()) return false;

  const ctx = getAudioContext();
  if (!ctx) return false;

  // If suspended, we cannot play yet (UI should show "Enable notification sound" button)
  if (ctx.state === 'suspended') {
    return false;
  }

  // Throttle chimes if multiple orders arrive in rapid succession (minimum 400ms spacing)
  const nowMs = Date.now();
  if (nowMs - lastChimeTime < 400) {
    return true;
  }
  lastChimeTime = nowMs;

  try {
    const t0 = ctx.currentTime;

    // Master volume node
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.28, t0);
    masterGain.connect(ctx.destination);

    // --- Note 1: D5 (587.33 Hz) ---
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(587.33, t0);

    gain1.gain.setValueAtTime(0.0001, t0);
    gain1.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);

    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(t0);
    osc1.stop(t0 + 0.36);

    // --- Note 2: A5 (880.00 Hz) with warm harmonic ---
    const t2 = t0 + 0.12;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, t2);

    gain2.gain.setValueAtTime(0.0001, t2);
    gain2.gain.exponentialRampToValueAtTime(0.35, t2 + 0.025);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.48);

    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(t2);
    osc2.stop(t2 + 0.5);

    // Soft high overtone (1760 Hz) for bell-like brilliance
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1760.0, t2);

    gain3.gain.setValueAtTime(0.0001, t2);
    gain3.gain.exponentialRampToValueAtTime(0.08, t2 + 0.015);
    gain3.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.3);

    osc3.connect(gain3);
    gain3.connect(masterGain);
    osc3.start(t2);
    osc3.stop(t2 + 0.32);

    return true;
  } catch (err) {
    console.warn('[SoundEffects] Failed to synthesize order chime:', err);
    return false;
  }
}
