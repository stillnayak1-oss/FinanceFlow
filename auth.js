/* =============================================
   FinanceFlow — Firebase Auth & Firestore DB
   ============================================= */

// ─── Firebase Configuration ───────────────────────────────────────
// Replace these values with your own Firebase project config from:
// https://console.firebase.google.com → Project Settings → General → Your apps → Web app
const firebaseConfig = {
  apiKey: "AIzaSyA0dLpHb4_2UQCd-ch32mEtQSnFEGaljCA",
  authDomain: "financeflow-2d6b0.firebaseapp.com",
  projectId: "financeflow-2d6b0",
  storageBucket: "financeflow-2d6b0.firebasestorage.app",
  messagingSenderId: "1069390685325",
  appId: "1:1069390685325:web:80885aa5e8d6b7a5816ec4",
  measurementId: "G-CXNQ6YZ1MD"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Use Google as auth provider
const googleProvider = new firebase.auth.GoogleAuthProvider();

// ─── AuthService ──────────────────────────────────────────────────
const AuthService = (() => {

  /**
   * Sign in with Google via popup
   * @returns {Promise<{ok: boolean, user?: object, error?: string}>}
   */
  async function googleLogin() {
    try {
      const result = await auth.signInWithPopup(googleProvider);
      const u = result.user;
      const session = {
        uid: u.uid,
        name: u.displayName || 'User',
        email: u.email,
        picture: u.photoURL
      };
      return { ok: true, user: session };
    } catch (e) {
      console.error('Google sign-in failed:', e);
      return { ok: false, error: e.message || 'Failed to sign in with Google' };
    }
  }

  /**
   * Sign out of Firebase
   */
  async function logout() {
    try {
      await auth.signOut();
    } catch (e) {
      console.error('Logout error:', e);
    }
  }

  /**
   * Get the current signed-in user (synchronous snapshot)
   * @returns {object|null} session-like object or null
   */
  function getSession() {
    const u = auth.currentUser;
    if (!u) return null;
    return {
      uid: u.uid,
      name: u.displayName || 'User',
      email: u.email,
      picture: u.photoURL
    };
  }

  /**
   * Register a callback for auth state changes
   * @param {Function} callback — receives session object or null
   * @returns {Function} unsubscribe function
   */
  function onAuthChange(callback) {
    return auth.onAuthStateChanged(user => {
      if (user) {
        callback({
          uid: user.uid,
          name: user.displayName || 'User',
          email: user.email,
          picture: user.photoURL
        });
      } else {
        callback(null);
      }
    });
  }

  return { googleLogin, logout, getSession, onAuthChange };
})();

// ─── DB (Firestore) ──────────────────────────────────────────────
// Data model:
//   users/{uid}/transactions/{txnId}  → { title, amount, type, category, date, createdAt, updatedAt }
//   users/{uid}/budget/current         → { amount, updatedAt }
const DB = (() => {

  // ── Transactions ──

  /**
   * Fetch all transactions for a user (one-time read)
   */
  async function getTransactions(uid) {
    try {
      const snap = await db.collection('users').doc(uid)
        .collection('transactions')
        .orderBy('date', 'desc')
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Failed to fetch transactions:', e);
      return [];
    }
  }

  /**
   * Save (create or update) a single transaction
   */
  async function saveTransaction(uid, txn) {
    try {
      const ref = db.collection('users').doc(uid)
        .collection('transactions').doc(txn.id);
      await ref.set({
        title: txn.title,
        amount: txn.amount,
        type: txn.type,
        category: txn.category,
        date: txn.date,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error('Failed to save transaction:', e);
    }
  }

  /**
   * Delete a single transaction
   */
  async function deleteTransaction(uid, txnId) {
    try {
      await db.collection('users').doc(uid)
        .collection('transactions').doc(txnId)
        .delete();
    } catch (e) {
      console.error('Failed to delete transaction:', e);
    }
  }

  /**
   * Listen to transactions in real-time for cross-device sync
   * @returns {Function} unsubscribe
   */
  function listenTransactions(uid, callback) {
    return db.collection('users').doc(uid)
      .collection('transactions')
      .orderBy('date', 'desc')
      .onSnapshot(snap => {
        const txns = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(txns);
      }, err => {
        console.error('Transaction listener error:', err);
      });
  }

  // ── Budget ──

  /**
   * Fetch budget (one-time read)
   */
  async function getBudget(uid) {
    try {
      const doc = await db.collection('users').doc(uid)
        .collection('budget').doc('current')
        .get();
      return doc.exists ? (doc.data().amount || 0) : 0;
    } catch (e) {
      console.error('Failed to fetch budget:', e);
      return 0;
    }
  }

  /**
   * Save budget amount
   */
  async function saveBudget(uid, amount) {
    try {
      await db.collection('users').doc(uid)
        .collection('budget').doc('current')
        .set({
          amount: amount,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
      console.error('Failed to save budget:', e);
    }
  }

  /**
   * Listen to budget in real-time
   * @returns {Function} unsubscribe
   */
  function listenBudget(uid, callback) {
    return db.collection('users').doc(uid)
      .collection('budget').doc('current')
      .onSnapshot(doc => {
        const amount = doc.exists ? (doc.data().amount || 0) : 0;
        callback(amount);
      }, err => {
        console.error('Budget listener error:', err);
      });
  }

  return {
    getTransactions, saveTransaction, deleteTransaction, listenTransactions,
    getBudget, saveBudget, listenBudget
  };
})();
