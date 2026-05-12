/* FinanceFlow — Local Auth System */
const AuthService = (() => {
  const USERS_KEY = 'ff_users';
  const SESSION_KEY = 'ff_session';

  function getUsers() { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); }
  function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
  function hashPassword(p) {
    let h = 0; for (let i = 0; i < p.length; i++) { h = ((h << 5) - h) + p.charCodeAt(i); h |= 0; }
    return 'h_' + Math.abs(h).toString(36);
  }

  function signup(name, email, password) {
    const users = getUsers();
    if (users[email]) return { ok: false, error: 'Email is already registered' };
    if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters' };
    if (!email.includes('@')) return { ok: false, error: 'Invalid email address' };
    const uid = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    users[email] = { uid, name, email, passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
    saveUsers(users);
    return { ok: true, user: { uid, name, email } };
  }

  function login(email, password, remember) {
    const users = getUsers();
    const u = users[email];
    if (!u || u.passwordHash !== hashPassword(password)) return { ok: false, error: 'Invalid email or password' };
    const session = { uid: u.uid, name: u.name, email: u.email, remember };
    if (remember) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { ok: true, user: { uid: u.uid, name: u.name, email: u.email } };
  }

  function logout() { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); }

  function getSession() {
    const s = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  }

  return { signup, login, logout, getSession };
})();

/* FinanceFlow — Local Database */
const DB = (() => {
  function txnKey(uid) { return `ff_txns_${uid}`; }
  function budgetKey(uid) { return `ff_budget_${uid}`; }

  function getTransactions(uid) { return JSON.parse(localStorage.getItem(txnKey(uid)) || '[]'); }
  function saveTransactions(uid, txns) { localStorage.setItem(txnKey(uid), JSON.stringify(txns)); }
  function getBudget(uid) { return JSON.parse(localStorage.getItem(budgetKey(uid)) || '0'); }
  function saveBudget(uid, val) { localStorage.setItem(budgetKey(uid), JSON.stringify(val)); }

  return { getTransactions, saveTransactions, getBudget, saveBudget };
})();
