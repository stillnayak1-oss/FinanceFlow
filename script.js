/* =============================================
   FinanceFlow — Expense Tracker (Local Auth)
   ============================================= */
let currentUser = null;
let transactions = [];
let budget = 0;
let editingId = null;
let pieChart = null, barChart = null, aPieChart = null, aBarChart = null;
let isLoginMode = true;

const $ = id => document.getElementById(id);
const fmt = n => '₹' + Math.abs(n).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const catIcons = {
  Salary:'<i data-lucide="wallet" class="cat-lucide"></i>',
  Freelance:'<i data-lucide="laptop" class="cat-lucide"></i>',
  Investment:'<i data-lucide="trending-up" class="cat-lucide"></i>',
  Gift:'<i data-lucide="gift" class="cat-lucide"></i>',
  'Other Income':'<i data-lucide="banknote" class="cat-lucide"></i>',
  Food:'<i data-lucide="utensils" class="cat-lucide"></i>',
  Travel:'<i data-lucide="plane" class="cat-lucide"></i>',
  Shopping:'<i data-lucide="shopping-bag" class="cat-lucide"></i>',
  Bills:'<i data-lucide="file-text" class="cat-lucide"></i>',
  Entertainment:'<i data-lucide="gamepad-2" class="cat-lucide"></i>',
  Health:'<i data-lucide="heart-pulse" class="cat-lucide"></i>',
  Education:'<i data-lucide="graduation-cap" class="cat-lucide"></i>',
  Rent:'<i data-lucide="home" class="cat-lucide"></i>',
  'Other Expense':'<i data-lucide="package" class="cat-lucide"></i>'
};
const chartColors = ['#6c5ce7','#a78bfa','#00d2a0','#ff6b81','#ffc048','#0984e3','#e84393','#00cec9','#fd79a8','#fdcb6e','#6ab04c','#e17055','#74b9ff','#dfe6e9'];

const appLoader = $('app-loader');
const landingSection = $('landing-section');
const authSection = $('auth-section');
const appSection = $('app-section');
const landingThemeToggleBtn = $('landing-theme-toggle');
const landingSignupBtn = $('landing-signup-btn');
const heroCtaBtn = $('hero-cta-btn');
const authBackBtn = $('auth-back-btn');
const authForm = $('auth-form');
const authTitle = authSection.querySelector('h2');
const authSubtitle = $('auth-subtitle');
const groupName = $('group-name');
const authToggleBtn = $('auth-toggle-btn');
const authToggleText = $('auth-toggle-text');
const authBtnText = $('auth-btn-text');
const authSpinner = $('auth-spinner');
const authSubmitBtn = $('auth-submit-btn');
const emailVerifyMsg = $('email-verify-msg');
const sidebarProfile = document.querySelector('.sidebar-profile');
const form = $('transaction-form');
const recentList = $('recent-transactions');
const allList = $('all-transactions');

// ===== TOAST =====
function toast(msg, type='info') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = {success:'<polyline points="20 6 9 17 4 12"/>',error:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',warning:'<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',info:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'};
  t.innerHTML = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[type]||icons.info}</svg><span>${msg}</span>`;
  $('toast-container').appendChild(t);
  setTimeout(() => { t.classList.add('toast-out'); setTimeout(() => t.remove(), 300); }, 3200);
}

function confirmDialog(title, msg) {
  return new Promise(resolve => {
    $('confirm-title').textContent = title;
    $('confirm-message').textContent = msg;
    $('confirm-modal').style.display = 'flex';
    const ok = () => { cleanup(); resolve(true); };
    const cancel = () => { cleanup(); resolve(false); };
    const cleanup = () => { $('confirm-modal').style.display = 'none'; $('confirm-ok').removeEventListener('click', ok); $('confirm-cancel').removeEventListener('click', cancel); };
    $('confirm-ok').addEventListener('click', ok);
    $('confirm-cancel').addEventListener('click', cancel);
  });
}

// ===== AUTH UI =====
function hideLoader() {
  appLoader.style.opacity = '0';
  setTimeout(() => appLoader.style.display = 'none', 400);
}

function showApp(user) {
  currentUser = user;
  landingSection.style.display = 'none';
  authSection.style.display = 'none';
  appSection.style.display = 'block';
  $('profile-name').textContent = user.name || 'User';
  $('profile-email').textContent = user.email;
  $('profile-avatar-initial').textContent = (user.name || user.email).charAt(0).toUpperCase();
  transactions = DB.getTransactions(user.uid);
  budget = DB.getBudget(user.uid);
  refreshAll();
}

function showLanding() {
  currentUser = null;
  appSection.style.display = 'none';
  authSection.style.display = 'none';
  landingSection.style.display = 'flex';
}

function showAuth(mode = 'login') {
  currentUser = null;
  appSection.style.display = 'none';
  landingSection.style.display = 'none';
  authSection.style.display = 'flex';
  
  if ((mode === 'login' && !isLoginMode) || (mode === 'signup' && isLoginMode)) {
      authToggleBtn.click();
  }
}

if(landingThemeToggleBtn) landingThemeToggleBtn.addEventListener('click', toggleTheme);
if(landingSignupBtn) landingSignupBtn.addEventListener('click', () => showAuth('signup'));
if(heroCtaBtn) heroCtaBtn.addEventListener('click', () => showAuth('signup'));
if(authBackBtn) authBackBtn.addEventListener('click', () => showLanding());

authToggleBtn.addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  emailVerifyMsg.style.display = 'none';
  if (isLoginMode) {
    authTitle.textContent = 'FinanceFlow'; authSubtitle.textContent = 'Sign in to your account';
    groupName.style.display = 'none'; authBtnText.textContent = 'Sign In';
    authToggleText.textContent = "Don't have an account?"; authToggleBtn.textContent = 'Create one';
  } else {
    authTitle.textContent = 'Create Account'; authSubtitle.textContent = 'Join FinanceFlow today';
    groupName.style.display = 'block'; authBtnText.textContent = 'Sign Up';
    authToggleText.textContent = 'Already have an account?'; authToggleBtn.textContent = 'Sign In';
  }
});

authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('auth-email').value.trim();
  const password = $('auth-password').value;
  const remember = $('auth-remember').checked;
  const name = $('auth-name').value.trim();

  if (!email || !password || (!isLoginMode && !name)) { toast('Please fill in all required fields', 'error'); return; }

  authSubmitBtn.disabled = true;
  authBtnText.style.opacity = '0';
  authSpinner.style.display = 'block';

  setTimeout(() => {
    let result;
    if (isLoginMode) {
      result = AuthService.login(email, password, remember);
      if (result.ok) { toast('Welcome back, ' + result.user.name + '!', 'success'); showApp(result.user); }
      else toast(result.error, 'error');
    } else {
      result = AuthService.signup(name, email, password);
      if (result.ok) {
        toast('Account created successfully! You can now sign in.', 'success');
        emailVerifyMsg.style.display = 'block';
        isLoginMode = true; authToggleBtn.click();
      } else toast(result.error, 'error');
    }
    authSubmitBtn.disabled = false;
    authBtnText.style.opacity = '1';
    authSpinner.style.display = 'none';
  }, 600);
});

$('btn-resend-verify').addEventListener('click', () => toast('Verification reminder noted!', 'success'));

$('btn-logout').addEventListener('click', () => {
  AuthService.logout(); sidebarProfile.classList.remove('open');
  toast('Logged out successfully', 'info'); showLanding();
});

$('profile-dropdown-btn').addEventListener('click', (e) => { e.stopPropagation(); sidebarProfile.classList.toggle('open'); });
document.addEventListener('click', (e) => { if (!sidebarProfile.contains(e.target)) sidebarProfile.classList.remove('open'); });

// ===== DATA HELPERS =====
function saveData() { if (currentUser) DB.saveTransactions(currentUser.uid, transactions); }
function saveBudgetData() { if (currentUser) DB.saveBudget(currentUser.uid, budget); }

// ===== FORM VALIDATION =====
function validate() {
  let valid = true;
  [{id:'txn-title',err:'error-title',msg:'Title is required'},{id:'txn-amount',err:'error-amount',msg:'Enter a valid amount'},{id:'txn-type',err:'error-type',msg:'Select a type'},{id:'txn-category',err:'error-category',msg:'Select a category'},{id:'txn-date',err:'error-date',msg:'Select a date'}].forEach(f => {
    const el=$(f.id), errEl=$(f.err); el.parentElement.classList.remove('has-error'); errEl.textContent='';
    if(!el.value.trim()){el.parentElement.classList.add('has-error');errEl.textContent=f.msg;valid=false;}
  });
  const amt=parseFloat($('txn-amount').value);
  if($('txn-amount').value&&(isNaN(amt)||amt<=0)){$('txn-amount').parentElement.classList.add('has-error');$('error-amount').textContent='Amount must be positive';valid=false;}
  return valid;
}

// ===== TRANSACTIONS =====
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validate() || !currentUser) return;
  const txn = { id: editingId || genId(), title: $('txn-title').value.trim(), amount: parseFloat($('txn-amount').value), type: $('txn-type').value, category: $('txn-category').value, date: $('txn-date').value };
  if (editingId) {
    const idx = transactions.findIndex(t => t.id === editingId);
    if (idx > -1) transactions[idx] = txn;
    editingId = null; $('form-btn-text').textContent = 'Add Transaction'; $('form-cancel-btn').style.display = 'none';
    toast('Transaction updated!', 'success');
  } else { transactions.unshift(txn); toast('Transaction added!', 'success'); }
  saveData(); form.reset(); $('txn-date').value = new Date().toISOString().split('T')[0]; refreshAll();
});

$('form-cancel-btn').addEventListener('click', () => {
  editingId = null; form.reset(); $('txn-date').value = new Date().toISOString().split('T')[0];
  $('form-btn-text').textContent = 'Add Transaction'; $('form-cancel-btn').style.display = 'none';
});

function editTxn(id) {
  const txn = transactions.find(t => t.id === id); if (!txn) return;
  editingId = id; $('txn-title').value = txn.title; $('txn-amount').value = txn.amount;
  $('txn-type').value = txn.type; $('txn-category').value = txn.category; $('txn-date').value = txn.date;
  $('form-btn-text').textContent = 'Update Transaction'; $('form-cancel-btn').style.display = 'block';
  switchSection('dashboard'); $('txn-title').focus(); toast('Editing transaction', 'info');
}

async function deleteTxn(id) {
  if (!await confirmDialog('Delete Transaction?', 'This action cannot be undone.')) return;
  transactions = transactions.filter(t => t.id !== id); saveData(); refreshAll(); toast('Transaction deleted', 'warning');
}

function renderTxnItem(txn, showActions=true) {
  const icon = catIcons[txn.category]||'<i data-lucide="package" class="cat-lucide"></i>', d = new Date(txn.date);
  const dateStr = d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
  const sign = txn.type==='income'?'+':'-';
  return `<div class="txn-item" data-id="${txn.id}"><div class="txn-icon ${txn.type}">${icon}</div><div class="txn-details"><div class="txn-title">${txn.title}</div><div class="txn-meta"><span class="txn-category">${txn.category}</span><span class="txn-date">${dateStr}</span></div></div><div class="txn-amount ${txn.type}">${sign}${fmt(txn.amount)}</div>${showActions?`<div class="txn-actions"><button class="btn-edit" onclick="editTxn('${txn.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn-delete" onclick="deleteTxn('${txn.id}')" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div>`:''}</div>`;
}

function updateSummary() {
  const inc = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  $('total-balance').textContent=fmt(inc-exp); $('total-income').textContent=fmt(inc);
  $('total-expense').textContent=fmt(exp); $('total-count').textContent=transactions.length;
}

function renderRecent() {
  const r = transactions.slice(0,6);
  recentList.innerHTML = r.length ? r.map(t=>renderTxnItem(t)).join('') : '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>No transactions yet. Add your first one!</p></div>';
}

function renderAll() {
  let f = [...transactions];
  const s=$('search-input').value.toLowerCase().trim(), fT=$('filter-type').value, fC=$('filter-category').value, fS=$('filter-sort').value;
  if(s)f=f.filter(t=>t.title.toLowerCase().includes(s)||t.category.toLowerCase().includes(s));
  if(fT!=='all')f=f.filter(t=>t.type===fT); if(fC!=='all')f=f.filter(t=>t.category===fC);
  f.sort((a,b)=>{if(fS==='newest')return new Date(b.date)-new Date(a.date);if(fS==='oldest')return new Date(a.date)-new Date(b.date);if(fS==='highest')return b.amount-a.amount;return a.amount-b.amount;});
  allList.innerHTML = f.length ? f.map(t=>renderTxnItem(t)).join('') : '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>No transactions found.</p></div>';
}

// ===== CHARTS =====
function getCategoryData() {
  const cats={}; transactions.filter(t=>t.type==='expense').forEach(t=>{cats[t.category]=(cats[t.category]||0)+t.amount;});
  const labels=Object.keys(cats).sort((a,b)=>cats[b]-cats[a]); return {labels,data:labels.map(l=>cats[l])};
}
function getMonthlyData() {
  const m={}; transactions.forEach(t=>{const k=t.date.slice(0,7);if(!m[k])m[k]={income:0,expense:0};m[k][t.type]+=t.amount;});
  const keys=Object.keys(m).sort();
  return {labels:keys.map(k=>{const[y,mo]=k.split('-');return new Date(y,mo-1).toLocaleDateString('en-IN',{month:'short',year:'2-digit'});}),income:keys.map(k=>m[k].income),expense:keys.map(k=>m[k].expense),keys};
}
function chartOpts(type) {
  const c=getComputedStyle(document.documentElement),color=c.getPropertyValue('--text').trim(),dim=c.getPropertyValue('--text-muted').trim(),grid=c.getPropertyValue('--border').trim();
  if(type==='pie')return{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color,font:{family:'Inter',size:12},padding:14,usePointStyle:true,pointStyleWidth:10}}}};
  return{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color,font:{family:'Inter',size:12},usePointStyle:true}}},scales:{x:{grid:{color:grid},ticks:{color:dim,font:{family:'Inter'}}},y:{grid:{color:grid},ticks:{color:dim,font:{family:'Inter'},callback:v=>'₹'+v.toLocaleString('en-IN')}}}};
}
function updateCharts() {
  if(!window.Chart)return;
  const cd=getCategoryData(),md=getMonthlyData(),hc=cd.labels.length>0,hm=md.labels.length>0;
  $('pie-empty').classList.toggle('hidden',hc); if(pieChart)pieChart.destroy();
  if(hc)pieChart=new Chart($('pie-chart'),{type:'doughnut',data:{labels:cd.labels,datasets:[{data:cd.data,backgroundColor:chartColors.slice(0,cd.labels.length),borderWidth:0,hoverOffset:8}]},options:chartOpts('pie')});
  $('bar-empty').classList.toggle('hidden',hm); if(barChart)barChart.destroy();
  if(hm)barChart=new Chart($('bar-chart'),{type:'bar',data:{labels:md.labels,datasets:[{label:'Income',data:md.income,backgroundColor:'rgba(0,210,160,.7)',borderRadius:6},{label:'Expense',data:md.expense,backgroundColor:'rgba(255,107,129,.7)',borderRadius:6}]},options:chartOpts('bar')});
  $('analytics-pie-empty').classList.toggle('hidden',hc); if(aPieChart)aPieChart.destroy();
  if(hc)aPieChart=new Chart($('analytics-pie-chart'),{type:'doughnut',data:{labels:cd.labels,datasets:[{data:cd.data,backgroundColor:chartColors.slice(0,cd.labels.length),borderWidth:0,hoverOffset:8}]},options:chartOpts('pie')});
  $('analytics-bar-empty').classList.toggle('hidden',hm); if(aBarChart)aBarChart.destroy();
  if(hm)aBarChart=new Chart($('analytics-bar-chart'),{type:'bar',data:{labels:md.labels,datasets:[{label:'Income',data:md.income,backgroundColor:'rgba(0,210,160,.7)',borderRadius:6},{label:'Expense',data:md.expense,backgroundColor:'rgba(255,107,129,.7)',borderRadius:6}]},options:chartOpts('bar')});
}

function updateMonthlySummary() {
  const md=getMonthlyData(),body=$('monthly-summary-body');
  if(!md.labels.length){body.innerHTML='<tr class="empty-row"><td colspan="4">No data yet</td></tr>';return;}
  body.innerHTML=md.labels.map((l,i)=>{const inc=md.income[i],exp=md.expense[i],net=inc-exp;return`<tr><td>${l}</td><td style="color:var(--income)">${fmt(inc)}</td><td style="color:var(--expense)">${fmt(exp)}</td><td class="${net>=0?'net-positive':'net-negative'}">${net>=0?'+':''}${fmt(net)}</td></tr>`;}).join('');
}

function updateTopCategories() {
  const cd=getCategoryData(),c=$('top-categories-list');
  if(!cd.labels.length){c.innerHTML='<div class="empty-state"><p>No spending data yet</p></div>';return;}
  const max=Math.max(...cd.data);
  c.innerHTML=cd.labels.slice(0,6).map((l,i)=>{const p=(cd.data[i]/max*100).toFixed(0);return`<div class="cat-bar-item"><div class="cat-bar-header"><span class="cat-bar-name"><span class="cat-bar-icon">${catIcons[l]||'<i data-lucide="package" class="cat-lucide"></i>'}</span> ${l}</span><span class="cat-bar-amount">${fmt(cd.data[i])}</span></div><div class="cat-bar-track"><div class="cat-bar-fill" style="width:${p}%;background:${chartColors[i%chartColors.length]}"></div></div></div>`;}).join('');
}

// ===== BUDGET =====
function updateBudget() {
  $('budget-amount').value=budget||'';
  const now=new Date(),mk=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const spent=transactions.filter(t=>t.type==='expense'&&t.date.startsWith(mk)).reduce((s,t)=>s+t.amount,0);
  const rem=Math.max(0,budget-spent),pct=budget>0?Math.min((spent/budget)*100,100):0;
  $('budget-total').textContent=fmt(budget);$('budget-spent').textContent=fmt(spent);$('budget-remaining').textContent=fmt(rem);$('budget-percent').textContent=Math.round(pct)+'%';
  const circle=$('budget-circle-progress'),circ=2*Math.PI*85;
  circle.style.strokeDasharray=circ;circle.style.strokeDashoffset=circ-(circ*pct/100);
  circle.style.stroke=pct>=100?'var(--danger)':pct>=80?'var(--warning)':'var(--accent)';
  const w=$('budget-warning');
  if(budget>0&&pct>=80){w.style.display='flex';if(pct>=100){w.className='budget-warning danger';$('budget-warning-text').textContent=`You've exceeded your budget by ${fmt(spent-budget)}!`;}else{w.className='budget-warning';$('budget-warning-text').textContent=`Warning: You've used ${Math.round(pct)}% of your budget.`;}}else w.style.display='none';
  const me=transactions.filter(t=>t.type==='expense'&&t.date.startsWith(mk)),cats={};
  me.forEach(t=>{cats[t.category]=(cats[t.category]||0)+t.amount;});
  const cc=$('category-bars'),cl=Object.keys(cats).sort((a,b)=>cats[b]-cats[a]);
  if(!cl.length){cc.innerHTML='<div class="empty-state"><p>No expense data for this month</p></div>';return;}
  const cm=Math.max(...Object.values(cats));
  cc.innerHTML=cl.map((l,i)=>{const p=(cats[l]/cm*100).toFixed(0);return`<div class="cat-bar-item"><div class="cat-bar-header"><span class="cat-bar-name"><span class="cat-bar-icon">${catIcons[l]||'<i data-lucide="package" class="cat-lucide"></i>'}</span> ${l}</span><span class="cat-bar-amount">${fmt(cats[l])}</span></div><div class="cat-bar-track"><div class="cat-bar-fill" style="width:${p}%;background:${chartColors[i%chartColors.length]}"></div></div></div>`;}).join('');
}

$('budget-form').addEventListener('submit', (e) => {
  e.preventDefault(); if(!currentUser)return;
  const val=parseFloat($('budget-amount').value);
  if(isNaN(val)||val<=0){toast('Enter a valid budget amount','error');return;}
  budget=val; saveBudgetData(); updateBudget(); toast('Budget saved!','success');
});

function refreshAll(){updateSummary();renderRecent();renderAll();updateCharts();updateMonthlySummary();updateTopCategories();updateBudget();if(window.lucide)lucide.createIcons();}

// ===== NAVIGATION =====
function switchSection(name) {
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));
  $(`section-${name}`).classList.add('active');
  const n=$(`nav-${name}`);if(n)n.classList.add('active');
  $('sidebar').classList.remove('open');$('sidebar-overlay').classList.remove('open');
}
document.querySelectorAll('.nav-link').forEach(link=>{link.addEventListener('click',e=>{e.preventDefault();switchSection(link.dataset.section);});});
$('view-all-link').addEventListener('click',e=>{e.preventDefault();switchSection('transactions');});
$('search-input').addEventListener('input',renderAll);
$('filter-type').addEventListener('change',renderAll);
$('filter-category').addEventListener('change',renderAll);
$('filter-sort').addEventListener('change',renderAll);

function toggleTheme(){const h=document.documentElement,d=h.getAttribute('data-theme')==='dark';h.setAttribute('data-theme',d?'light':'dark');localStorage.setItem('ff_theme',d?'light':'dark');setTimeout(updateCharts,100);}
$('theme-toggle').addEventListener('click',toggleTheme);
$('theme-toggle-mobile').addEventListener('click',toggleTheme);
const savedTheme=localStorage.getItem('ff_theme');if(savedTheme)document.documentElement.setAttribute('data-theme',savedTheme);

$('hamburger').addEventListener('click',()=>{$('sidebar').classList.toggle('open');$('sidebar-overlay').classList.toggle('open');});
$('sidebar-overlay').addEventListener('click',()=>{$('sidebar').classList.remove('open');$('sidebar-overlay').classList.remove('open');});

$('export-csv').addEventListener('click',()=>{
  if(!transactions.length){toast('No transactions to export','warning');return;}
  const csv=[['Title','Amount','Type','Category','Date'],...transactions.map(t=>[t.title,t.amount,t.type,t.category,t.date])].map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`financeflow_${new Date().toISOString().slice(0,10)}.csv`;a.click();
  toast('Exported to CSV!','success');
});

// ===== INIT =====
(function init(){
  $('txn-date').value=new Date().toISOString().split('T')[0];
  const session=AuthService.getSession();
  if(session){showApp(session);toast('Welcome back, '+session.name+'!','success');}
  else showLanding();
  hideLoader();
  if(window.lucide)lucide.createIcons();
})();
