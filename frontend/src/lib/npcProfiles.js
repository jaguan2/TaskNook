// Fictional neighbour facts. These are independent of appearance and the local
// database's creation date, so a reinstall or a new outfit cannot change them.
const familiar = {
  luna: { birthDate: '1997-10-12', gender: 'woman', pronouns: 'she/her', joinedDate: '2023-09-18', interest: 'nightOwl' },
  kai: { birthDate: '1996-03-17', gender: 'man', pronouns: 'he/him', joinedDate: '2024-01-07', interest: 'reader' },
  sora: { birthDate: '1999-05-24', gender: 'nonbinary', pronouns: 'they/them', joinedDate: '2023-04-22', interest: 'gardener' },
  mochi: { birthDate: '1995-11-08', gender: 'woman', pronouns: 'she/her', joinedDate: '2022-11-06', interest: 'baker' },
};
const genders = [['woman', 'she/her'], ['man', 'he/him'], ['nonbinary', 'they/them']];
const interests = ['nightOwl', 'reader', 'gardener', 'baker'];
function hash(value) {
  let result = 2166136261;
  for (const ch of value) result = Math.imul(result ^ ch.codePointAt(0), 16777619) >>> 0;
  return result;
}
function dateFor(username, field, firstYear, years) {
  const value = hash(`${username}:${field}`);
  return `${firstYear + value % years}-${String(1 + (value >>> 8) % 12).padStart(2, '0')}-${String(1 + (value >>> 16) % 28).padStart(2, '0')}`;
}

/** Stable character-world profiles for the app's simulated friends. No clock,
 * random sampling, storage or guessed attributes from their name/artwork. */
export function npcProfile(username) {
  const key = String(username || 'neighbour').trim().toLowerCase();
  if (Object.hasOwn(familiar, key)) return { ...familiar[key] };
  const [gender, pronouns] = genders[hash(`${key}:identity`) % genders.length];
  return { birthDate: dateFor(key, 'birthday', 1993, 9), gender, pronouns,
    joinedDate: dateFor(key, 'joined', 2022, 4), interest: interests[hash(`${key}:interest`) % interests.length] };
}
