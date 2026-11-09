// ================= الحالة =================
let currentLesson = null;
let cm = null;
let currentLang = "html";
const drafts = {}; // { lessonId: { html, css, js } }

const DEFAULT_STATE = {
  points: 0,
  completed: [],
  purchasedHints: [] // "lessonId-index"
};
let userState = JSON.parse(JSON.stringify(DEFAULT_STATE));

// ================= توقيع لمنع التعديل الساذج =================
function hashState(s) {
  const raw = s.points + "|" + s.completed.slice().sort().join(",");
  let h = 5381;
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) + h) + raw.charCodeAt(i);
    h = h & h;
  }
  return (h >>> 0).toString(36);
}

// ================= تحميل/حفظ =================
function loadState() {
  try {
    const raw = localStorage.getItem("codepath_v1");
    if (!raw) return;
    const p = JSON.parse(raw);
    const expected = hashState(p);
    if (p.hash !== expected) {
      console.warn("State integrity failed. Reset.");
      userState = JSON.parse(JSON.stringify(DEFAULT_STATE));
      return;
    }
    userState.points = p.points || 0;
    userState.completed = p.completed || [];
    userState.purchasedHints = p.purchasedHints || [];
  } catch (e) {
    userState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

function saveState() {
  const data = {
    points: userState.points,
    completed: userState.completed,
    purchasedHints: userState.purchasedHints
  };
  data.hash = hashState(data);
  localStorage.setItem("codepath_v1", JSON.stringify(data));
}

// ================= الإحصائيات =================
function updateStats() {
  document.getElementById("pointsDisplay").textContent = "⭐ " + userState.points + " نقطة";
  document.getElementById("storePoints").textContent = userState.points;
}

// ================= قائمة الدروس =================
function renderLessonList() {
  const container = document.getElementById("lessonList");
  container.innerHTML = "";
  const sections = {};
  LESSONS.forEach(l => {
    if (!sections[l.section]) sections[l.section] = [];
    sections[l.section].push(l);
  });
  Object.keys(sections).forEach(name => {
    const h = document.createElement("div");
    h.className = "section-title";
    h.textContent = name;
    container.appendChild(h);
    const ul = document.createElement("ul");
    sections[name].forEach(lesson => {
      const li = document.createElement("li");
      li.textContent = lesson.title;
      if (currentLesson && currentLesson.id === lesson.id) li.classList.add("active");
      if (userState.completed.includes(lesson.id)) li.classList.add("done");
      li.addEventListener("click", () => selectLesson(lesson.id));
      ul.appendChild(li);
    });
    container.appendChild(ul);
  });
}

// ================= اختيار درس =================
function selectLesson(id) {
  const lesson = LESSONS.find(l => l.id === id);
  if (!lesson) return;
  currentLesson = lesson;

  if (!drafts[id]) {
    drafts[id] = {
      html: lesson.starter.html || "",
      css: lesson.starter.css || "",
      js: lesson.starter.js || ""
    };
  }

  document.getElementById("lessonTitle").textContent = lesson.title;
  document.getElementById("instructionsBox").textContent = lesson.instructions;

  const badge = document.getElementById("lessonBadge");
  badge.className = "badge " + lesson.type;
  badge.textContent = lesson.type === "fix" ? "🔧 أصلح" : lesson.type === "extend" ? "🧩 وسّع" : "💥 اكسر";

  // تبويب HTML افتراضي
  currentLang = "html";
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.lang === "html"));
  cm.setOption("mode", "xml");
  cm.setValue(drafts[id].html);

  renderLessonList();
  runCode();
}

// ================= المحرر =================
function initEditor() {
  cm = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "xml",
    theme: "default",
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: true,
    autoCloseBrackets: true
  });
  cm.setSize("100%", "100%");
  cm.on("change", () => {
    if (currentLesson) drafts[currentLesson.id][currentLang] = cm.getValue();
  });
}

function getCurrentCode() {
  if (!currentLesson) return { html: "", css: "", js: "" };
  drafts[currentLesson.id][currentLang] = cm.getValue();
  return JSON.parse(JSON.stringify(drafts[currentLesson.id]));
}

function buildFullHTML(code) {
  return '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><style>' + code.css +
    '</style></head><body>' + code.html + '<script>' + code.js + '<\/script></body></html>';
}

// ================= التشغيل =================
function runCode() {
  if (!currentLesson) return;
  const code = getCurrentCode();
  document.getElementById("preview").srcdoc = buildFullHTML(code);
}

// ================= التحقق =================
async function checkSolution() {
  if (!currentLesson) return;
  const code = getCurrentCode();
  const btn = document.getElementById("checkBtn");
  btn.disabled = true;
  btn.textContent = "⏳ جارٍ التحقق...";

  let passed = false;
  try {
    if (currentLesson.testType === "dom") {
      passed = !!currentLesson.testFn(code);
    } else if (currentLesson.testType === "runtime") {
      passed = await runRuntimeTest(code, currentLesson.testSource);
    }
  } catch (e) {
    console.error("Check error:", e);
    passed = false;
  }

  btn.disabled = false;
  btn.textContent = "✔ تحقق من الحل";

  if (!passed) {
    alert("❌ ليس بعد. اقرأ التعليمات مرة أخرى، أو افتح المتجر لتلميح.");
    return;
  }

  // نجح
  const alreadyDone = userState.completed.includes(currentLesson.id);
  if (alreadyDone) {
    alert("✅ حلك صحيح! لكنك حصلت على نقاط هذا الدرس مسبقاً.");
    return;
  }

  userState.completed.push(currentLesson.id);
  userState.points += currentLesson.reward;
  saveState();
  updateStats();
  renderLessonList();
  runCode();

  // عرض سؤال الفهم
  showWhyModal();
}

// ================= اختبار وقت التشغيل =================
function runRuntimeTest(code, testFn) {
  return new Promise((resolve) => {
    const token = "cp_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const testBody = "(" + testFn.toString() + ")()";
    const full = '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><style>' + code.css +
      '</style></head><body>' + code.html +
      '<script>' + code.js + '<\/script>' +
      '<script>' +
      'window.addEventListener("load", function() {' +
      '  setTimeout(function() {' +
      '    var result = false;' +
      '    try { result = ' + testBody + '; } catch(e) { result = false; }' +
      '    parent.postMessage({ __cp_token: "' + token + '", pass: !!result }, "*");' +
      '  }, 150);' +
      '});' +
      '<\/script></body></html>';

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.sandbox = "allow-scripts";
    iframe.srcdoc = full;
    document.body.appendChild(iframe);

    let resolved = false;
    const cleanup = (val) => {
      if (resolved) return;
      resolved = true;
      window.removeEventListener("message", handler);
      iframe.remove();
      resolve(val);
    };

    const handler = (e) => {
      if (e.data && e.data.__cp_token === token) {
        cleanup(!!e.data.pass);
      }
    };
    window.addEventListener("message", handler);
    setTimeout(() => cleanup(false), 4000);
  });
}

// ================= سؤال الفهم =================
function showWhyModal() {
  document.getElementById("whyQuestion").textContent = currentLesson.whyQuestion;
  document.getElementById("whyAnswer").value = "";
  document.getElementById("whyModal").classList.remove("hidden");
}

function submitWhy() {
  const ans = document.getElementById("whyAnswer").value.trim();
  if (ans.length < 20) {
    alert("اكتب على الأقل 20 حرفاً لتأخذ النقاط.");
    return;
  }
  userState.points += 10;
  saveState();
  updateStats();
  document.getElementById("whyModal").classList.add("hidden");
  alert("🎉 أحسنت! " + currentLesson.reward + " + 10 = " + (currentLesson.reward + 10) + " نقطة لهذا الدرس.");
}

// ================= المتجر =================
function openStore() {
  document.getElementById("storeModal").classList.remove("hidden");
  renderStore();
}

function renderStore() {
  const list = document.getElementById("storeList");
  list.innerHTML = "";
  if (!currentLesson) {
    list.innerHTML = "<p>اختر درساً أولاً.</p>";
    return;
  }
  const purchased = userState.purchasedHints;
  currentLesson.hints.forEach((hint, i) => {
    const key = currentLesson.id + "-" + i;
    const bought = purchased.includes(key);
    const prevKey = i > 0 ? currentLesson.id + "-" + (i - 1) : null;
    const prevBought = !prevKey || purchased.includes(prevKey);
    const canBuy = !bought && prevBought;

    const div = document.createElement("div");
    div.className = "hint-item" + (bought ? "" : " locked");
    const text = document.createElement("div");
    text.className = "hint-text";
    text.textContent = bought ? hint.text : "تلميح " + (i + 1) + " — المستوى " + (i === 0 ? "الأول" : i === 1 ? "الثاني" : "الثالث");
    const btn = document.createElement("button");
    btn.className = "hint-buy";
    if (bought) {
      btn.textContent = "✓ تم الشراء";
      btn.disabled = true;
    } else if (!prevBought) {
      btn.textContent = "يتطلب المستوى السابق";
      btn.disabled = true;
    } else {
      btn.textContent = "شراء (" + hint.cost + " نقطة)";
      btn.disabled = false;
      btn.addEventListener("click", () => buyHint(key, hint.cost));
    }
    div.appendChild(text);
    div.appendChild(btn);
    list.appendChild(div);
  });
}

function buyHint(key, cost) {
  if (userState.points < cost) {
    alert("نقاطك غير كافية. اذهب وحل دروساً أخرى أولاً.");
    return;
  }
  if (userState.purchasedHints.includes(key)) return;
  userState.points -= cost;
  userState.purchasedHints.push(key);
  saveState();
  updateStats();
  renderStore();
}

// ================= التبويبات =================
function initTabs() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      if (!currentLesson) return;
      drafts[currentLesson.id][currentLang] = cm.getValue();
      currentLang = tab.dataset.lang;
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const mode = currentLang === "html" ? "xml" : currentLang === "css" ? "css" : "javascript";
      cm.setOption("mode", mode);
      cm.setValue(drafts[currentLesson.id][currentLang] || "");
    });
  });
}

// ================= التهيئة =================
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  updateStats();
  initEditor();
  initTabs();
  renderLessonList();

  document.getElementById("runBtn").addEventListener("click", runCode);
  document.getElementById("checkBtn").addEventListener("click", checkSolution);
  document.getElementById("shopBtn").addEventListener("click", openStore);
  document.getElementById("closeStore").addEventListener("click", () => {
    document.getElementById("storeModal").classList.add("hidden");
  });
  document.getElementById("submitWhy").addEventListener("click", submitWhy);
  document.getElementById("skipWhy").addEventListener("click", () => {
    document.getElementById("whyModal").classList.add("hidden");
    alert("تخطيت سؤال الفهم. يمكنك حل درس آخر، أو العودة لاحقاً (لن تحصل على +10).");
  });
});
