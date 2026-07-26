// Procedural ambience using the Web Audio API — no audio files needed, works
// fully offline. A small mixer: each named channel (rain, storm, snow, wind,
// fireplace, birds) can play at its own volume, simultaneously.
// Rain/snow/storm/wind are the same filtered-noise engine with different
// presets; rain adds droplet plinks, storm adds random thunder, fireplace
// adds crackles, birds are scheduled oscillator chirps.
let ctx = null;
const channels = {}; // name -> { master, nodes: [], timers: [] }

export const SOUND_CHANNELS = [
  { key: "rain", label: "Rain", icon: "🌧️" },
  { key: "storm", label: "Storm", icon: "⛈️" },
  { key: "snow", label: "Snow", icon: "❄️" },
  { key: "wind", label: "Wind", icon: "🍃" },
  { key: "fireplace", label: "Fireplace", icon: "🔥" },
  { key: "birds", label: "Birds", icon: "🐦" },
];

const NOISE_PRESETS = {
  // Rain reads as rain (not radio static) because of the droplet plinks the
  // channel schedules on top — the noise bed itself stays dark and soft.
  rain: { lowpass: 1900, highpass: 240, gain: 0.5, lfoFreq: 0.12, lfoDepth: 0.14 },
  // Snow has no patter of its own — just a hushed, heavily-muffled wind.
  snow: { lowpass: 900, highpass: 120, gain: 0.22, lfoFreq: 0.045, lfoDepth: 0.22 },
  // Storm is rain pushed louder/brighter, with gustier modulation.
  storm: { lowpass: 3200, highpass: 220, gain: 0.8, lfoFreq: 0.2, lfoDepth: 0.18 },
  // Wind is deep and slow, with strong gusting.
  wind: { lowpass: 620, highpass: 70, gain: 0.5, lfoFreq: 0.07, lfoDepth: 0.4 },
  // Fireplace base: a low, steady rumble (the crackles ride on top).
  fireplace: { lowpass: 340, highpass: 40, gain: 0.5, lfoFreq: 0.3, lfoDepth: 0.1 },
};

function ensureContext() {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function createNoiseBuffer(context, seconds = 2) {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const data = buffer.getChannelData(0);
  // Brownian-ish noise: softer / less harsh than pure white noise.
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  return buffer;
}

// ---- one-shot voices (all routed through the channel's master gain, so the
// channel's volume slider scales them too) ------------------------------- //

function playThunder(master) {
  const burst = ctx.createBufferSource();
  burst.buffer = createNoiseBuffer(ctx, 3);
  const rumble = ctx.createBiquadFilter();
  rumble.type = "lowpass";
  rumble.frequency.value = 180 + Math.random() * 120;
  const env = ctx.createGain();
  const now = ctx.currentTime;
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.6 + Math.random() * 0.5, now + 0.15);
  env.gain.exponentialRampToValueAtTime(0.001, now + 2.5 + Math.random() * 2);
  burst.connect(rumble).connect(env).connect(master);
  burst.start();
  burst.stop(now + 5);
}

function playCrackle(master) {
  const pop = ctx.createBufferSource();
  pop.buffer = createNoiseBuffer(ctx, 0.1);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1600 + Math.random() * 2400;
  band.Q.value = 1.2;
  const env = ctx.createGain();
  const now = ctx.currentTime;
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(1.5 + Math.random() * 2.5, now + 0.004);
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.03 + Math.random() * 0.06);
  pop.connect(band).connect(env).connect(master);
  pop.start();
  pop.stop(now + 0.15);
}

// A single raindrop hitting a surface: a tiny bright tap with instant decay.
// These transients are what make the ear read "rain" instead of "static".
function playDroplet(master, strength = 1) {
  const tap = ctx.createBufferSource();
  tap.buffer = createNoiseBuffer(ctx, 0.05);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1100 + Math.random() * 2400;
  band.Q.value = 5;
  const env = ctx.createGain();
  const now = ctx.currentTime;
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(strength * (0.18 + Math.random() * 0.3), now + 0.003);
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.02 + Math.random() * 0.04);
  tap.connect(band).connect(env).connect(master);
  tap.start();
  tap.stop(now + 0.08);
}

function playChirp(master) {
  const base = 2300 + Math.random() * 900;
  let t = ctx.currentTime + 0.02;
  const notes = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < notes; i++) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(base + Math.random() * 300, t);
    osc.frequency.exponentialRampToValueAtTime(base + 600 + Math.random() * 500, t + 0.06);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.16 + Math.random() * 0.1, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(env).connect(master);
    osc.start(t);
    osc.stop(t + 0.2);
    t += 0.12 + Math.random() * 0.1;
  }
}

// Self-rescheduling one-shot loop. Kept per-channel so stopping the channel
// clears it; the callback re-checks the channel still exists before playing.
function loop(name, fire, minMs, maxMs) {
  const schedule = () => {
    const ch = channels[name];
    if (!ch) return;
    const id = setTimeout(() => {
      const live = channels[name];
      if (!live) return;
      fire(live.master);
      schedule();
    }, minMs + Math.random() * (maxMs - minMs));
    channels[name].timers.push(id);
  };
  schedule();
}

function startChannel(name, volume) {
  const context = ensureContext();
  const preset = NOISE_PRESETS[name] || NOISE_PRESETS.rain;

  const master = context.createGain();
  master.gain.value = volume * preset.gain;
  master.connect(context.destination);
  const ch = { master, nodes: [], timers: [] };
  channels[name] = ch;

  if (name !== "birds") {
    const noise = context.createBufferSource();
    noise.buffer = createNoiseBuffer(context);
    noise.loop = true;
    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = preset.lowpass;
    const highpass = context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = preset.highpass;
    // Slow LFO so the ambience "breathes" instead of sounding static.
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    lfo.frequency.value = preset.lfoFreq;
    lfoGain.gain.value = volume * preset.lfoDepth;
    lfo.connect(lfoGain).connect(master.gain);
    noise.connect(highpass).connect(lowpass).connect(master);
    noise.start();
    lfo.start();
    ch.nodes.push(noise, lfo);
    ch.lfoGain = lfoGain;
    ch.preset = preset;
  }

  if (name === "storm") loop(name, playThunder, 6000, 20000);
  if (name === "fireplace") loop(name, playCrackle, 90, 420);
  if (name === "birds") loop(name, playChirp, 1800, 7000);
  if (name === "rain") loop(name, (m) => playDroplet(m, 1), 70, 220);
}

function stopChannel(name) {
  const ch = channels[name];
  if (!ch) return;
  delete channels[name];
  ch.timers.forEach(clearTimeout);
  ch.nodes.forEach((node) => {
    try {
      node.stop();
    } catch {
      /* already stopped */
    }
  });
  // Let any in-flight one-shots (thunder tail) fade instead of clicking off.
  ch.master.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
  setTimeout(() => ch.master.disconnect(), 1500);
}

// The mixer's whole API: volume 0 stops a channel, anything above starts it
// (or retunes a running one).
export function setChannel(name, volume) {
  const vol = Math.max(0, Math.min(1, Number(volume) || 0));
  if (vol <= 0) {
    stopChannel(name);
    return;
  }
  if (!channels[name]) {
    startChannel(name, vol);
    return;
  }
  const ch = channels[name];
  const preset = ch.preset || { gain: 1, lfoDepth: 0 };
  ch.master.gain.setTargetAtTime(vol * preset.gain, ctx.currentTime, 0.2);
  if (ch.lfoGain) ch.lfoGain.gain.setTargetAtTime(vol * preset.lfoDepth, ctx.currentTime, 0.2);
}

export function applyMix(mix) {
  for (const { key } of SOUND_CHANNELS) setChannel(key, mix?.[key] || 0);
}

// A soft two-note chime for timer moments (block done, break over) — same
// no-files philosophy as the ambience. Deliberately quiet: it marks the
// moment for someone in the room, it doesn't demand attention. System
// notifications cover the stepped-away case.
export function playChime() {
  const context = ensureContext();
  const now = context.currentTime;
  [523.25, 783.99].forEach((freq, i) => {
    const osc = context.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const env = context.createGain();
    const t = now + i * 0.16;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.07, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    osc.connect(env).connect(context.destination);
    osc.start(t);
    osc.stop(t + 1.2);
  });
}

export function stopAllSound() {
  Object.keys(channels).forEach(stopChannel);
}
