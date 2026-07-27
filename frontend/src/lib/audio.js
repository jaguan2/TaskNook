// Procedural ambience using the Web Audio API — no audio files needed, works
// fully offline. A small mixer: each named channel (rain, storm, snow, wind,
// fireplace, cafe, paper) can play at its own volume, simultaneously.
// Rain/snow/storm/wind/cafe are the same filtered-noise engine with
// different presets; rain adds droplet plinks, storm adds random thunder,
// fireplace adds crackles, the café murmurs under steam-wand bursts and cup
// clinks, and paper is one-shots only (an occasional page turn, no bed).
let ctx = null;
const channels = {}; // name -> { master, nodes: [], timers: [] }

// Birds used to hold the last slot — replaced (user request): page turns and
// a café suit a study nook better than chirps ever did.
export const SOUND_CHANNELS = [
  { key: "rain", label: "Rain", icon: "🌧️" },
  { key: "storm", label: "Storm", icon: "⛈️" },
  { key: "snow", label: "Snow", icon: "❄️" },
  { key: "wind", label: "Wind", icon: "🍃" },
  { key: "fireplace", label: "Fireplace", icon: "🔥" },
  { key: "cafe", label: "Café", icon: "☕" },
  { key: "paper", label: "Page turns", icon: "📖" },
];

const NOISE_PRESETS = {
  // Rain reads as rain (not radio static) because of the droplet plinks the
  // channel schedules on top — the noise bed itself stays dark and soft.
  // Tuned down twice on user feedback ("blurry radio"): the bed is only the
  // distant wash now — quiet, heavily low-passed — and the droplets carry
  // the identity (varied pitch, varied pan, varied loudness).
  rain: { lowpass: 1100, highpass: 320, gain: 0.26, lfoFreq: 0.09, lfoDepth: 0.1 },
  // Snow has no patter of its own — just a hushed, heavily-muffled wind.
  snow: { lowpass: 900, highpass: 120, gain: 0.22, lfoFreq: 0.045, lfoDepth: 0.22 },
  // Storm is rain pushed louder/brighter, with gustier modulation.
  storm: { lowpass: 3200, highpass: 220, gain: 0.8, lfoFreq: 0.2, lfoDepth: 0.18 },
  // Wind is deep and slow, with strong gusting.
  wind: { lowpass: 620, highpass: 70, gain: 0.5, lfoFreq: 0.07, lfoDepth: 0.4 },
  // Fireplace base: a low, steady rumble (the crackles ride on top).
  fireplace: { lowpass: 340, highpass: 40, gain: 0.5, lfoFreq: 0.3, lfoDepth: 0.1 },
  // Café bed: the low blurred murmur of a room of soft conversation —
  // heavily low-passed so no syllables exist, with a slow swell like the
  // room's chatter ebbing and flowing. Steam + clinks ride on top.
  cafe: { lowpass: 420, highpass: 70, gain: 0.32, lfoFreq: 0.05, lfoDepth: 0.3 },
  // Paper has NO noise bed (a rustle isn't continuous) — this entry only
  // scales its one-shots via the master gain.
  paper: { gain: 0.9 },
};

// One-shot-only channels: no looping noise bed, just scheduled events.
const BEDLESS = new Set(["paper"]);

function ensureContext() {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// One buffer per (length, colour), generated once and shared — an
// AudioBuffer can back any number of source nodes, and regenerating noise
// per one-shot cost ~22k Math.random() calls a SECOND while rain played.
// Per-shot character comes from the filters/envelopes, not fresh noise.
const noiseCache = new Map();
function createNoiseBuffer(context, seconds = 2, white = false) {
  const key = `${seconds}|${white}`;
  const hit = noiseCache.get(key);
  if (hit && hit.sampleRate === context.sampleRate) return hit;
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const data = buffer.getChannelData(0);
  if (white) {
    // Plain white noise: bright and crisp — right for paper and steam,
    // where the sound IS the high end (brown noise has none to give).
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
  } else {
    // Brownian-ish noise: softer / less harsh than pure white noise.
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  }
  noiseCache.set(key, buffer);
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

// A single raindrop hitting a surface: a tiny damped tap with instant decay.
// These transients are what make the ear read "rain" instead of "static".
// Three kinds of realism, all cheap: pitch varies drop to drop (leaf vs
// windowsill), loudness varies a lot (most drops are far away), and each
// drop lands somewhere different in the stereo field.
function playDroplet(master, strength = 1) {
  const tap = ctx.createBufferSource();
  tap.buffer = createNoiseBuffer(ctx, 0.05);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  // Mostly soft mid-range plops, occasionally a brighter tick.
  const bright = Math.random() < 0.25;
  band.frequency.value = bright ? 2200 + Math.random() * 1600 : 700 + Math.random() * 1100;
  band.Q.value = 6 + Math.random() * 5;
  const env = ctx.createGain();
  const now = ctx.currentTime;
  // Squared random: most drops quiet and distant, a few close and clear.
  const level = strength * (0.06 + Math.random() * Math.random() * 0.5);
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(level, now + 0.004);
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.03 + Math.random() * 0.05);
  let tail = env;
  if (ctx.createStereoPanner) {
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    env.connect(pan);
    tail = pan;
  }
  tap.connect(band).connect(env);
  tail.connect(master);
  tap.start();
  tap.stop(now + 0.1);
}

// A page turning: a soft swept "fffp" of white noise (the frequency slides
// up as the page lifts and accelerates) with a couple of tiny crinkle ticks
// riding on it. Occasional by design — someone reading, not shuffling.
function playPageTurn(master) {
  const now = ctx.currentTime;
  const dur = 0.22 + Math.random() * 0.2;
  const swish = ctx.createBufferSource();
  swish.buffer = createNoiseBuffer(ctx, 1, true);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.1;
  band.frequency.setValueAtTime(1100 + Math.random() * 500, now);
  band.frequency.exponentialRampToValueAtTime(2600 + Math.random() * 1400, now + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.32 + Math.random() * 0.18, now + dur * 0.6);
  env.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.09);
  swish.connect(band).connect(env).connect(master);
  swish.start(now);
  swish.stop(now + dur + 0.12);
  // paper crinkles: bright micro-ticks scattered through the turn
  const ticks = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < ticks; i++) {
    const t = now + Math.random() * dur;
    const tick = ctx.createBufferSource();
    tick.buffer = createNoiseBuffer(ctx, 0.03, true);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 3200 + Math.random() * 2200;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.1 + Math.random() * 0.12, t + 0.004);
    e.gain.exponentialRampToValueAtTime(0.001, t + 0.028);
    tick.connect(hp).connect(e).connect(master);
    tick.start(t);
    tick.stop(t + 0.05);
  }
}

// The espresso machine's steam wand: a hiss that swells, holds a moment,
// and dies away. Kept narrow-band and modest — it's across the room.
function playSteam(master) {
  const now = ctx.currentTime;
  const dur = 0.7 + Math.random() * 0.9;
  const hiss = ctx.createBufferSource();
  hiss.buffer = createNoiseBuffer(ctx, 3, true);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2500 + Math.random() * 900;
  band.Q.value = 0.9;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.14 + Math.random() * 0.08, now + 0.2);
  env.gain.setTargetAtTime(0.09, now + dur * 0.5, 0.25);
  env.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.5);
  hiss.connect(band).connect(env).connect(master);
  hiss.start(now);
  hiss.stop(now + dur + 0.6);
}

// A cup meeting a saucer: two quick porcelain pings, the second a shade
// higher and softer (the bounce).
function playClink(master) {
  const base = 2200 + Math.random() * 1500;
  const t0 = ctx.currentTime + 0.01;
  [0, 0.035 + Math.random() * 0.04].forEach((dt, i) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = base * (i ? 1.13 : 1);
    const env = ctx.createGain();
    const t = t0 + dt;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime((i ? 0.05 : 0.09) + Math.random() * 0.05, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(env).connect(master);
    osc.start(t);
    osc.stop(t + 0.12);
  });
}

// Self-rescheduling one-shot loop. Each loop owns ONE timer slot (pushing
// every fired id into an array grew ~9 ids/second under rain, forever);
// stopping the channel clears the slot, and the callback re-checks the
// channel still exists before playing.
function loop(name, fire, minMs, maxMs) {
  const ch = channels[name];
  if (!ch) return;
  const slot = { id: null };
  ch.loops.push(slot);
  const schedule = () => {
    if (!channels[name]) return;
    slot.id = setTimeout(() => {
      const live = channels[name];
      if (!live) return;
      fire(live.master);
      schedule();
    }, minMs + Math.random() * (maxMs - minMs));
  };
  schedule();
}

function startChannel(name, volume) {
  const context = ensureContext();
  const preset = NOISE_PRESETS[name] || NOISE_PRESETS.rain;

  const master = context.createGain();
  master.gain.value = volume * (preset.gain ?? 1);
  master.connect(context.destination);
  const ch = { master, nodes: [], loops: [], preset };
  channels[name] = ch;

  if (!BEDLESS.has(name)) {
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
  }

  if (name === "storm") loop(name, playThunder, 6000, 20000);
  if (name === "fireplace") loop(name, playCrackle, 90, 420);
  // The café is two overlapping rhythms on top of the murmur bed.
  if (name === "cafe") {
    loop(name, playSteam, 9000, 26000);
    loop(name, playClink, 6000, 17000);
  }
  if (name === "paper") loop(name, playPageTurn, 4500, 14000);
  // Dense but quiet: lots of small drops beats few loud ones.
  if (name === "rain") loop(name, (m) => playDroplet(m, 1), 45, 170);
}

function stopChannel(name) {
  const ch = channels[name];
  if (!ch) return;
  delete channels[name];
  ch.loops.forEach((slot) => clearTimeout(slot.id));
  ch.nodes.forEach((node) => {
    try {
      node.stop();
    } catch {
      /* already stopped */
    }
  });
  // Let any in-flight one-shots (thunder tail) fade instead of clicking off.
  ch.master.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
  setTimeout(() => {
    ch.master.disconnect();
    // With every channel silent, park the render thread — a running
    // AudioContext keeps the audio hardware awake even when producing
    // silence. ensureContext resumes it on the next play.
    if (!Object.keys(channels).length && ctx?.state === "running") {
      ctx.suspend().catch(() => {});
    }
  }, 1500);
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

