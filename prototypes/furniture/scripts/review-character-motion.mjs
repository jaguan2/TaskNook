import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { characterSourceFingerprint } from './character-source.mjs';
import { probeCharacterFit } from './character-fit-probes.mjs';

// A deterministic fit simulation of production SVGs and the production CSS.
// This checks concrete joint/foot contacts, not just fixture counts. Intended
// overlaps (crossing shins, rear shoes in profile, hair behind clothes) remain.
const root = new URL('../../../', import.meta.url);
const source = new URL('frontend/art-sheet/svg/', root);
const output = new URL('build/skill-verification/character-motion/', root);
await mkdir(output, { recursive: true });
const generated = spawnSync(process.execPath, ['scripts/art-sheet.mjs'], {
  cwd: fileURLToPath(new URL('frontend/', root)), encoding: 'utf8',
  env: { ...process.env, CHARACTER_MOTION_SHEET: '1' }, maxBuffer: 16 * 1024 * 1024,
});
await writeFile(new URL('art-generation.log', output), (generated.stdout || '') + (generated.stderr || ''));
assert.equal(generated.status, 0, 'fixture generation failed; see character-motion/art-generation.log');
const files = (await readdir(source)).filter(name => /^motion-.*\.svg$/.test(name)).sort();
assert.equal(files.filter(name => !name.startsWith('motion-held-preset-')).length, 4356, 'incomplete pants/shoes/body/view/pose matrix');
assert.ok(files.some(name => name.startsWith('motion-held-preset-')), 'missing complete character looks');
const css = await readFile(new URL('frontend/src/index.css', root), 'utf8');
// Stride/sway extremes plus idle gesture peaks. All clocks are paused and
// sought, so a fast machine and a slow one inspect the same rendered frames.
const times = [0, .22, .44, .66, .8, 1.6, 2.4, 53 * .955, 79 * .94, 89 * .94, 101 * .94];
const evidence = { sourceFingerprint: await characterSourceFingerprint(), browser: null,
  times, configurations: files.length, frames: 0, bootProbes: 0, jointProbes: 0, reducedChecks: 0, failures: [] };
const browser = await chromium.launch({ headless: true, channel: process.env.FURNITURE_BROWSER_CHANNEL || 'msedge' });
try {
  evidence.browser = browser.version();
  const page = await browser.newPage({ viewport: { width: 1440, height: 790 } });
  for (const [index, name] of files.entries()) {
    await page.setContent(`<style>${css}</style>${await readFile(new URL(name, source), 'utf8')}`);
    const result = await page.evaluate(probeCharacterFit, { times, name });
    evidence.frames += times.length;
    evidence.bootProbes += result.bootProbes;
    evidence.jointProbes += result.jointProbes;
    evidence.reducedChecks++;
    if (result.failures.length) evidence.failures.push({ name, failures: result.failures });
    if ((index + 1) % 500 === 0) console.log(`Simulated ${index + 1}/${files.length} configurations`);
  }
  // Negative controls prove the simulation detects the errors it claims to.
  const control = 'motion-held-skirt-boots-compact-front.svg';
  evidence.negativeControls = [];
  for (const fault of ['shoe', 'leg', 'frame', 'reduced']) {
    await page.setContent(`<style>${css}</style>${await readFile(new URL(control, source), 'utf8')}`);
    await page.evaluate(fault => {
      if (fault === 'shoe') document.querySelector('[data-held-shoe]').setAttribute('transform', 'translate(25 0)');
      if (fault === 'leg') document.querySelector('[data-held-leg]').remove();
      if (fault === 'frame') document.querySelector('[data-resident-pose]').setAttribute('transform', 'translate(200 0)');
      if (fault === 'reduced') document.querySelector('.resident-held')
        .style.setProperty('animation', 'resident-held 3.2s ease-in-out infinite', 'important');
    }, fault);
    const result = await page.evaluate(probeCharacterFit, { times: [0], name: control });
    const expected = { shoe: 'detached shoe', leg: 'missing leg', frame: 'frame clipping', reduced: 'animations remain in reduced motion' }[fault];
    assert.ok(result.failures.some(message => message.startsWith(expected)), `simulation missed injected ${fault} fault`);
    evidence.negativeControls.push({ fault, detected: expected });
  }
  // Compact review sheet uses real CSS at fixed times, never an artist's mockup.
  const reviews = ['held', 'standing'].flatMap(pose => ['skirt', 'jeans', 'maxi'].flatMap(pants =>
    ['front', 'side', 'back'].map(view => `motion-${pose}-${pants}-boots-compact-${view}.svg`)));
  const cards = await Promise.all(reviews.map(async name => `<figure><iframe title="${name}" srcdoc="${(`<style>${css}</style>${await readFile(new URL(name, source), 'utf8')}`).replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"></iframe><figcaption>${name.replace('motion-', '').replace('.svg', '')}</figcaption></figure>`));
  await page.setContent(`<style>body{margin:0;padding:20px;background:#ded6c8;color:#403746;font:12px Segoe UI}h1{font:26px Georgia}.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}figure{margin:0;background:#f3ecdf;border-radius:8px}iframe{border:0;width:100%;height:195px}figcaption{padding:6px;font-size:10px}</style><h1>Pickup pose and standing comparison</h1><p>Production SVG + CSS · soft knees, joined shoes and one carry clock · Picked up and standing | front, profile and back</p><div class="grid">${cards.join('')}</div>`);
  for (const frame of page.frames().slice(1)) await frame.evaluate(() => {
    document.documentElement.dataset.motion = 'full';
    document.documentElement.style.cssText = 'background:#f3ecdf;color-scheme:light';
    document.body.style.cssText = 'margin:0;background:#f3ecdf;display:grid;place-items:center;height:195px';
    const svg = document.querySelector('svg'); svg.setAttribute('width', '125'); svg.setAttribute('height', '185');
    svg.getAnimations({ subtree: true }).forEach(animation => { animation.pause(); animation.currentTime = 800; });
  });
  await page.screenshot({ path: fileURLToPath(new URL('pickup-pose.png', output)), fullPage: true });
  await writeFile(new URL('summary.json', output), JSON.stringify(evidence, null, 2) + '\n');
  assert.equal(evidence.failures.length, 0, `fit failures; see character-motion/summary.json (${evidence.failures.slice(0, 3).map(f => f.name).join(', ')})`);
  console.log(`PASS: ${evidence.configurations} configurations, ${evidence.frames} frames, ${evidence.jointProbes} joint probes, ${evidence.bootProbes} boot probes, ${evidence.reducedChecks} reduced-motion checks.`);
} finally { await browser.close(); }
