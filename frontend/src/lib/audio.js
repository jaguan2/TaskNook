// Procedural rain ambience using the Web Audio API — no audio files needed,
// works fully offline. Filtered noise + a slow LFO gives a gentle rainfall.
let ctx = null;
let noiseSource = null;
let masterGain = null;
let running = false;

function createNoiseBuffer(context) {
  const seconds = 2;
  const buffer = context.createBuffer(
    1,
    context.sampleRate * seconds,
    context.sampleRate
  );
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

export function startRain(volume = 0.5) {
  if (running) {
    setRainVolume(volume);
    return;
  }
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();

  noiseSource = ctx.createBufferSource();
  noiseSource.buffer = createNoiseBuffer(ctx);
  noiseSource.loop = true;

  // Shape the noise into "rain": roll off highs, cut rumble.
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 2600;

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 380;

  masterGain = ctx.createGain();
  masterGain.gain.value = volume * 0.6;

  // Slow LFO so the rain "breathes" instead of sounding static.
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.12;
  lfoGain.gain.value = volume * 0.12;
  lfo.connect(lfoGain).connect(masterGain.gain);

  noiseSource.connect(highpass).connect(lowpass).connect(masterGain).connect(
    ctx.destination
  );
  noiseSource.start();
  lfo.start();
  running = true;
}

export function stopRain() {
  if (!running) return;
  try {
    noiseSource.stop();
  } catch {
    /* already stopped */
  }
  noiseSource = null;
  running = false;
}

export function setRainVolume(volume) {
  if (masterGain && ctx) {
    masterGain.gain.setTargetAtTime(volume * 0.6, ctx.currentTime, 0.2);
  }
}

export function isRaining() {
  return running;
}
