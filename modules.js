// modules.js — Crypto + Security + Auth + Animations + Challenges

const Crypto = {
  ITERATIONS: 100000, KEY_LEN: 256,
  async deriveKey(password, saltB64) {
    const salt = this.b64ToBuf(saltB64);
    const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: this.ITERATIONS, hash: "SHA-256" }, km, this.KEY_LEN);
    return this.bufToB64(new Uint8Array(bits));
  },
  async hashPassword(password) {
    const saltB64 = this.bufToB64(crypto.getRandomValues(new Uint8Array(16)));
    return { salt: saltB64, hash: await this.deriveKey(password, saltB64) };
  },
  async verifyPassword(password, salt, expected) {
    return this.timingSafeEqual(await this.deriveKey(password, salt), expected);
  },
  timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    let d = 0;
    for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return d === 0;
  },
  bufToB64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); },
  b64ToBuf(b64) { const bin = atob(b64); const buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i); return buf; },
  async sha256(str) { return this.bufToB64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str))); },
  randomToken() { return this.bufToB64(crypto.getRandomValues(new Uint8Array(32))); }
};

const Security = {
  CSP: "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https: data: blob:; font-src https: data:; connect-src 'none';",
  buildSrcdoc(html, css, js) {
    return `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="${this.CSP}"><style>${css}</style></head><body>${html}<script>(function(){try{Object.defineProperty(window,'parent',{get:()=>window})}catch(e){}try{Object.defineProperty(window,'top',{get:()=>window})}catch(e){}try{Object.defineProperty(window,'opener',{get:()=>null})}catch(e){}})();${js}<\/script></body></html>`;
  },
  escapeHTML(str) { const d = document.createElement("div"); d.textContent = String(str); return d.innerHTML; },
  isValidMessage(event, iframe, token) {
    return event.source === iframe.contentWindow && event.data && event.data.__cc === token;
  }
};

const Auth = {
  USERS_KEY: "cc_users_v1", SESSION_KEY: "cc_session", MAX_ATTEMPTS: 5, LOCKOUT_MS: 5 * 60 * 1000,
  getUsers() { try { return JSON.parse(localStorage.getItem(this.USERS_KEY)) || {}; } catch { return {}; } },
  saveUsers(u) { localStorage.setItem(this.USERS_KEY, JSON.stringify(u)); },
  async register(username, password) {
    if (!username || username.length < 3) throw new Error("اسم المستخدم قصير (3+ أحرف)");
    if (!password || password.length < 8) throw new Error("كلمة المرور قصيرة (8+ أحرف)");
    const users = this.getUsers();
    if (users[username.toLowerCase()]) throw new Error("الاسم موجود مسبقاً");
    const { salt, hash } = await Crypto.hashPassword(password);
    users[username.toLowerCase()] = { username, salt, hash, createdAt: Date.now(), attempts: 0, lockedUntil: 0 };
    this.saveUsers(users);
    return true;
  },
  async login(username, password) {
    const users = this.getUsers();
    const user = users[username.toLowerCase()];
    if (!user) throw new Error("بيانات غير صحيحة");
    if (user.lockedUntil > Date.now()) {
      const mins = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      throw new Error(`مقفل. حاول بعد ${mins} دقيقة`);
    }
    if (!await Crypto.verifyPassword(password, user.salt, user.hash)) {
      user.attempts = (user.attempts || 0) + 1;
      if (user.attempts >= this.MAX_ATTEMPTS) { user.lockedUntil = Date.now() + this.LOCKOUT_MS; user.attempts = 0; }
      this.saveUsers(users);
      throw new Error("بيانات غير صحيحة");
    }
    user.attempts = 0; this.saveUsers(users);
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({ username: user.username, token: Crypto.randomToken(), expires: Date.now() + 86400000 }));
    return user.username;
  },
  getSession() {
    try {
      const s = JSON.parse(sessionStorage.getItem(this.SESSION_KEY));
      if (!s || s.expires < Date.now()) { sessionStorage.removeItem(this.SESSION_KEY); return null; }
      return s;
    } catch { return null; }
  },
  logout() { sessionStorage.removeItem(this.SESSION_KEY); }
};

const Animations = {
  reducedMotion: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  confetti(count = 40) {
    if (this.reducedMotion()) return;
    const colors = ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899"];
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "confetti-piece";
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDelay = Math.random() * 0.3 + "s";
      p.style.animationDuration = (1 + Math.random() * 0.8) + "s";
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 2500);
    }
  },
  animateNumber(el, from, to, duration = 800) {
    if (this.reducedMotion()) { el.textContent = to; return; }
    const start = performance.now();
    const step = now => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },
  staggerIn(container, sel = ".stagger-item") {
    if (this.reducedMotion()) return;
    container.querySelectorAll(sel).forEach((el, i) => {
      el.style.opacity = "0"; el.style.transform = "translateY(12px)";
      el.style.transition = `opacity .35s ease-out ${i * .05}s, transform .35s ease-out ${i * .05}s`;
      requestAnimationFrame(() => { el.style.opacity = "1"; el.style.transform = "translateY(0)"; });
    });
  }
};

const Challenges = {
  DAILY_KEY: "cc_daily", LEADERBOARD_KEY: "cc_leaderboard",
  getDailyLesson() {
    const today = new Date().toDateString();
    let d = JSON.parse(localStorage.getItem(this.DAILY_KEY)) || {};
    if (d.date !== today) {
      d = { date: today, lessonId: LESSONS[Math.floor(Math.random() * LESSONS.length)].id, completed: false };
      localStorage.setItem(this.DAILY_KEY, JSON.stringify(d));
    }
    return LESSONS.find(l => l.id === d.lessonId);
  },
  markDailyComplete() {
    const d = JSON.parse(localStorage.getItem(this.DAILY_KEY)) || {};
    d.completed = true;
    localStorage.setItem(this.DAILY_KEY, JSON.stringify(d));
  },
  getLeaderboard() { try { return JSON.parse(localStorage.getItem(this.LEADERBOARD_KEY)) || []; } catch { return []; } },
  addScore(username, points) {
    const b = this.getLeaderboard();
    const e = b.find(r => r.username === username);
    if (e) { e.points = points; e.date = Date.now(); }
    else b.push({ username, points, date: Date.now() });
    b.sort((a, b) => b.points - a.points);
    localStorage.setItem(this.LEADERBOARD_KEY, JSON.stringify(b.slice(0, 10)));
  }
};
