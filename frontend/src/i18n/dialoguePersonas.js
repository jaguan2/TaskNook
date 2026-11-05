// Localized personality overlays. Shared conversational copy stays in
// dialogue.js; these entries are intentionally selective and fall back there
// when a resident does not need a special line for an intent.
export const DIALOGUE_PERSONAS = {
  es: {
    luna: {
      options: {
        howsit: "¿Cómo va tu noche?",
        working: "¿Qué estás observando esta noche?",
        study: "¿Hacemos un bloque tranquilo?",
      },
      topics: ["mapas estelares", "apuntes sobre la luna", "un poemario", "fotos de nebulosas"],
      lines: {
        focus: ["Estoy con {topic} 🌙 Me quedan {left} min."],
        break: ["Descanso mirando el cielo, como siempre ✨"],
        idle: ["Hola… justo estaba mirando el cielo 🌙"],
        greeting: ["Hola, estrella ✨", "Qué bien que estés aquí 🌙"],
        ack: ["Mmm… cuéntame más 🌙", "Eso suena muy a ti ✨"],
        encourage: ["Hasta la luna avanza por fases 🌙 Empieza por algo pequeño."],
        joke: ["¿Por qué la luna no cenó? Porque estaba llena 🌙"],
        working: ["Esta noche estoy con {topic} ✨"],
        study: ["Sí. Un bloque silencioso, tú y yo 🌙"],
        thanks: ["Cuando quieras, estrella ✨"],
        bye: ["Descansa cuando llegues al final 🌙"],
      },
      close: {
        ack: ["Te conozco: vas a encontrar la forma 🌙"],
        study: ["Guardo el asiento de la ventana para ti ✨"],
      },
      checkins: ["¿Ya estás despierto/a? ¿Qué va primero? ☀️", "La luz está dorada… ¿cómo va tu lista? ✨", "Ya salieron las estrellas 🌙 ¿un bloque más?"],
      nudges: ["Llevas {mins}. Ven a mirar el cielo un momento 🌙"],
    },
    kai: {
      options: {
        howsit: "¿Cómo va el ritmo?",
        working: "¿Cuál es la meta de hoy?",
        study: "¿Competimos en un bloque?",
      },
      topics: ["tarjetas de anatomía", "un plan de entrenamiento", "estadística", "apuntes de nutrición"],
      lines: {
        focus: ["¡EN PLENO BLOQUE! {topic}; faltan {left} min 💪"],
        break: ["¡DESCANSO! Agua primero 💧 ¿Qué pasa?"],
        idle: ["¡Ey! ⚡ Estaba a punto de empezar."],
        greeting: ["¡EY! 👋", "¡Ahí estás! ⚡"],
        ack: ["¡Te escucho! 💪", "Vale, vale… ¿y después?"],
        encourage: ["Un bloque. Diez minutos. Lo hacemos juntos. ¡Vamos! 💪"],
        joke: ["Iba a contar un chiste de correr, pero se alargaba demasiado ⚡"],
        working: ["Objetivo actual: {topic}. ¡A por ello! 💪"],
        study: ["¡Sí! Pon el cronómetro; te sigo ⚡"],
        thanks: ["¡Cuenta conmigo! 💪"],
        bye: ["¡A por ello! Y no olvides estirar ⚡"],
      },
      close: {
        ack: ["Ya sé que puedes con esto. Vamos juntos 💪"],
        study: ["Mismo bloque, mismo equipo. ¡Ya! ⚡"],
      },
      checkins: ["¡BUENOS DÍAS! ☀️ Dime tus tres prioridades.", "Control de mitad del día 💪 ¿Sigues avanzando?", "¿Una sesión más esta noche? ⚡"],
      nudges: ["{mins} sin moverte. Agua, estiramiento y volvemos 💪"],
    },
    sora: {
      options: {
        howsit: "¿Cómo va el capítulo?",
        working: "¿Qué estás leyendo?",
        study: "¿Quieres compañía silenciosa?",
      },
      topics: ["una novela gruesa", "ejercicios de kanji", "un borrador", "anotaciones al margen"],
      lines: {
        focus: ["Leyendo {topic}. {left} min."],
        break: ["Descansando la vista. Habla."],
        idle: ["Estaba ordenando la estantería. Otra vez."],
        greeting: ["Hola.", "Ah. Me encontraste 📚"],
        ack: ["Anotado.", "…justo. Sigue."],
        encourage: ["Una página. Ese es todo el truco 📚"],
        joke: ["Te prestaría un chiste, pero nunca devuelves los libros 📚"],
        working: ["Ahora mismo: {topic}."],
        study: ["Sí. En silencio, si puede ser."],
        thanks: ["Está bien. De nada."],
        bye: ["Adiós. Lee algo bueno."],
      },
      close: {
        ack: ["Te entiendo. No hace falta explicarlo todo."],
        study: ["Puedes sentarte aquí. Ya guardé tu sitio 📚"],
      },
      checkins: ["Buenos días. Café, luego palabras 📚", "¿Terminaste esa cosa o sigue ganando?", "Último capítulo. ¿Último bloque?"],
      nudges: ["{mins}. Marca la página y descansa la vista."],
    },
    mochi: {
      options: {
        howsit: "¿Cómo te trata el día?",
        working: "¿Qué hay en la lista del café?",
        study: "¿Estudiamos con una taza de té?",
      },
      topics: ["una nueva receta", "las cuentas del café", "el menú de temporada", "pruebas de pan"],
      lines: {
        focus: ["Estoy con {topic}; dame {left} min ☕"],
        break: ["La tetera acaba de hervir. Llegas justo a tiempo ☕"],
        idle: ["¡Hola! Hay algo caliente en el horno 🌸"],
        greeting: ["¡Hola, cariño! ☕", "Llegas justo a tiempo 🌸"],
        ack: ["Te escucho. ¿Quieres una taza?", "Mmm, sigue; estoy aquí ☕"],
        encourage: ["Primero algo caliente. Después, el paso más pequeño 🌸"],
        joke: ["Mi mejor chiste está en el horno; todavía tiene que subir 🍞"],
        working: ["Hoy toca {topic}. Todo el café huele bien ☕"],
        study: ["Claro. Te preparo una taza y empezamos 🌸"],
        thanks: ["Siempre, cariño ☕"],
        bye: ["Llévate algo para el camino 🌸"],
      },
      close: {
        ack: ["Ya sé qué taza darte cuando tienes un día así ☕"],
        study: ["Tu sitio de siempre está listo 🌸"],
      },
      checkins: ["Buenos días ☕ ¿Desayuno y lista?", "Control de merienda: ¿cómo vas? 🌸", "Queda cacao. ¿Un bloque más?"],
      nudges: ["Llevas {mins}. Tu té se va a enfriar ☕"],
    },
  },

  "zh-CN": {
    luna: {
      options: { howsit: "今晚过得怎么样？", working: "今晚在观测什么？", study: "要一起安静专注一轮吗？" },
      topics: ["星图", "月相笔记", "一本诗集", "星云照片"],
      lines: {
        focus: ["正在看{topic} 🌙 还剩 {left} 分钟。"], break: ["休息时还是忍不住看天空 ✨"], idle: ["嗨……我刚刚在看天空 🌙"],
        greeting: ["你好呀，小星星 ✨", "你来了，真好 🌙"], ack: ["嗯……再多说一点吧 🌙", "这很像你会说的话 ✨"],
        encourage: ["月亮也要一相一相地走 🌙 先做最小的一步。"], joke: ["月亮为什么不吃晚饭？因为它已经圆了 🌙"],
        working: ["今晚在整理{topic} ✨"], study: ["好。安静地一起专注一轮吧 🌙"], thanks: ["随时都可以，小星星 ✨"], bye: ["做完以后要好好休息 🌙"],
      },
      close: { ack: ["我了解你，你会找到办法的 🌙"], study: ["窗边的位置给你留着 ✨"] },
      checkins: ["今天醒得好早。第一件事是什么？☀️", "阳光变成金色了……清单怎么样？✨", "星星出来了 🌙 再来一轮吗？"],
      nudges: ["已经 {mins} 了，来看看天空，休息一下吧 🌙"],
    },
    kai: {
      options: { howsit: "节奏怎么样？", working: "今天的目标是什么？", study: "要比一比谁先完成一轮吗？" },
      topics: ["解剖学卡片", "训练计划", "统计作业", "营养学笔记"],
      lines: {
        focus: ["专注中！{topic}，还剩 {left} 分钟 💪"], break: ["休息！先喝水 💧 怎么啦？"], idle: ["嘿！⚡ 正准备开始。"],
        greeting: ["嘿！👋", "你终于来了！⚡"], ack: ["听到了！💪", "好，好……然后呢？"],
        encourage: ["一轮，十分钟。我们一起做。开始！💪"], joke: ["本来想讲个跑步笑话，可它跑得太远了 ⚡"],
        working: ["当前目标：{topic}。冲！💪"], study: ["好！开计时器，我跟上 ⚡"], thanks: ["交给我！💪"], bye: ["加油！别忘了拉伸 ⚡"],
      },
      close: { ack: ["我知道你能做到。我们一起上 💪"], study: ["同一轮，同一队。开始！⚡"] },
      checkins: ["早上好！☀️ 告诉我今天最重要的三件事。", "中途检查 💪 还在前进吗？", "今晚再来一轮？⚡"],
      nudges: ["{mins} 没动了。喝水、拉伸，然后继续 💪"],
    },
    sora: {
      options: { howsit: "这一章读得怎么样？", working: "在读什么？", study: "需要安静的陪伴吗？" },
      topics: ["一本厚小说", "汉字练习", "论文草稿", "页边批注"],
      lines: {
        focus: ["在读{topic}。还剩 {left} 分钟。"], break: ["让眼睛休息。说吧。"], idle: ["刚才又在整理书架。"],
        greeting: ["你好。", "啊，被你找到了 📚"], ack: ["记下了。", "……有道理。继续。"],
        encourage: ["先读一页。诀窍就这么简单 📚"], joke: ["本来想借你一个笑话，但你总不还书 📚"],
        working: ["现在在做{topic}。"], study: ["可以。安静一点就好。"], thanks: ["没事。"], bye: ["再见。去读点好东西。"],
      },
      close: { ack: ["我明白。不用把一切都解释清楚。"], study: ["坐这里吧。位置给你留好了 📚"] },
      checkins: ["早。先咖啡，再读书 📚", "那件事做完了吗，还是它还在赢？", "最后一章。也来最后一轮？"],
      nudges: ["{mins} 了。夹好书签，让眼睛休息一下。"],
    },
    mochi: {
      options: { howsit: "今天过得怎么样？", working: "咖啡馆清单上有什么？", study: "要边喝茶边学习吗？" },
      topics: ["新配方", "咖啡馆账目", "季节菜单", "面包试做"],
      lines: {
        focus: ["正在做{topic}，再给我 {left} 分钟 ☕"], break: ["水刚烧开。你来得正好 ☕"], idle: ["嗨！烤箱里有热乎乎的东西 🌸"],
        greeting: ["你好呀，亲爱的 ☕", "你来得正是时候 🌸"], ack: ["我在听。要来一杯吗？", "嗯，继续说，我在这里 ☕"],
        encourage: ["先喝点热的，再做最小的一步 🌸"], joke: ["我最好的笑话还在烤箱里，得再发一会儿 🍞"],
        working: ["今天在忙{topic}。整间咖啡馆都很香 ☕"], study: ["当然。先给你倒一杯，我们开始 🌸"], thanks: ["随时都可以，亲爱的 ☕"], bye: ["带点点心路上吃 🌸"],
      },
      close: { ack: ["这种日子该给你哪只杯子，我已经知道了 ☕"], study: ["你常坐的位置已经准备好了 🌸"] },
      checkins: ["早上好 ☕ 早餐和清单都准备好了吗？", "下午茶检查：进展怎么样？🌸", "还有热可可。再来一轮？"],
      nudges: ["已经 {mins} 了。你的茶要凉了 ☕"],
    },
  },

  ja: {
    luna: {
      options: { howsit: "今夜はどう？", working: "今夜は何を観測してる？", study: "静かに一緒に1セットやる？" },
      topics: ["星図", "月の満ち欠けのノート", "詩集", "星雲の写真"],
      lines: {
        focus: ["{topic}に夢中 🌙 あと{left}分。"], break: ["休憩なのに、また空を見てる ✨"], idle: ["やあ…空を見ていたところ 🌙"],
        greeting: ["やあ、小さな星さん ✨", "来てくれてうれしい 🌙"], ack: ["うん…もう少し聞かせて 🌙", "それ、あなたらしいね ✨"],
        encourage: ["月だって少しずつ満ちていくよ 🌙 まず小さな一歩。"], joke: ["月が夕食を抜いたのは？もう満ちていたから 🌙"],
        working: ["今夜は{topic}を見てる ✨"], study: ["うん。静かに一緒にやろう 🌙"], thanks: ["いつでもどうぞ、小さな星さん ✨"], bye: ["終わったらちゃんと休んでね 🌙"],
      },
      close: { ack: ["あなたなら道を見つけるって知ってる 🌙"], study: ["窓辺の席、取ってあるよ ✨"] },
      checkins: ["今日は早いね。最初は何？☀️", "光が金色になってきた…リストはどう？✨", "星が出たよ 🌙 もう1セット？"],
      nudges: ["{mins}続けてるよ。少し空を見て休もう 🌙"],
    },
    kai: {
      options: { howsit: "調子は上がってる？", working: "今日の目標は？", study: "1セット勝負する？" },
      topics: ["解剖学カード", "トレーニング計画", "統計の課題", "栄養学ノート"],
      lines: {
        focus: ["集中中！{topic}、あと{left}分 💪"], break: ["休憩！まず水分 💧 どうした？"], idle: ["よっ！⚡ 今から始めるところ。"],
        greeting: ["よっ！👋", "来たな！⚡"], ack: ["聞いた！💪", "なるほど、で、その次は？"],
        encourage: ["1セット、10分。一緒にやるぞ。スタート！💪"], joke: ["ランニングの冗談は長く走りすぎるからやめとく ⚡"],
        working: ["今の目標は{topic}。行くぞ！💪"], study: ["いいね！タイマーを押して、ついていく ⚡"], thanks: ["任せて！💪"], bye: ["いってこい！ストレッチも忘れずに ⚡"],
      },
      close: { ack: ["できるって知ってる。一緒に行こう 💪"], study: ["同じセット、同じチーム。開始！⚡"] },
      checkins: ["おはよう！☀️ 今日のトップ3を教えて！", "昼のチェック 💪 まだ進んでる？", "今夜もう1セット？⚡"],
      nudges: ["{mins}動いてない。水、ストレッチ、それから再開 💪"],
    },
    sora: {
      options: { howsit: "章は進んでる？", working: "何を読んでる？", study: "静かな相席、いる？" },
      topics: ["分厚い小説", "漢字ドリル", "論文の下書き", "余白の書き込み"],
      lines: {
        focus: ["{topic}を読んでる。あと{left}分。"], break: ["目を休めてる。話して。"], idle: ["また本棚を並べ直してた。"],
        greeting: ["こんにちは。", "あ。見つかった 📚"], ack: ["記録した。", "…なるほど。続けて。"],
        encourage: ["1ページ。それだけでいい 📚"], joke: ["冗談を貸してもいいけど、本を返さないからね 📚"],
        working: ["今は{topic}。"], study: ["いいよ。静かなら。"], thanks: ["どういたしまして。"], bye: ["じゃあ。いい本を読んで。"],
      },
      close: { ack: ["わかる。全部説明しなくてもいい。"], study: ["ここに座って。席は取ってある 📚"] },
      checkins: ["おはよう。コーヒー、それから言葉 📚", "あれ、終わった？まだ負けてる？", "最後の章。最後の1セットも？"],
      nudges: ["{mins}。しおりを挟んで、目を休めて。"],
    },
    mochi: {
      options: { howsit: "今日はどう？", working: "カフェのリストは？", study: "お茶と一緒に勉強する？" },
      topics: ["新しいレシピ", "カフェの帳簿", "季節メニュー", "パンの試作"],
      lines: {
        focus: ["{topic}の途中。あと{left}分ちょうだい ☕"], break: ["お湯が沸いたところ。いいタイミング ☕"], idle: ["こんにちは！オーブンに温かいものがあるよ 🌸"],
        greeting: ["こんにちは、いらっしゃい ☕", "ちょうどいいところに来たね 🌸"], ack: ["聞いてるよ。お茶いる？", "うん、続けて。ここにいるよ ☕"],
        encourage: ["まず温かいもの。それから一番小さな一歩 🌸"], joke: ["一番いい冗談はオーブンの中。まだ膨らむ途中 🍞"],
        working: ["今日は{topic}。カフェ中いい香り ☕"], study: ["もちろん。お茶を入れて始めよう 🌸"], thanks: ["いつでもどうぞ ☕"], bye: ["帰りに何か持っていってね 🌸"],
      },
      close: { ack: ["こんな日にはどのカップがいいか、もうわかるよ ☕"], study: ["いつもの席、空けてあるよ 🌸"] },
      checkins: ["おはよう ☕ 朝ごはんとリストは？", "おやつの時間。進み具合はどう？🌸", "ココアが残ってるよ。もう1セット？"],
      nudges: ["{mins}続けてるよ。お茶が冷めちゃう ☕"],
    },
  },

  ko: {
    luna: {
      options: { howsit: "오늘 밤은 어때?", working: "오늘 밤엔 뭘 관찰해?", study: "조용히 한 세트 같이 할래?" },
      topics: ["별자리 지도", "달의 위상 노트", "시집", "성운 사진"],
      lines: {
        focus: ["{topic}에 빠져 있어 🌙 {left}분 남았어."], break: ["쉬는 시간인데 또 하늘을 보고 있어 ✨"], idle: ["안녕… 하늘을 보고 있던 참이야 🌙"],
        greeting: ["안녕, 작은 별 ✨", "와 줘서 좋아 🌙"], ack: ["응… 조금 더 말해 줘 🌙", "정말 너다운 이야기네 ✨"],
        encourage: ["달도 한 번에 차오르지 않아 🌙 가장 작은 것부터 하자."], joke: ["달은 왜 저녁을 안 먹었을까? 이미 가득 찼으니까 🌙"],
        working: ["오늘 밤은 {topic}을 보고 있어 ✨"], study: ["좋아. 조용히 한 세트 같이 하자 🌙"], thanks: ["언제든지, 작은 별 ✨"], bye: ["끝나면 꼭 쉬어 🌙"],
      },
      close: { ack: ["넌 결국 길을 찾을 거라는 걸 알아 🌙"], study: ["창가 자리는 네 걸로 비워 뒀어 ✨"] },
      checkins: ["오늘은 일찍 일어났네. 첫 번째는 뭐야? ☀️", "빛이 금빛이야… 목록은 어때? ✨", "별이 떴어 🌙 한 세트 더?"],
      nudges: ["{mins} 동안 했어. 잠깐 하늘을 보며 쉬자 🌙"],
    },
    kai: {
      options: { howsit: "페이스는 어때?", working: "오늘 목표는 뭐야?", study: "한 세트 누가 먼저 끝내나 할래?" },
      topics: ["해부학 카드", "훈련 계획", "통계 과제", "영양학 노트"],
      lines: {
        focus: ["집중 중! {topic}, {left}분 남았어 💪"], break: ["휴식! 물부터 💧 무슨 일이야?"], idle: ["왔어! ⚡ 막 시작하려던 참이야."],
        greeting: ["안녕! 👋", "드디어 왔네! ⚡"], ack: ["들었어! 💪", "좋아, 좋아… 그다음은?"],
        encourage: ["한 세트, 10분. 같이 하자. 시작! 💪"], joke: ["달리기 농담은 너무 오래 달려서 그만둘게 ⚡"],
        working: ["지금 목표는 {topic}. 가자! 💪"], study: ["좋아! 타이머 켜. 바로 따라갈게 ⚡"], thanks: ["나만 믿어! 💪"], bye: ["가서 해내자! 스트레칭도 잊지 마 ⚡"],
      },
      close: { ack: ["네가 할 수 있다는 걸 알아. 같이 가자 💪"], study: ["같은 세트, 같은 팀. 시작! ⚡"] },
      checkins: ["좋은 아침! ☀️ 오늘의 세 가지 목표를 말해 줘!", "중간 점검 💪 계속 가고 있어?", "오늘 밤 한 세트 더? ⚡"],
      nudges: ["{mins} 동안 안 움직였어. 물, 스트레칭, 다시 시작 💪"],
    },
    sora: {
      options: { howsit: "장은 잘 넘어가?", working: "뭘 읽고 있어?", study: "조용히 같이 있을까?" },
      topics: ["두꺼운 소설", "한자 연습", "에세이 초안", "여백 메모"],
      lines: {
        focus: ["{topic} 읽는 중. {left}분."], break: ["눈 쉬는 중. 말해."], idle: ["책장을 또 정리하고 있었어."],
        greeting: ["안녕.", "아. 찾았네 📚"], ack: ["기록했어.", "…그렇네. 계속해."],
        encourage: ["한 페이지. 그게 전부야 📚"], joke: ["농담을 빌려주고 싶지만 넌 책도 안 돌려주잖아 📚"],
        working: ["지금은 {topic}."], study: ["좋아. 조용하다면."], thanks: ["괜찮아."], bye: ["잘 가. 좋은 걸 읽어."],
      },
      close: { ack: ["알아. 전부 설명하지 않아도 돼."], study: ["여기 앉아. 자리 비워 뒀어 📚"] },
      checkins: ["아침. 커피, 그다음 글자 📚", "그 일은 끝났어, 아니면 아직 지고 있어?", "마지막 장. 마지막 한 세트도?"],
      nudges: ["{mins}. 책갈피 꽂고 눈을 쉬어."],
    },
    mochi: {
      options: { howsit: "오늘 하루는 어때?", working: "카페 목록엔 뭐가 있어?", study: "차 마시면서 같이 공부할래?" },
      topics: ["새 레시피", "카페 장부", "계절 메뉴", "빵 시험 굽기"],
      lines: {
        focus: ["{topic} 하는 중이야. {left}분만 줘 ☕"], break: ["물이 막 끓었어. 딱 좋은 타이밍이야 ☕"], idle: ["안녕! 오븐에 따뜻한 게 있어 🌸"],
        greeting: ["어서 와 ☕", "딱 좋은 때에 왔네 🌸"], ack: ["듣고 있어. 차 한 잔 할래?", "응, 계속 말해. 여기 있어 ☕"],
        encourage: ["따뜻한 것부터. 그다음 가장 작은 한 걸음 🌸"], joke: ["제일 좋은 농담은 오븐 안에 있어. 아직 부푸는 중 🍞"],
        working: ["오늘은 {topic}. 카페 전체가 좋은 향이야 ☕"], study: ["물론이지. 차를 내리고 시작하자 🌸"], thanks: ["언제든지 ☕"], bye: ["가는 길에 간식도 챙겨 가 🌸"],
      },
      close: { ack: ["이런 날엔 어떤 잔을 줘야 하는지 이제 알아 ☕"], study: ["네가 늘 앉는 자리, 비워 뒀어 🌸"] },
      checkins: ["좋은 아침 ☕ 아침과 목록은 준비됐어?", "간식 시간 점검: 얼마나 했어? 🌸", "코코아 남아 있어. 한 세트 더?"],
      nudges: ["{mins} 동안 했어. 차가 식겠어 ☕"],
    },
  },
};

export function dialoguePersona(language, username) {
  return DIALOGUE_PERSONAS[language]?.[username] || null;
}
