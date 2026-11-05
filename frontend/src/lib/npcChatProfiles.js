/**
 * Language-independent conversation behavior for the four cottage residents.
 *
 * Words live in chat.js and i18n/dialoguePersonas.js; this file owns only the
 * interaction grammar shared by every language. Keeping cadence and the
 * English fallback prompts together makes a new resident one explicit profile
 * instead of a scattering of username conditionals.
 */
export const NPC_CHAT_PROFILES = {
  luna: {
    taglineKey: "chat.persona.luna",
    cadence: 1.12,
    prompts: {
      howsit: "How's your night going?",
      working: "What are you mapping tonight?",
      study: "Want a quiet block together?",
    },
  },
  kai: {
    taglineKey: "chat.persona.kai",
    cadence: 0.78,
    prompts: {
      howsit: "How's your momentum?",
      working: "What's today's target?",
      study: "Race you through a focus block?",
    },
  },
  sora: {
    taglineKey: "chat.persona.sora",
    cadence: 1.18,
    prompts: {
      howsit: "How's the chapter going?",
      working: "What are you reading?",
      study: "Want some quiet company?",
    },
  },
  mochi: {
    taglineKey: "chat.persona.mochi",
    cadence: 0.94,
    prompts: {
      howsit: "How's your day going?",
      working: "What's on the café list?",
      study: "Want a tea-and-study block?",
    },
  },
};

const DEFAULT_PROFILE = {
  taglineKey: "chat.persona.neighbour",
  cadence: 1,
  prompts: {},
};

export function npcChatProfile(username) {
  return NPC_CHAT_PROFILES[username] || DEFAULT_PROFILE;
}
