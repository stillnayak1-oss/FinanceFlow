/* FinanceFlow — Local Auth System */
const AuthService = (() => {
  const USERS_KEY = 'ff_users';
  const SESSION_KEY = 'ff_session';

  function getUsers() { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); }
  function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
  function logout() { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); }

  function getSession() {
    const s = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  }

  function googleLogin(credential) {
    try {
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      const { sub: googleId, name, email, picture } = payload;
      const users = getUsers();
      let u = users[email];
      
      if (!u) {
        const uid = 'g_' + googleId;
        u = { uid, name, email, picture, passwordHash: null, provider: 'google', createdAt: new Date().toISOString() };
        users[email] = u;
        saveUsers(users);
      } else if (!u.picture && picture) {
        u.picture = picture;
        saveUsers(users);
      }
      
      const session = { uid: u.uid, name: u.name, email: u.email, picture: u.picture, remember: true };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return { ok: true, user: session };
    } catch (e) {
      return { ok: false, error: 'Failed to process Google login' };
    }
  }

  return { logout, getSession, googleLogin };
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
