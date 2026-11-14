import { expect, it } from 'vitest';
import { npcProfile } from './npcProfiles';
import { parseBirthDate } from './profile';

it('keeps neighbour identity stable across time, name casing and caller edits', () => {
  const before = npcProfile('luna');
  expect(npcProfile(' LUNA ')).toEqual(before);
  before.pronouns = 'changed'; before.birthDate = '1900-01-01';
  expect(npcProfile('luna').pronouns).toBe('she/her');
  expect(npcProfile('luna').birthDate).toBe('1997-10-12');
  expect(npcProfile('kai')).not.toEqual(npcProfile('luna'));
});

it('gives generated neighbours valid, stable dates and coherent fictional profiles', () => {
  const pronouns = { woman: 'she/her', man: 'he/him', nonbinary: 'they/them' };
  const profiles = new Set();
  for (const name of ['luna', 'kai', 'sora', 'mochi', 'constructor', '__proto__', ...Array.from({ length: 100 }, (_, i) => `neighbour-${i}`)]) {
    const profile = npcProfile(name), birthday = parseBirthDate(profile.birthDate), joined = parseBirthDate(profile.joinedDate);
    expect(birthday).not.toBeNull(); expect(joined).not.toBeNull();
    expect(joined.year - birthday.year).toBeGreaterThanOrEqual(18);
    expect(pronouns[profile.gender]).toBe(profile.pronouns);
    expect(npcProfile(name)).toEqual(profile);
    profiles.add(JSON.stringify(profile));
  }
  expect(profiles.size).toBeGreaterThan(90);
});
