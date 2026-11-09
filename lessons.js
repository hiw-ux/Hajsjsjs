const LESSONS = [
  {
    id: "html-fix",
    section: "أساسيات HTML",
    title: "الرابط لا يعمل",
    type: "fix",
    instructions: 'في الأسفل يوجد رابط "تواصل معي" لكن عند الضغط عليه لا يحدث شيء. افتح الكود وأصلحه.',
    starter: {
      html: '<h1>مرحباً، أنا مطور</h1>\n<p>هذه صفحتي الشخصية</p>\n<a>تواصل معي</a>',
      css: 'body { font-family: sans-serif; padding: 2rem; }\na { color: #0066cc; font-size: 1.2rem; }',
      js: ""
    },
    testType: "dom",
    testFn: function(state) {
      const doc = new DOMParser().parseFromString(state.html, "text/html");
      const links = Array.from(doc.querySelectorAll("a"));
      const link = links.find(a => a.textContent.includes("تواصل"));
      if (!link) return false;
      const href = link.getAttribute("href");
      return !!href && href.trim().length > 0;
    },
    hints: [
      { cost: 5, text: "لماذا لا يستجيب الرابط للنقر؟ ما الفرق بينه وبين رابط تعرفه يعمل؟" },
      { cost: 10, text: "الوسم <a> يحتاج سمة href ليصبح قابلاً للنقر. جرّب إضافة href=\"#\" أو href=\"mailto:test@test.com\"." },
      { cost: 20, text: "الحل: <a href=\"mailto:you@example.com\">تواصل معي</a> — بدون href، المتصفح لا يعتبره رابطاً." }
    ],
    whyQuestion: "لماذا لا يعمل وسم <a> كرابط بدون سمة href؟",
    reward: 15
  },
  {
    id: "html-extend",
    section: "أساسيات HTML",
    title: "أضف فقرة تعريفية",
    type: "extend",
    instructions: 'أضف فقرة <p> تحمل class="bio" وتحتوي النص: "أنا مطور ويب مبتدئ وأتعلم كل يوم". يجب أن تظهر تحت العنوان وقبل الرابط.',
    starter: {
      html: '<h1>مرحباً، أنا مطور</h1>\n<a href="#">تواصل معي</a>',
      css: 'body { font-family: sans-serif; padding: 2rem; }\n.bio { color: #555; font-style: italic; }',
      js: ""
    },
    testType: "dom",
    testFn: function(state) {
      const doc = new DOMParser().parseFromString(state.html, "text/html");
      const p = doc.querySelector("p.bio");
      if (!p) return false;
      return p.textContent.includes("أنا مطور ويب مبتدئ");
    },
    hints: [
      { cost: 5, text: "أين يجب أن تضع الفقرة الجديدة؟ تحت العنوان، قبل الرابط. ما الوسم الذي يمثل فقرة نصية؟" },
      { cost: 10, text: "استخدم وسم <p> مع سمة class=\"bio\". ضع الفقرة بين وسم الإغلاق للعنوان ووسم فتح الرابط." },
      { cost: 20, text: 'الحل: أضف السطر <p class="bio">أنا مطور ويب مبتدئ وأتعلم كل يوم</p> بين <h1> و <a>.' }
    ],
    whyQuestion: "لماذا نستخدم class بدل id لعنصر قد يتكرر في الصفحة؟",
    reward: 20
  },
  {
    id: "css-fix",
    section: "التنسيق بـ CSS",
    title: "العنوان غير مرئي",
    type: "fix",
    instructions: "العنوان في الصفحة اختفى! لونه أبيض على خلفية بيضاء. افتح تبويب CSS وأصلح اللون ليصبح داكناً وقابلاً للقراءة.",
    starter: {
      html: '<h1>مرحباً بالعالم</h1>\n<p>هذا نص تجريبي.</p>',
      css: 'body { background: white; }\nh1 { color: white; }',
      js: ""
    },
    testType: "runtime",
    testSource: function() {
      const h1 = document.querySelector("h1");
      if (!h1) return false;
      const color = getComputedStyle(h1).color;
      // يجب ألا يكون أبيض أو شبه أبيض
      const match = color.match(/\d+/g);
      if (!match) return false;
      const [r, g, b] = match.map(Number);
      const brightness = (r + g + b) / 3;
      return brightness < 200;
    },
    hints: [
      { cost: 5, text: "افتح تبويب CSS. ابحث عن القاعدة التي تتحكم بلون h1. ما اللون الحالي؟ هل هو مناسب لخلفية بيضاء؟" },
      { cost: 10, text: "غيّر value الخاصية color. يمكنك استخدام اسم لون (مثل black أو navy) أو كود hex (مثل #333)." },
      { cost: 20, text: "الحل: h1 { color: #333; } — لون داكناً على خلفية فاتحة يصبح قابلاً للقراءة." }
    ],
    whyQuestion: "لماذا يعتبر التباين (contrast) مهماً في تصميم الويب؟",
    reward: 20
  },
  {
    id: "css-extend",
    section: "التنسيق بـ CSS",
    title: "المسافة بين البطاقات",
    type: "extend",
    instructions: "ثلاث بطاقات مصطفة لكنها ملتصقة ببعضها. أضف مسافة 16px بينها — لكن بدون استخدام margin على البطاقات نفسها. استخدم خاصية gap على الحاوية.",
    starter: {
      html: '<div class="row">\n  <div class="card">1</div>\n  <div class="card">2</div>\n  <div class="card">3</div>\n</div>',
      css: '.row { display: flex; }\n.card { padding: 1rem 2rem; background: #38bdf8; color: #0f172a; border-radius: 6px; font-weight: 700; }',
      js: ""
    },
    testType: "runtime",
    testSource: function() {
      const row = document.querySelector(".row");
      if (!row) return false;
      const gap = getComputedStyle(row).gap;
      if (!gap) return false;
      // نقبل أي قيمة gap أكبر من أو تساوي 12px
      const num = parseFloat(gap);
      return num >= 12;
    },
    hints: [
      { cost: 5, text: "الحاوية .row لديها display: flex. ما الخاصية التي تضبط المسافة بين العناصر داخل flex container؟" },
      { cost: 10, text: "أضف إلى .row الخاصية: gap: 16px; — إنها أقصر وأوضح من إضافة margin لكل بطاقة." },
      { cost: 20, text: "الحل: .row { display: flex; gap: 16px; } — gap يضيف مسافة بين جميع العناصر داخل الحاوية." }
    ],
    whyQuestion: "لماذا يفضل استخدام gap بدل margin في flexbox؟",
    reward: 25
  },
  {
    id: "js-fix",
    section: "التفاعل بـ JavaScript",
    title: "الزر لا يستجيب",
    type: "fix",
    instructions: 'يوجد زر، لكن عند الضغط عليه لا يحدث شيء. المطلوب: عند النقر، يتغير نصه إلى "تم الضغط". الكود في تبويب JS ناقص — أكمله.',
    starter: {
      html: '<button id="btn">اضغطني</button>',
      css: 'button { padding: 0.8rem 1.5rem; font-size: 1rem; cursor: pointer; }',
      js: "// اكتب هنا كود JavaScript\n"
    },
    testType: "runtime",
    testSource: function() {
      const btn = document.getElementById("btn");
      if (!btn) return false;
      btn.click();
      return btn.textContent.trim() === "تم الضغط";
    },
    hints: [
      { cost: 5, text: "كيف نختار عنصراً بواسطة id في JavaScript؟ ثم كيف نستمع لحدث النقر عليه؟" },
      { cost: 10, text: "استخدم document.getElementById('btn') للوصول للزر، ثم addEventListener('click', ...) لتنفيذ كود عند النقر." },
      { cost: 20, text: 'الحل: document.getElementById("btn").addEventListener("click", function() { this.textContent = "تم الضغط"; });' }
    ],
    whyQuestion: "ما الفرق بين onclick في HTML و addEventListener في JavaScript؟",
    reward: 25
  },
  {
    id: "js-extend",
    section: "التفاعل بـ JavaScript",
    title: "زر الوضع الليلي",
    type: "extend",
    instructions: 'أضف زراً بـ id="toggle-theme". عند الضغط عليه، يضيف class="dark-mode" على <body>، وعند الضغط مرة أخرى يزيله (تبديل). أضف تنسيقاً بسيطاً يجعل الخلفية داكنة في وضع الليل.',
    starter: {
      html: '<h1>صفحتي</h1>\n<p>جرب الوضع الليلي.</p>',
      css: 'body { background: white; color: black; transition: 0.3s; padding: 2rem; font-family: sans-serif; }\nbody.dark-mode { background: #0f172a; color: #e2e8f0; }',
      js: "// أضف الزر والكود هنا\n"
    },
    testType: "runtime",
    testSource: function() {
      const btn = document.getElementById("toggle-theme");
      if (!btn) return false;
      btn.click();
      const on = document.body.classList.contains("dark-mode");
      if (!on) return false;
      btn.click();
      const off = !document.body.classList.contains("dark-mode");
      return off;
    },
    hints: [
      { cost: 5, text: "التبديل يعني: إذا كان class موجوداً، احذفه؛ وإلا أضفه. ما الدالة التي تنفذ هذا في سطر واحد؟" },
      { cost: 10, text: "استخدم classList.toggle('dark-mode') على document.body. أنشئ الزر أولاً في HTML أو في JS." },
      { cost: 20, text: 'الحل: أنشئ <button id="toggle-theme">الوضع الليلي</button> في HTML، ثم في JS: document.getElementById("toggle-theme").addEventListener("click", () => document.body.classList.toggle("dark-mode"));' }
    ],
    whyQuestion: "لماذا يعتبر classList.toggle أنظف من كتابة if/else لإضافة وإزالة class؟",
    reward: 30
  }
];
