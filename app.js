let currentLesson = null, cm = null, currentLang = "html";
const drafts = {};
const DEFAULT = { points:0, completed:[], purchasedHints:[], achievements:[], startedAt:null, lastActive:null };
let state = JSON.parse(JSON.stringify(DEFAULT));

const ACHIEVEMENTS = [
  { id:"first", icon:"🌟", name:"البداية", desc:"أكمل أول درس", check:s=>s.completed.length>=1 },
  { id:"five", icon:"🔥", name:"مشتعل", desc:"5 دروس", check:s=>s.completed.length>=5 },
  { id:"ten", icon:"⚡", name:"سريع", desc:"10 دروس", check:s=>s.completed.length>=10 },
  { id:"half", icon:"🎯", name:"نصف الطريق", desc:"15 درساً", check:s=>s.completed.length>=15 },
  { id:"all", icon:"👑", name:"الملك", desc:"كل الدروس", check:s=>s.completed.length>=LESSONS.length },
  { id:"hint1", icon:"💡", name:"باحث", desc:"أول تلميح", check:s=>s.purchasedHints.length>=1 },
  { id:"hint5", icon:"🔦", name:"مستكشف", desc:"5 تلميحات", check:s=>s.purchasedHints.length>=5 },
  { id:"rich", icon:"💎", name:"ثري", desc:"200 نقطة", check:s=>s.points>=200 },
  { id:"auth", icon:"🔐", name:"مؤمَّن", desc:"سجّل حساباً", check:()=>!!Auth.getSession() },
  { id:"daily", icon:"🎯", name:"يومي", desc:"أكمل تحدي اليوم", check:()=>!!(JSON.parse(localStorage.getItem("cc_daily"))||{}).completed }
];

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function toast(msg, ms=2500) {
  const t = $("#toast"); t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(window.__toastT);
  window.__toastT = setTimeout(() => t.classList.add("hidden"), ms);
}

async function hashState(d) {
  const raw = `${d.points}|${(d.completed||[]).slice().sort().join(",")}|${(d.purchasedHints||[]).slice().sort().join(",")}|${(d.achievements||[]).slice().sort().join(",")}`;
  return await Crypto.sha256(raw);
}

async function loadState() {
  try {
    const r = localStorage.getItem("codecraft_v4");
    if (!r) return;
    const p = JSON.parse(r);
    if (p.hash !== await hashState(p)) {
      state = JSON.parse(JSON.stringify(DEFAULT));
      toast("⚠️ تم اكتشاف تعديل — إعادة تعيين");
      return;
    }
    Object.assign(state, p);
    delete state.hash;
  } catch { state = JSON.parse(JSON.stringify(DEFAULT)); }
}

async function saveState() {
  const d = { points:state.points, completed:state.completed, purchasedHints:state.purchasedHints, achievements:state.achievements, startedAt:state.startedAt, lastActive:state.lastActive };
  d.hash = await hashState(d);
  localStorage.setItem("codecraft_v4", JSON.stringify(d));
}

function updateStats() {
  $("#pointsDisplay").textContent = state.points;
  $("#storePoints").textContent = state.points;
  const done = state.completed.length, total = LESSONS.length;
  $("#progressLabel").textContent = `${done} / ${total}`;
  $("#progressFill").style.width = (done/total*100) + "%";
  $("#levelBadge").textContent = done<5?"🌱 مبتدئ":done<12?"🌿 متوسط":done<22?"🌳 متقدم":"🏆 محترف";
  checkAchievements();
}

function checkAchievements() {
  ACHIEVEMENTS.forEach(a => {
    if (!state.achievements.includes(a.id) && a.check(state)) {
      state.achievements.push(a.id);
      saveState();
      setTimeout(() => toast(`🏆 إنجاز: ${a.name}`), 600);
    }
  });
}

function renderAuthUI() {
  const s = Auth.getSession();
  const el = $("#authArea");
  if (s) {
    el.innerHTML = `<span class="user-chip">👤 ${Security.escapeHTML(s.username)}</span> <button id="logoutBtn" class="icon-btn" title="خروج">🚪</button>`;
    $("#logoutBtn").addEventListener("click", () => { Auth.logout(); renderAuthUI(); toast("تم الخروج"); });
  } else {
    el.innerHTML = `<button id="loginBtn" class="btn-shop">دخول</button>`;
    $("#loginBtn").addEventListener("click", openAuthModal);
  }
}

function openAuthModal() {
  let m = $("#authModal");
  if (!m) {
    m = document.createElement("div");
    m.id = "authModal"; m.className = "modal hidden";
    m.innerHTML = `<div class="modal-content"><div class="modal-head"><h2>🔐 الحساب</h2><button class="modal-close" data-close="authModal">✕</button></div>
      <input id="authUser" type="text" placeholder="اسم المستخدم" class="search-input big">
      <input id="authPass" type="password" placeholder="كلمة المرور (8+ أحرف)" class="search-input big">
      <div class="modal-actions"><button id="doLogin" class="btn-primary">دخول</button><button id="doRegister" class="btn-secondary">تسجيل</button></div>
      <p id="authMsg" class="auth-msg"></p></div>`;
    document.body.appendChild(m);
    m.querySelector("[data-close]").addEventListener("click", () => m.classList.add("hidden"));
    m.querySelector("#doLogin").addEventListener("click", async () => {
      try {
        const u = await Auth.login(m.querySelector("#authUser").value, m.querySelector("#authPass").value);
        m.classList.add("hidden"); renderAuthUI(); toast(`مرحباً ${u}`);
      } catch (e) { m.querySelector("#authMsg").textContent = e.message; }
    });
    m.querySelector("#doRegister").addEventListener("click", async () => {
      try {
        await Auth.register(m.querySelector("#authUser").value, m.querySelector("#authPass").value);
        m.querySelector("#authMsg").textContent = "✅ سجّل الدخول الآن";
      } catch (e) { m.querySelector("#authMsg").textContent = e.message; }
    });
  }
  m.classList.remove("hidden");
}

function renderNav(filter = "") {
  const nav = $("#lessonNav"); nav.innerHTML = "";
  const sections = {};
  LESSONS.forEach(l => {
    if (filter && !l.title.includes(filter) && !l.section.includes(filter)) return;
    (sections[l.section] = sections[l.section] || []).push(l);
  });
  Object.keys(sections).forEach(name => {
    const sec = document.createElement("div"); sec.className = "nav-section";
    sec.innerHTML = `<div class="nav-section-title">${name}</div>`;
    const ul = document.createElement("ul"); ul.className = "nav-list";
    sections[name].forEach(lesson => {
      const li = document.createElement("li"); li.className = "nav-item";
      if (currentLesson && currentLesson.id === lesson.id) li.classList.add("active");
      if (state.completed.includes(lesson.id)) li.classList.add("done");
      li.innerHTML = `<span class="check">${state.completed.includes(lesson.id)?"✓":""}</span><span>${lesson.title}</span>`;
      li.addEventListener("click", () => selectLesson(lesson.id));
      ul.appendChild(li);
    });
    sec.appendChild(ul); nav.appendChild(sec);
  });
}

function selectLesson(id) {
  const l = LESSONS.find(x => x.id === id);
  if (!l) return;
  currentLesson = l;
  if (!drafts[id]) drafts[id] = { ...l.starter };
  $("#welcomeScreen").classList.add("hidden");
  $("#lessonScreen").classList.remove("hidden");
  $("#lessonTitle").textContent = l.title;
  $("#instructionsBox").innerHTML = l.instructions;
  $("#rewardDisplay").textContent = l.reward;
  $("#lessonSection").textContent = l.section;
  $("#lessonIndex").textContent = `الدرس ${LESSONS.indexOf(l)+1} من ${LESSONS.length}`;
  const b = $("#lessonBadge"); b.className = "task-badge " + l.type;
  b.textContent = l.type==="fix"?"🔧 أصلح":l.type==="extend"?"🧩 وسّع":"🚀 أنشئ";
  currentLang = "html";
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.lang==="html"));
  cm.setOption("mode", "xml");
  cm.setValue(drafts[id].html);
  renderNav($("#lessonSearch").value.trim());
  runCode();
}

function initEditor() {
  cm = CodeMirror.fromTextArea($("#editor"), {
    lineNumbers:true, mode:"xml", indentUnit:2, tabSize:2, lineWrapping:true,
    autoCloseBrackets:true, matchBrackets:true, foldGutter:true,
    gutters:["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
  });
  cm.setSize("100%", "100%");
  cm.on("change", () => {
    if (currentLesson) {
      drafts[currentLesson.id][currentLang] = cm.getValue();
      clearTimeout(window.__runT);
      window.__runT = setTimeout(runCode, 500);
    }
  });
}

function getCode() {
  if (!currentLesson) return { html:"", css:"", js:"" };
  drafts[currentLesson.id][currentLang] = cm.getValue();
  return { ...drafts[currentLesson.id] };
}

function runCode() {
  if (!currentLesson) return;
  const c = getCode();
  $("#preview").srcdoc = Security.buildSrcdoc(c.html, c.css, c.js);
}

function runRuntimeTest(code, testFn) {
  return new Promise(resolve => {
    const token = Crypto.randomToken();
    const body = "(" + testFn.toString() + ")()";
    const testCode = `window.addEventListener("load",function(){setTimeout(function(){var r=false;try{r=${body}}catch(e){r=false}parent.postMessage({__cc:"${token}",pass:!!r},"*")},200)});`;
    const full = Security.buildSrcdoc(code.html, code.css, code.js + "\n" + testCode);
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.sandbox = "allow-scripts";  // WITHOUT allow-same-origin
    iframe.srcdoc = full;
    document.body.appendChild(iframe);
    let done = false;
    const finish = v => { if (done) return; done = true; window.removeEventListener("message", h); iframe.remove(); resolve(v); };
    const h = e => { if (Security.isValidMessage(e, iframe, token)) finish(!!e.data.pass); };
    window.addEventListener("message", h);
    setTimeout(() => finish(false), 5000);
  });
}

async function checkSolution() {
  if (!currentLesson) return;
  const code = getCode();
  const btn = $("#checkBtn");
  btn.disabled = true; btn.textContent = "⏳ جارٍ التحقق...";
  let passed = false;
  try {
    if (currentLesson.testType === "dom") passed = !!currentLesson.testFn(code);
    else if (currentLesson.testType === "runtime") passed = await runRuntimeTest(code, currentLesson.testSource);
  } catch (e) { console.error(e); }
  btn.disabled = false; btn.textContent = "✓ تحقق";
  if (!passed) { showSuccess("❌ ليس بعد", "اقرأ التعليمات أو اطلب تلميحاً.", "💪"); return; }
  if (state.completed.includes(currentLesson.id)) { showSuccess("✅ صحيح مسبقاً", "لا نقاط إضافية.", "👍"); return; }
  const oldPoints = state.points;
  state.completed.push(currentLesson.id);
  state.points += currentLesson.reward;
  if (!state.startedAt) state.startedAt = Date.now();
  state.lastActive = Date.now();
  saveState();
  updateStats();
  Animations.confetti(50);
  Animations.animateNumber($("#pointsDisplay"), oldPoints, state.points);
  renderNav($("#lessonSearch").value.trim());
  runCode();
  showWhyModal();
}

function showSuccess(title, msg, icon) {
  $("#successTitle").textContent = title;
  $("#successMessage").textContent = msg;
  $("#successIcon").textContent = icon;
  $("#successModal").classList.remove("hidden");
}

function showWhyModal() {
  $("#whyQuestion").textContent = currentLesson.whyQuestion;
  $("#whyAnswer").value = "";
  $("#whyModal").classList.remove("hidden");
}

function submitWhy() {
  const ans = $("#whyAnswer").value.trim();
  if (ans.length < 20) { toast("20 حرفاً على الأقل"); return; }
  state.points += 10;
  saveState(); updateStats();
  $("#whyModal").classList.add("hidden");
  showSuccess("🎉 رائع!", `أكملت الدرس. +${currentLesson.reward+10} نقطة.`, "🏆");
}

function openStore() {
  $("#storeModal").classList.remove("hidden");
  renderStore();
}

function renderStore() {
  const list = $("#storeList"); list.innerHTML = "";
  if (!currentLesson) { list.innerHTML = "<p style='color:var(--muted);text-align:center;padding:2rem'>اختر درساً أولاً.</p>"; return; }
  currentLesson.hints.forEach((hint, i) => {
    const key = currentLesson.id + "-" + i;
    const bought = state.purchasedHints.includes(key);
    const prev = i>0 ? state.purchasedHints.includes(currentLesson.id+"-"+(i-1)) : true;
    const cost = [5,15,30][i];
    const row = document.createElement("div");
    row.className = "hint-row" + (bought ? "" : " locked");
    let act = bought ? '<button class="hint-action" disabled>✓ تم الشراء</button>'
            : !prev ? '<button class="hint-action" disabled>🔒 يتطلب السابق</button>'
            : `<button class="hint-action" data-key="${key}" data-cost="${cost}">شراء (${cost})</button>`;
    row.innerHTML = `<div class="hint-num">${i+1}</div><div class="hint-body"><div class="hint-text">${bought ? hint : "المستوى "+(i+1)}</div>${act}</div>`;
    list.appendChild(row);
  });
  list.querySelectorAll("button[data-key]").forEach(b => {
    b.addEventListener("click", () => buyHint(b.dataset.key, parseInt(b.dataset.cost)));
  });
}

function buyHint(key, cost) {
  if (state.points < cost) { toast("نقاطك غير كافية"); return; }
  if (state.purchasedHints.includes(key)) return;
  state.points -= cost;
  state.purchasedHints.push(key);
  saveState(); updateStats(); renderStore();
  toast("✅ تم الشراء");
}

function openStats() {
  const done = state.completed.length, total = LESSONS.length;
  const days = state.startedAt ? Math.max(1, Math.round((Date.now()-state.startedAt)/86400000)) : 0;
  $("#statsContent").innerHTML = `
    <div class="stat-row"><span>الدروس</span><b>${done}/${total}</b></div>
    <div class="stat-row"><span>النسبة</span><b>${Math.round(done/total*100)}%</b></div>
    <div class="stat-row"><span>النقاط</span><b>${state.points} ⭐</b></div>
    <div class="stat-row"><span>التلميحات</span><b>${state.purchasedHints.length}</b></div>
    <div class="stat-row"><span>الإنجازات</span><b>${state.achievements.length}/${ACHIEVEMENTS.length}</b></div>
    <div class="stat-row"><span>الأيام</span><b>${days}</b></div>`;
  $("#statsModal").classList.remove("hidden");
}

function openAchieve() {
  $("#achieveContent").innerHTML = ACHIEVEMENTS.map(a => `
    <div class="achieve-item ${state.achievements.includes(a.id)?"unlocked":"locked"}">
      <div class="achieve-icon">${a.icon}</div>
      <div class="achieve-name">${a.name}</div>
      <div class="achieve-desc">${a.desc}</div>
    </div>`).join("");
  $("#achieveModal").classList.remove("hidden");
}

function openSearch() {
  $("#searchModal").classList.remove("hidden");
  $("#searchInput").value = ""; $("#searchInput").focus();
  renderSearch("");
}

function renderSearch(q) {
  const c = $("#searchResults");
  if (!q) { c.innerHTML = `<p style="color:var(--muted);text-align:center;padding:1rem">اكتب للبحث...</p>`; return; }
  const m = LESSONS.filter(l => l.title.includes(q) || l.section.includes(q));
  if (!m.length) { c.innerHTML = `<p style="color:var(--muted);text-align:center;padding:1rem">لا نتائج</p>`; return; }
  c.innerHTML = m.slice(0,10).map(l => `<div class="search-result" data-id="${l.id}"><strong>${Security.escapeHTML(l.title)}</strong><span>${Security.escapeHTML(l.section)}</span></div>`).join("");
  c.querySelectorAll(".search-result").forEach(el => {
    el.addEventListener("click", () => { $("#searchModal").classList.add("hidden"); selectLesson(el.dataset.id); });
  });
}

function openCheat() {
  const data = [
    { t:"HTML", i:[["&lt;h1&gt;","عنوان"],["&lt;p&gt;","فقرة"],["&lt;a href&gt;","رابط"],["&lt;ul&gt;&lt;li&gt;","قائمة"],["&lt;img src alt&gt;","صورة"]] },
    { t:"CSS", i:[["color: #333","لون"],["font-size: 2rem","حجم"],["padding: 1rem","حشوة"],["display: flex","flex"],["gap: 16px","مسافة"]] },
    { t:"JS", i:[["getElementById()","اختيار"],["addEventListener()","استماع"],["textContent","نص"],["classList.toggle()","تبديل"],["parseInt()","تحويل"]] }
  ];
  $("#cheatContent").innerHTML = data.map(s => `<div class="cheat-section"><h3>${s.t}</h3>${s.i.map(([c,d]) => `<div class="cheat-item"><code>${c}</code><span>${d}</span></div>`).join("")}</div>`).join("");
  $("#cheatModal").classList.remove("hidden");
}

function openData() { $("#dataModal").classList.remove("hidden"); }

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `codecraft-${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url); toast("✅ تم التصدير");
}

function importData(file) {
  const r = new FileReader();
  r.onload = async e => {
    try {
      const d = JSON.parse(e.target.result);
      Object.assign(state, d);
      saveState(); updateStats(); renderNav($("#lessonSearch").value.trim());
      toast("✅ تم الاستيراد");
      $("#dataModal").classList.add("hidden");
    } catch { toast("❌ ملف غير صالح"); }
  };
  r.readAsText(file);
}

function wipeData() {
  if (!confirm("مسح كل التقدم؟")) return;
  state = JSON.parse(JSON.stringify(DEFAULT));
  saveState(); updateStats(); renderNav("");
  $("#dataModal").classList.add("hidden"); toast("تم المسح");
}

function renderDaily() {
  const d = Challenges.getDailyLesson();
  const el = $("#dailyChallenge");
  if (!d || !el) return;
  const done = (JSON.parse(localStorage.getItem("cc_daily"))||{}).completed;
  el.innerHTML = `<div class="daily-card ${done?"done":""}">
    <span class="daily-label">🎯 تحدي اليوم</span>
    <strong>${Security.escapeHTML(d.title)}</strong>
    <button class="btn-primary btn-sm" data-daily="${d.id}">${done?"✓ مكتمل":"ابدأ"}</button>
  </div>`;
  el.querySelector("[data-daily]").addEventListener("click", e => selectLesson(e.target.dataset.daily));
}

function openLeaderboard() {
  const b = Challenges.getLeaderboard();
  $("#leaderboardContent").innerHTML = !b.length
    ? `<p style="color:var(--muted);text-align:center;padding:1rem">لا نتائج. كن الأول!</p>`
    : b.map((r, i) => `<div class="lb-row"><span class="lb-rank">${i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</span><span class="lb-name">${Security.escapeHTML(r.username)}</span><span class="lb-points">${r.points} ⭐</span></div>`).join("");
  $("#lbModal").classList.remove("hidden");
}

function initTabs() {
  $$(".tab").forEach(t => t.addEventListener("click", () => {
    if (!currentLesson) return;
    drafts[currentLesson.id][currentLang] = cm.getValue();
    currentLang = t.dataset.lang;
    $$(".tab").forEach(x => x.classList.remove("active")); t.classList.add("active");
    cm.setOption("mode", currentLang==="html"?"xml":currentLang==="css"?"css":"javascript");
    cm.setValue(drafts[currentLesson.id][currentLang] || "");
  }));
}

function initTheme() {
  document.body.dataset.theme = localStorage.getItem("cc_theme") || "dark";
  $("#themeToggle").addEventListener("click", () => {
    const t = document.body.dataset.theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = t;
    localStorage.setItem("cc_theme", t);
  });
}

function navigate(off) {
  if (!currentLesson) return;
  const i = LESSONS.indexOf(currentLesson) + off;
  if (i >= 0 && i < LESSONS.length) selectLesson(LESSONS[i].id);
}

async function init() {
  await loadState();
  initTheme(); updateStats(); initEditor(); initTabs();
  renderNav(); renderAuthUI(); renderDaily();

  $("#checkBtn").addEventListener("click", checkSolution);
  $("#shopBtn").addEventListener("click", openStore);
  $("#hintBtn").addEventListener("click", openStore);
  $("#resetBtn").addEventListener("click", () => {
    if (!currentLesson) return;
    if (!confirm("استرجاع الكود؟")) return;
    drafts[currentLesson.id] = { ...currentLesson.starter };
    cm.setValue(drafts[currentLesson.id][currentLang]);
    runCode();
  });
  $("#formatBtn").addEventListener("click", () => {
    cm.setValue(cm.getValue().split("\n").map(l => l.replace(/\s+$/,"")).join("\n"));
    toast("تم التنسيق");
  });
  $("#navPrev").addEventListener("click", () => navigate(-1));
  $("#navNext").addEventListener("click", () => navigate(1));
  $("#startBtn").addEventListener("click", () => selectLesson(LESSONS[0].id));
  $("#statsBtn").addEventListener("click", openStats);
  $("#achieveBtn").addEventListener("click", openAchieve);
  $("#searchBtn").addEventListener("click", openSearch);
  $("#cheatBtn").addEventListener("click", openCheat);
  $("#dataBtn").addEventListener("click", openData);
  $("#lbBtn").addEventListener("click", openLeaderboard);
  $("#menuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $("#openPreview").addEventListener("click", () => {
    if (!currentLesson) return;
    const w = window.open("", "_blank", "noopener,noreferrer");
    const c = getCode();
    w.document.write(Security.buildSrcdoc(c.html, c.css, c.js));
  });

  $("#searchInput").addEventListener("input", e => renderSearch(e.target.value.trim()));
  $("#lessonSearch").addEventListener("input", e => renderNav(e.target.value.trim()));
  $("#submitWhy").addEventListener("click", submitWhy);
  $("#skipWhy").addEventListener("click", () => {
    $("#whyModal").classList.add("hidden");
    showSuccess("حسناً", "الدرس محفوظ بدون +10.", "👍");
  });
  $("#exportBtn").addEventListener("click", exportData);
  $("#importBtn").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", e => { if (e.target.files[0]) importData(e.target.files[0]); });
  $("#wipeBtn").addEventListener("click", wipeData);

  document.querySelectorAll("[data-close]").forEach(b => {
    b.addEventListener("click", () => $("#"+b.dataset.close).classList.add("hidden"));
  });

  document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); checkSolution(); }
    if (e.ctrlKey && e.key === "k") { e.preventDefault(); openSearch(); }
    if (e.ctrlKey && e.key === "s") { e.preventDefault(); runCode(); }
    if (e.ctrlKey && e.key === "h") { e.preventDefault(); openStore(); }
    if (e.ctrlKey && e.key === "r" && currentLesson) { e.preventDefault(); $("#resetBtn").click(); }
    if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); navigate(1); }
    if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); navigate(-1); }
    if (e.key === "?" && !e.target.matches("input,textarea")) $("#shortcutModal").classList.remove("hidden");
    if (e.key === "Escape") $$(".modal").forEach(m => m.classList.add("hidden"));
  });

  if (state.completed.length === 0 && !state.startedAt) {
    state.startedAt = Date.now();
    saveState();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(console.error);
  }
}

document.addEventListener("DOMContentLoaded", init);
