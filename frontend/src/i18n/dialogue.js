import { normalizeLanguage } from "./index";
import { DIALOGUE_PERSONAS, dialoguePersona } from "./dialoguePersonas";

const PACKS = {
  es: {
    options: {
      greet: "¡Hola! 👋", howsit: "¿Cómo va todo?", working: "¿En qué estás trabajando?",
      study: "¿Quieres estudiar conmigo?", onlong: "¿Cuánto tiempo te quedarás?",
      plans: "¿Cuál es el plan de hoy?", wind: "¿Pronto terminas por hoy?",
      thanks: "Gracias 💛", bye: "Buena suerte, hablamos luego 👋",
      encourage: "Me cuesta mucho empezar", joke: "Cuéntame un chiste malísimo 😄",
      celebrate: "¡Terminé algo de mi lista!", tea: "¿Qué té preparaste?",
      tea_milk: "¿Le pusiste leche o miel?", tea_share: "Guárdame una taza ☕",
    },
    lines: {
      focus: ["Estoy concentrado/a; me quedan {left} min ⏳", "Sigo con {topic}. Hablamos en {left} min 📖"],
      break: ["Estoy descansando, justo a tiempo ☕", "Pausa breve. ¿Qué tal?"],
      idle: ["¡Hola! Estoy por aquí 🌙", "Justo iba a empezar. ¿Qué haces tú?"],
      greeting: ["¡Hola! 👋", "Qué alegría verte 🌸"],
      question: ["Buena pregunta. ¿Tú qué piensas?", "Mmm, cuéntame un poco más."],
      thanks: ["¡Cuando quieras! 💛", "Claro, para eso estamos."],
      bye: ["¡Hasta luego! Suerte con la lista 👋", "Descansa cuando termines 🌙"],
      encourage: ["En los días difíciles, los pasos pequeños valen el doble 💛", "Empieza por diez minutos. Te acompaño 🌱"],
      joke: ["¿Por qué el libro fue al médico? Porque tenía muchas páginas en blanco 😄", "Mis chistes necesitan una pausa para calentar."],
      ack: ["Te escucho.", "Entiendo 🌱 Sigue."],
      working: ["Estoy con {topic}; me quedan {left} min 📖", "Ahora mismo, {topic}."],
      study: ["¡Sí! Acércate y hacemos un bloque juntos 🌸", "Claro. Empieza tú y te sigo."],
      onlong: ["Creo que haré {blocks} bloques más ⏳", "Un rato más: unas {blocks} rondas."],
      plans: ["Primero {topic}; después ya veremos.", "Hoy toca avanzar con {topic}."],
      wind: ["Sí, después de este bloque 🌙", "Casi. Una pausa más y termino."],
      celebrate: ["¡Eso cuenta como una gran victoria! Disfrútala ✨", "¡Bien hecho! La lista sí se puede vencer 💪"],
      tea: ["Té de jazmín, algo suave para estudiar ☕", "Chai con canela; huele a hogar."],
      tea_milk: ["Un poco de miel, sin leche.", "Leche de avena y miel ☕"],
      tea_share: ["Ya te serví una taza ☕", "Claro; guardé tu taza favorita."],
    },
    topics: ["mis apuntes", "una lectura pendiente", "el proyecto de hoy", "unas tarjetas de estudio"],
    checkins: ["¡Buenos días! ¿Qué hay en la lista? ☀️", "¿Cómo va el día? 💛", "¿Un último bloque esta noche? 🌙"],
    nudges: ["Llevas {mins}; ¿pausa para té? ☕", "{mins} sin estirar. Levántate un momento 🌿"],
    justYou: "Solo tú", now: "ahora", yesterday: "ayer",
  },
  "zh-CN": {
    options: {
      greet: "你好！👋", howsit: "最近怎么样？", working: "你在忙什么？",
      study: "要一起学习吗？", onlong: "你还会待多久？", plans: "今天有什么计划？",
      wind: "准备结束今天了吗？", thanks: "谢谢你 💛", bye: "加油，回头聊 👋",
      encourage: "我很难开始", joke: "讲个冷笑话吧 😄", celebrate: "我完成了清单上的一项！",
      tea: "你泡了什么茶？", tea_milk: "加牛奶或蜂蜜了吗？", tea_share: "给我留一杯 ☕",
    },
    lines: {
      focus: ["正在专注，还剩 {left} 分钟 ⏳", "我在做{topic}，{left} 分钟后聊 📖"],
      break: ["正在休息，你来得正好 ☕", "短暂休息中，怎么啦？"],
      idle: ["嗨！我在这里 🌙", "正准备开始，你呢？"],
      greeting: ["你好！👋", "见到你真好 🌸"],
      question: ["好问题。你觉得呢？", "嗯，再多说一点吧。"],
      thanks: ["随时都可以 💛", "当然，我们是朋友。"],
      bye: ["回头见！清单加油 👋", "做完记得休息 🌙"],
      encourage: ["困难的日子里，小进步更珍贵 💛", "先做十分钟，我陪你 🌱"],
      joke: ["书为什么去看医生？因为它有太多空白页 😄", "我的笑话也需要先热身。"],
      ack: ["我在听。", "明白了 🌱 继续说吧。"],
      working: ["我在做{topic}，还剩 {left} 分钟 📖", "现在在处理{topic}。"],
      study: ["好呀！一起完成一个专注时段 🌸", "当然，你先开始，我跟上。"],
      onlong: ["我想再做 {blocks} 个专注时段 ⏳", "还会待一会儿，大约 {blocks} 轮。"],
      plans: ["先做{topic}，之后再决定。", "今天要推进{topic}。"],
      wind: ["嗯，做完这一轮就结束 🌙", "快了，再休息一次就收工。"],
      celebrate: ["太棒了！好好享受这份成就感 ✨", "做得好！清单也不是不可战胜的 💪"],
      tea: ["茉莉花茶，学习时喝点清淡的 ☕", "肉桂奶茶，闻起来很温暖。"],
      tea_milk: ["加了一点蜂蜜，没有牛奶。", "燕麦奶和蜂蜜 ☕"],
      tea_share: ["已经给你倒好一杯了 ☕", "当然，给你留了最喜欢的杯子。"],
    },
    topics: ["复习笔记", "待读章节", "今天的项目", "学习卡片"],
    checkins: ["早上好！今天清单上有什么？☀️", "今天过得怎么样？💛", "今晚再专注一轮吗？🌙"],
    nudges: ["已经专注 {mins} 了，喝杯茶休息一下？☕", "{mins} 没有伸展了，起来活动一下吧 🌿"],
    justYou: "只有你", now: "刚刚", yesterday: "昨天",
  },
  ja: {
    options: {
      greet: "やあ！👋", howsit: "調子はどう？", working: "何をしているの？",
      study: "一緒に勉強する？", onlong: "あとどのくらいいる？", plans: "今日の予定は？",
      wind: "そろそろ今日は終わり？", thanks: "ありがとう 💛", bye: "頑張って、またあとで 👋",
      encourage: "なかなか始められない", joke: "ひどい冗談を聞かせて 😄", celebrate: "リストを一つ終えたよ！",
      tea: "何のお茶をいれたの？", tea_milk: "ミルクか蜂蜜は入れた？", tea_share: "一杯とっておいて ☕",
    },
    lines: {
      focus: ["集中中。あと {left} 分 ⏳", "{topic}をしているよ。{left}分後に話そう 📖"],
      break: ["休憩中。ちょうどいいタイミング ☕", "少し休んでる。どうしたの？"],
      idle: ["やあ、ここにいるよ 🌙", "今から始めるところ。そっちは？"],
      greeting: ["やあ！👋", "会えてうれしいよ 🌸"],
      question: ["いい質問だね。あなたはどう思う？", "うん、もう少し聞かせて。"],
      thanks: ["いつでもどうぞ 💛", "もちろん。友達だからね。"],
      bye: ["またね！リスト頑張って 👋", "終わったらちゃんと休んでね 🌙"],
      encourage: ["大変な日は小さな一歩が二倍の価値だよ 💛", "まず10分だけ。一緒にやろう 🌱"],
      joke: ["本はなぜ病院へ？空白のページが多かったから 😄", "冗談にも準備運動が必要なんだ。"],
      ack: ["聞いてるよ。", "なるほど 🌱 続けて。"],
      working: ["{topic}をしているよ。あと {left} 分 📖", "今は{topic}の途中。"],
      study: ["いいよ！一緒に1セットやろう 🌸", "もちろん。先に始めて、すぐ追いつくよ。"],
      onlong: ["あと {blocks} セットくらいかな ⏳", "もう少し。だいたい {blocks} ラウンド。"],
      plans: ["まず{topic}。その後はまた考える。", "今日は{topic}を進めるよ。"],
      wind: ["うん、このセットが終わったら 🌙", "もうすぐ。あと一度休憩したら終わり。"],
      celebrate: ["大きな一歩だよ！ちゃんと喜ぼう ✨", "よくできたね！リストにも勝てる 💪"],
      tea: ["ジャスミン茶。勉強には優しい味がいいね ☕", "シナモンチャイ。部屋中いい香り。"],
      tea_milk: ["蜂蜜を少し。ミルクはなし。", "オーツミルクと蜂蜜 ☕"],
      tea_share: ["もう一杯いれてあるよ ☕", "もちろん。お気に入りのカップを取っておいたよ。"],
    },
    topics: ["復習ノート", "読みかけの章", "今日のプロジェクト", "単語カード"],
    checkins: ["おはよう！今日のリストは？☀️", "今日はどう？💛", "今夜もう1セットやる？🌙"],
    nudges: ["{mins}も続けてるよ。お茶休憩にしない？☕", "{mins}ストレッチしてないよ。少し立とう 🌿"],
    justYou: "自分だけ", now: "今", yesterday: "昨日",
  },
  ko: {
    options: {
      greet: "안녕! 👋", howsit: "어떻게 지내?", working: "무엇을 하고 있어?",
      study: "같이 공부할래?", onlong: "얼마나 더 있을 거야?", plans: "오늘 계획은 뭐야?",
      wind: "곧 오늘은 마무리할 거야?", thanks: "고마워 💛", bye: "힘내, 나중에 이야기해 👋",
      encourage: "시작하기가 너무 어려워", joke: "아주 썰렁한 농담 해 줘 😄", celebrate: "목록에서 하나 끝냈어!",
      tea: "무슨 차를 만들었어?", tea_milk: "우유나 꿀을 넣었어?", tea_share: "내 것도 한 잔 남겨 줘 ☕",
    },
    lines: {
      focus: ["집중 중이야. {left}분 남았어 ⏳", "{topic} 하는 중이야. {left}분 뒤에 이야기하자 📖"],
      break: ["쉬는 중이야. 딱 좋은 타이밍이네 ☕", "잠깐 쉬고 있어. 무슨 일이야?"],
      idle: ["안녕, 여기 있어 🌙", "막 시작하려던 참이야. 너는?"],
      greeting: ["안녕! 👋", "와 줘서 반가워 🌸"],
      question: ["좋은 질문이네. 너는 어떻게 생각해?", "음, 조금 더 말해 줘."],
      thanks: ["언제든지 💛", "물론이지. 친구잖아."],
      bye: ["나중에 봐! 목록도 힘내 👋", "끝나면 꼭 쉬어 🌙"],
      encourage: ["힘든 날엔 작은 걸음이 두 배로 소중해 💛", "우선 10분만. 같이 하자 🌱"],
      joke: ["책은 왜 병원에 갔을까? 빈 페이지가 너무 많아서 😄", "내 농담도 준비 운동이 필요해."],
      ack: ["듣고 있어.", "알겠어 🌱 계속 말해 줘."],
      working: ["{topic} 하는 중이야. {left}분 남았어 📖", "지금은 {topic} 중이야."],
      study: ["좋아! 같이 한 세트 하자 🌸", "물론이지. 먼저 시작하면 따라갈게."],
      onlong: ["{blocks}세트 정도 더 할 것 같아 ⏳", "조금 더. 대략 {blocks}라운드."],
      plans: ["먼저 {topic}. 그다음은 나중에 생각할래.", "오늘은 {topic}을 진행할 거야."],
      wind: ["응, 이 세트가 끝나면 🌙", "거의 다 됐어. 한 번 더 쉬고 마무리할게."],
      celebrate: ["큰 승리야! 잠깐 마음껏 기뻐하자 ✨", "잘했어! 목록도 이길 수 있어 💪"],
      tea: ["재스민차야. 공부할 때는 부드러운 게 좋아 ☕", "시나몬 차이. 온 방이 포근한 향이야."],
      tea_milk: ["꿀만 조금, 우유는 안 넣었어.", "오트 밀크와 꿀 ☕"],
      tea_share: ["벌써 한 잔 따라 뒀어 ☕", "물론이지. 네가 좋아하는 잔을 남겨 뒀어."],
    },
    topics: ["복습 노트", "읽어야 할 장", "오늘의 프로젝트", "학습 카드"],
    checkins: ["좋은 아침! 오늘 목록은 뭐야? ☀️", "오늘 하루는 어때? 💛", "오늘 밤 한 세트 더 할래? 🌙"],
    nudges: ["{mins} 동안 계속했네. 차 한 잔 쉬어 갈까? ☕", "{mins} 동안 스트레칭을 안 했어. 잠깐 일어나자 🌿"],
    justYou: "나만", now: "지금", yesterday: "어제",
  },
};

const fill = (line, values = {}) => String(line).replace(/\{(\w+)\}/g, (match, key) =>
  values[key] === undefined ? match : String(values[key]));

export function dialoguePack(language) {
  return PACKS[normalizeLanguage(language)] || null;
}

export function localizedOptionLabel(language, id, fallback, username) {
  const normalized = normalizeLanguage(language);
  return dialoguePersona(normalized, username)?.options?.[id]
    || dialoguePack(normalized)?.options?.[id]
    || fallback;
}

export function localizedTopic(language, seed = 0, fallback = "", username) {
  const normalized = normalizeLanguage(language);
  const topics = dialoguePersona(normalized, username)?.topics
    || dialoguePack(normalized)?.topics;
  return topics?.[Math.abs(seed) % topics.length] || fallback;
}

export function localizedReply(language, kind, seed = 0, values = {}, username, bond = 1) {
  const normalized = normalizeLanguage(language);
  const pack = dialoguePack(normalized);
  const persona = dialoguePersona(normalized, username);
  const personaLines = persona?.lines?.[kind];
  const sharedLines = pack?.lines?.[kind] || pack?.lines?.ack;
  // Authored persona copy stays the majority voice, while the shared pack
  // supplies enough variation that frequent greetings and acknowledgements
  // do not repeat word-for-word every turn.
  const base = personaLines?.length === 1 && sharedLines?.length
    ? [...personaLines, ...personaLines, ...personaLines, ...sharedLines]
    : personaLines || sharedLines;
  const close = bond >= 4 ? persona?.close?.[kind] : null;
  const lines = base?.length && close?.length ? [...base, ...close] : base;
  if (!lines?.length) return null;
  return fill(lines[Math.abs(seed) % lines.length], values);
}

export function localizedCheckIn(language, band, seed = 0, username) {
  const normalized = normalizeLanguage(language);
  const index = band === "morning" ? 0 : band === "afternoon" ? 1 : 2;
  const personal = dialoguePersona(normalized, username)?.checkins?.[index];
  const shared = dialoguePack(normalized)?.checkins?.[index];
  const lines = [...new Set([personal, shared].filter(Boolean))];
  return lines.length ? lines[Math.abs(seed) % lines.length] : null;
}

export function localizedNudge(language, spanLabel, seed = 0, username) {
  const normalized = normalizeLanguage(language);
  const personal = dialoguePersona(normalized, username)?.nudges;
  const shared = dialoguePack(normalized)?.nudges;
  const lines = personal?.length === 1 && shared?.length
    ? [...personal, ...personal, ...personal, ...shared]
    : personal || shared;
  if (!lines?.length) return null;
  return fill(lines[Math.abs(seed) % lines.length], { mins: spanLabel });
}

// A rendered NPC line becomes the next turn's context. Keep these recognisers
// beside the translated dialogue instead of asking the English chat model to
// reverse-parse Spanish, Chinese, Japanese or Korean text.
const FOLLOWUP_WORDS = {
  es: {
    tea: ["té", "chai", "taza", "tetera"],
    teaDetail: ["jazmín", "jengibre", "earl grey", "canela"],
    topic: ["tema", "capítulo", "ensayo", "receta", "notas", "lista", "bloque", "proyecto"],
    encourage: ["respira", "pequeño", "descansa", "cansad", "paso"],
  },
  "zh-CN": {
    tea: ["茶", "一杯", "茶壶"],
    teaDetail: ["茉莉", "姜", "伯爵", "肉桂"],
    topic: ["主题", "章节", "文章", "食谱", "笔记", "清单", "专注", "项目"],
    encourage: ["呼吸", "小步", "休息", "累", "一步"],
  },
  ja: {
    tea: ["お茶", "チャイ", "一杯", "ケトル"],
    teaDetail: ["ジャスミン", "ジンジャー", "アールグレイ", "シナモン"],
    topic: ["テーマ", "章", "エッセイ", "レシピ", "ノート", "リスト", "集中", "プロジェクト"],
    encourage: ["深呼吸", "小さ", "休憩", "疲れ", "一歩"],
  },
  ko: {
    tea: ["차를", "차 한 잔", "찻잔", "주전자"],
    teaDetail: ["재스민", "생강", "얼그레이", "시나몬"],
    topic: ["주제", "챕터", "에세이", "레시피", "노트", "목록", "집중", "프로젝트"],
    encourage: ["숨", "작은", "쉬어", "피곤", "한 걸음"],
  },
};

const FOLLOWUP_KINDS = {
  "tea-detail": ["tea"],
  tea: ["tea_milk", "tea_share"],
  topic: ["focus", "working", "plans"],
  encourage: ["encourage"],
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function matchesGeneratedTemplate(body, template) {
  const pattern = escapeRegExp(template).replace(/\\\{\w+\\\}/g, ".+?");
  return new RegExp(`^${pattern}$`, "iu").test(body);
}

function generatedFollowup(language, body) {
  const normalized = normalizeLanguage(language);
  const sources = [dialoguePack(normalized), ...Object.values(DIALOGUE_PERSONAS[normalized] || {})];
  for (const [result, kinds] of Object.entries(FOLLOWUP_KINDS)) {
    for (const source of sources) {
      for (const kind of kinds) {
        const templates = [
          ...(source?.lines?.[kind] || []),
          ...(source?.close?.[kind] || []),
        ];
        if (templates.some((template) => matchesGeneratedTemplate(body, template))) return result;
      }
    }
  }
  const topics = Object.values(DIALOGUE_PERSONAS[normalized] || {})
    .flatMap((persona) => persona.topics || []);
  if (topics.some((topic) => body.includes(String(topic).toLocaleLowerCase(normalized)))) {
    return "topic";
  }
  return null;
}

function containsWord(body, word, language) {
  if (language === "es") {
    return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(word)}(?:$|[^\\p{L}\\p{N}])`, "iu")
      .test(body);
  }
  return body.includes(word);
}

export function localizedFollowup(language, text) {
  const normalized = normalizeLanguage(language);
  const words = FOLLOWUP_WORDS[normalized];
  if (!words) return null;
  const body = String(text || "").toLocaleLowerCase(normalized);
  const generated = generatedFollowup(normalized, body);
  if (generated) return generated;
  const has = (group) => words[group].some((word) => containsWord(body, word, normalized));
  if (has("tea")) return has("teaDetail") ? "tea-detail" : "tea";
  if (has("topic")) return "topic";
  if (has("encourage")) return "encourage";
  return null;
}

const LOCALIZED_TYPED = {
  working: /(你在(?:做|学|读)什么|在忙什么|何を(?:勉強|学習|読ん)|何してる|(?:무엇|뭐).*(?:공부|읽|하[고는])|(?:qué|que).*(?:estudi|trabaj|leyendo|haciendo))/i,
  onlong: /(多久|多长时间|几点.*结束|どのくらい|いつまで|何時まで|얼마나|언제까지|몇 시까지|cuánto tiempo|cuanto tiempo|hasta cuándo|hasta cuando|hasta qué hora|hasta que hora)/i,
  tea: /(什么茶|哪种茶|何のお茶|どんなお茶|무슨 차|어떤 차|qué té|que té)/i,
  tea_milk: /(牛奶|蜂蜜|ミルク|はちみつ|蜂蜜|우유|꿀|leche|miel)/i,
  tea_share: /(给我.*(?:茶|一杯)|留.*(?:茶|一杯)|お茶.*(?:分け|残して)|一杯.*(?:残して|ちょうだい)|차.*(?:나눠|남겨)|(?:guarda|comparte|sirve).*(?:taza|té))/i,
  celebrate: /(完成了|做完了|写完了|读完了|終わった|終えた|できた|完了した|끝냈어|끝났어|완료했어|다 했어|terminé|he terminado|acabé|completé|lo hice)/i,
};
const LOCALIZED_NEGATIVE = /(没|还没|没有|まだ|ない|なかった|아직|못|안\s|\bno\b|todavía no|todavia no)/i;

export function localizedTypedIntent(text) {
  const body = String(text || "").trim();
  if (!body) return null;
  if (!LOCALIZED_NEGATIVE.test(body) && !/[?？]\s*$/.test(body)
    && LOCALIZED_TYPED.celebrate.test(body)) return "celebrate";
  for (const id of ["tea_share", "tea_milk", "tea", "onlong", "working"]) {
    if (LOCALIZED_TYPED[id].test(body)) return id;
  }
  return null;
}
