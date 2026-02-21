require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf(process.env.BOT_TOKEN);

const SUPER_ADMIN_ID = 7092312411;
const DEFAULT_FATWA_LIMIT = 5;
const DEFAULT_QUESTION_LIMIT = 10;

const users = {};
const activityLogs = {};
const adminState = {};

// ==============================
// GLOBAL INIT (TAMBAHAN STABIL)
// ==============================

bot.use((ctx, next) => {
  if (ctx.from) {
    initUser(ctx.from.id, ctx.from.username);
  }
  return next();
});

// ==============================
// AUTO RESET LIMIT
// ==============================

function resetDailyLimit(user) {
  const today = new Date().toDateString();
  if (user.lastReset !== today) {
    user.fatwaUsed = 0;
    user.questionUsed = 0;
    user.lastReset = today;
  }
}

// ==============================
// INIT USER
// ==============================

function initUser(userId, username = "") {
  if (!users[userId]) {
    users[userId] = {
      username,
      registered: false,
      role: userId === SUPER_ADMIN_ID ? "admin" : "user",
      blocked: false,
      unlimited: userId === SUPER_ADMIN_ID,
      fatwaLimit: DEFAULT_FATWA_LIMIT,
      questionLimit: DEFAULT_QUESTION_LIMIT,
      fatwaUsed: 0,
      questionUsed: 0,
      language: "indonesia",
      askMode: false,
      lastReset: new Date().toDateString()
    };
  }

  if (!activityLogs[userId]) {
    activityLogs[userId] = [];
  }
}

// ==============================
// LOG
// ==============================

function logActivity(userId, action) {
  activityLogs[userId].push({
    action,
    time: new Date().toISOString()
  });
}

// ==============================
// LANGUAGE
// ==============================

const TEXT = {
  indonesia: {
    welcome: "🕌 Selamat datang di MEDINA AI",
    login: "🔐 Login",
    ask: "📖 Mulai Bertanya",
    changeLang: "🌍 Ganti Bahasa",
    status: "ℹ Status Limit",
    adminPanel: "👑 Admin Panel",
    chooseLang: "Pilih Bahasa:",
    back: "🔙 Kembali",
    limit: "⚠ Batas harian habis.",
    blocked: "🚫 Anda diblokir.",
    processing: "⏳ Menyusun jawaban...",
    unlimited: "👑 Admin memiliki akses unlimited.",
    askNow: "Silakan ketik pertanyaan Anda.",
    disclaimer: "⚠ Fatwa berbasis literatur Ahlus Sunnah wal Jama'ah."
  },
  english: {
    welcome: "🕌 Welcome to MEDINA AI",
    login: "🔐 Login",
    ask: "📖 Ask Question",
    changeLang: "🌍 Change Language",
    status: "ℹ Limit Status",
    adminPanel: "👑 Admin Panel",
    chooseLang: "Choose Language:",
    back: "🔙 Back",
    limit: "⚠ Daily limit reached.",
    blocked: "🚫 You are blocked.",
    processing: "⏳ Preparing answer...",
    unlimited: "👑 Admin has unlimited access.",
    askNow: "Please type your question.",
    disclaimer: "⚠ Fatwa is literature-based."
  },
  arabic: {
    welcome: "🕌 مرحبًا بك في MEDINA AI",
    login: "🔐 تسجيل الدخول",
    ask: "📖 اطرح سؤالاً",
    changeLang: "🌍 تغيير اللغة",
    status: "ℹ حالة الحد",
    adminPanel: "👑 لوحة الإدارة",
    chooseLang: "اختر اللغة:",
    back: "🔙 رجوع",
    limit: "⚠ لقد وصلت إلى الحد.",
    blocked: "🚫 تم حظرك.",
    processing: "⏳ جارٍ إعداد الجواب...",
    unlimited: "👑 المدير لديه وصول غير محدود.",
    askNow: "اكتب سؤالك.",
    disclaimer: "⚠ هذه الفتوى مبنية على المصادر."
  }
};

const AI_LANG = {
  indonesia: "Indonesian",
  english: "English",
  arabic: "Arabic"
};

// ==============================
// MENU
// ==============================

function mainMenu(user) {
  const t = TEXT[user.language];

  if (user.role === "admin") {
    return Markup.keyboard([
      [t.ask],
      [t.changeLang],
      [t.adminPanel],
      [t.status]
    ]).resize();
  }

  return Markup.keyboard([
    [t.ask],
    [t.changeLang],
    [t.status]
  ]).resize();
}

// ==============================
// START
// ==============================

bot.start((ctx) => {
  const user = users[ctx.from.id];

  if (!user.registered) {
    return ctx.reply(
      TEXT[user.language].welcome,
      Markup.keyboard([[TEXT[user.language].login]]).resize()
    );
  }

  ctx.reply(TEXT[user.language].welcome, mainMenu(user));
});

// ==============================
// LOGIN
// ==============================

bot.hears(/🔐|Login|تسجيل/, (ctx) => {
  const user = users[ctx.from.id];
  user.registered = true;
  ctx.reply("✅ Login berhasil.", mainMenu(user));
});

// ==============================
// MULAI BERTANYA
// ==============================

bot.hears(/📖|Mulai Bertanya|Ask|اطرح/, (ctx) => {
  const user = users[ctx.from.id];
  user.askMode = true;
  ctx.reply(TEXT[user.language].askNow);
});

// ==============================
// GANTI BAHASA
// ==============================

bot.hears(/🌍|Ganti Bahasa|Change Language|تغيير اللغة/, (ctx) => {
  const user = users[ctx.from.id];

  ctx.reply(
    TEXT[user.language].chooseLang,
    Markup.keyboard([
      ["🇮🇩 Bahasa Indonesia"],
      ["🇬🇧 English"],
      ["🇸🇦 العربية"],
      [TEXT[user.language].back]
    ]).resize()
  );
});

bot.hears("🇮🇩 Bahasa Indonesia", (ctx) => {
  users[ctx.from.id].language = "indonesia";
  ctx.reply(TEXT.indonesia.welcome, mainMenu(users[ctx.from.id]));
});

bot.hears("🇬🇧 English", (ctx) => {
  users[ctx.from.id].language = "english";
  ctx.reply(TEXT.english.welcome, mainMenu(users[ctx.from.id]));
});

bot.hears("🇸🇦 العربية", (ctx) => {
  users[ctx.from.id].language = "arabic";
  ctx.reply(TEXT.arabic.welcome, mainMenu(users[ctx.from.id]));
});

// ==============================
// STATUS LIMIT
// ==============================

bot.hears(/Status Limit|Status|Limit|حالة/, (ctx) => {
  const user = users[ctx.from.id];
  resetDailyLimit(user);

  if (user.role === "admin") {
    return ctx.reply(TEXT[user.language].unlimited);
  }

  ctx.reply(`
Fatwa: ${user.fatwaUsed}/${user.fatwaLimit}
Question: ${user.questionUsed}/${user.questionLimit}
`);
});


// ============================================
// ADMIN PANEL MENU BARU (INTERAKTIF LENGKAP)
// ============================================

function adminPanelMenu(user) {
  return Markup.keyboard([
    ["📋 Semua User"],
    ["🔙 Kembali"]
  ]).resize();
}

// ================= ADMIN PANEL OPEN =================

bot.hears("👑 Admin Panel", (ctx) => {
  const user = users[ctx.from.id];
  if (!user || user.role !== "admin") return;

  ctx.reply("👑 ADMIN PANEL AKTIF", adminPanelMenu(user));
});

// ================= LIHAT SEMUA USER =================

bot.hears("📋 Semua User", (ctx) => {
  if (users[ctx.from.id].role !== "admin") return;

  const buttons = Object.entries(users).map(([id, u]) => {
    return [
      Markup.button.callback(
        `@${u.username || "-"} (${id})`,
        `detail_${id}`
      )
    ];
  });

  ctx.reply(
    "📋 Pilih user:",
    Markup.inlineKeyboard(buttons)
  );
});

bot.action(/detail_(.+)/, async (ctx) => {
  const id = ctx.match[1];
  const u = users[id];

  if (!u) return ctx.answerCbQuery("User tidak ditemukan");

  await ctx.reply(
    `👤 DETAIL USER

Username: @${u.username || "-"}
ID: ${id}
Blocked: ${u.blocked}
Unlimited: ${u.unlimited}
Fatwa: ${u.fatwaUsed}/${u.fatwaLimit}
Question: ${u.questionUsed}/${u.questionLimit}
`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("⚙ Set Limit", `setlimit_${id}`)
      ],
      [
        Markup.button.callback("♾ Unlimited", `unlimited_${id}`)
      ],
      [
        Markup.button.callback("🚫 Block", `block_${id}`)
      ],
      [
        Markup.button.callback("✅ Unblock", `unblock_${id}`)
      ]
    ])
  );

  ctx.answerCbQuery();
});
bot.action(/setlimit_(.+)/, (ctx) => {
  const id = ctx.match[1];

  adminState[ctx.from.id] = {
    action: "setLimitValue",
    targetUser: id
  };

  ctx.reply("Masukkan limit baru (format: fatwaLimit questionLimit)");
  ctx.answerCbQuery();
});
bot.action(/unlimited_(.+)/, (ctx) => {
  const id = ctx.match[1];

  users[id].unlimited = true;

  ctx.reply("♾ User sekarang unlimited.");
  ctx.answerCbQuery();
});
bot.action(/unlimited_(.+)/, (ctx) => {
  const id = ctx.match[1];

  users[id].unlimited = true;

  ctx.reply("♾ User sekarang unlimited.");
  ctx.answerCbQuery();
});
bot.action(/block_(.+)/, (ctx) => {
  const id = ctx.match[1];

  users[id].blocked = true;

  ctx.reply("🚫 User berhasil diblok.");
  ctx.answerCbQuery();
});

// ================= KEMBALI =================

bot.hears("🔙 Kembali", (ctx) => {
  const user = users[ctx.from.id];
  ctx.reply("Kembali ke menu utama", mainMenu(user));
});

// ==============================
// AI SYSTEM (FIXED ROUTING)
// ==============================

bot.on("text", async (ctx) => {
  const user = users[ctx.from.id];
  
  // ================= ADMIN STATE PRIORITY =================
  if (adminState[ctx.from.id]) {

  const state = adminState[ctx.from.id];
  const input = ctx.message.text;

  // DETAIL USER
  if (state.action === "detailUser") {
    if (!users[input]) return ctx.reply("User tidak ditemukan.");

    const u = users[input];
    adminState[ctx.from.id] = null;

    return ctx.reply(`
👤 DETAIL USER

Username: @${u.username || "-"}
ID: ${input}
Blocked: ${u.blocked}
Unlimited: ${u.unlimited}
Fatwa: ${u.fatwaUsed}/${u.fatwaLimit}
Question: ${u.questionUsed}/${u.questionLimit}
`);
  }

  // SET LIMIT STEP 1
  if (state.action === "setLimitUser") {
    if (!users[input]) return ctx.reply("User tidak ditemukan.");

    adminState[ctx.from.id] = {
      action: "setLimitValue",
      targetUser: input
    };

    return ctx.reply("Masukkan limit baru (format: fatwaLimit questionLimit)");
  }

  // SET LIMIT STEP 2
  if (state.action === "setLimitValue") {
    const [fatwa, question] = input.split(" ");
    const target = state.targetUser;

    users[target].fatwaLimit = parseInt(fatwa);
    users[target].questionLimit = parseInt(question);

    adminState[ctx.from.id] = null;
    return ctx.reply("✅ Limit berhasil diperbarui.");
  }

  // BLOCK USER
  if (state.action === "blockUser") {
    if (!users[input]) return ctx.reply("User tidak ditemukan.");

    users[input].blocked = true;
    adminState[ctx.from.id] = null;

    return ctx.reply("🚫 User berhasil diblok.");
  }

  // UNBLOCK USER
  if (state.action === "unblockUser") {
    if (!users[input]) return ctx.reply("User tidak ditemukan.");

    users[input].blocked = false;
    adminState[ctx.from.id] = null;

    return ctx.reply("✅ User berhasil di-unblock.");
  }
}
  if (!user.registered) return;
  if (!user.askMode) return;

  user.askMode = false;
  resetDailyLimit(user);

  if (user.blocked)
    return ctx.reply(TEXT[user.language].blocked);

  if (!user.unlimited && user.questionUsed >= user.questionLimit)
    return ctx.reply(TEXT[user.language].limit);

  user.questionUsed++;
  logActivity(ctx.from.id, ctx.message.text);

  await ctx.reply(TEXT[user.language].processing);

  try {
    const ai = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Respond ONLY in ${AI_LANG[user.language]}`
          },
          { role: "user", content: ctx.message.text }
        ],
        temperature: 0.2
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    ctx.reply(ai.data.choices[0].message.content, mainMenu(user));

  } catch {
    ctx.reply("System error.");
  }

});

bot.launch();
console.log("🕌 MEDINA AI FULL PROFESSIONAL SYSTEM RUNNING...");