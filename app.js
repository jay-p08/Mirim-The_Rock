import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";


// ── FIREBASE 설정 ──
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const COLLECTION = "applications";

// ── FIREBASE CRUD ──
async function loadApps() {
  try {
    const q = query(collection(db, COLLECTION), orderBy("submittedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ docId: d.id, ...d.data() }));
  } catch (e) {
    console.error("Firestore 불러오기 실패:", e);
    return [];
  }
}

async function addApp(app) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), app);
    return docRef.id;
  } catch (e) {
    console.error("Firestore 저장 실패:", e);
    throw e;
  }
}

async function updateApp(docId, data) {
  try {
    await updateDoc(doc(db, COLLECTION, docId), data);
  } catch (e) {
    console.error("Firestore 업데이트 실패:", e);
    throw e;
  }
}

// ══════════════════════════════════
// FORM STATE
// ══════════════════════════════════
let step = 0;
let instruments = [];
let level = '';
let dorm = '';
let agreeChecked = false;

// ── UTILS ──
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function toast(msg, color = 'var(--error)') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = color;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function loading(on) {
  document.getElementById('loading').classList.toggle('show', on);
}

// ── NAVIGATION ──
function goTo(s) {
  document.querySelectorAll('.form-section').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.progress-step').forEach((x, i) => {
    x.classList.remove('active', 'done');
    if (i < s) x.classList.add('done');
    if (i === s) x.classList.add('active');
  });
  document.getElementById('step-' + s).classList.add('active');
  step = s;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.nextStep = function () { if (validate(step)) { if (step === 2) buildReview(); if (step < 3) goTo(step + 1); } };
window.prevStep = function () { if (step > 0) goTo(step - 1); };

// ── VALIDATION ──
function clearErr(id) {
  const e = document.getElementById('err-' + id); if (e) e.classList.remove('show');
  const inp = document.getElementById(id); if (inp) inp.classList.remove('error');
}
window.clearErr = clearErr;

function markErr(id, msg) {
  const inp = document.getElementById(id); if (inp) inp.classList.add('error');
  const e = document.getElementById('err-' + id); if (e) { if (msg) e.textContent = msg; e.classList.add('show'); }
}

function validate(s) {
  let ok = true;
  if (s === 0) {
    ['name', 'student-id', 'dept', 'phone'].forEach(f => {
      if (!document.getElementById(f).value.trim()) { markErr(f); ok = false; } else clearErr(f);
    });
    if (!document.getElementById('grade').value) { markErr('grade'); ok = false; } else clearErr('grade');
    const em = document.getElementById('email').value.trim();
    if (!em) { markErr('email', '이메일을 입력해주세요.'); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { markErr('email', '올바른 이메일 형식이 아닙니다.'); ok = false; }
    else clearErr('email');
  }
  if (s === 1) {
    if (instruments.length === 0) {
      document.getElementById('err-instrument').classList.add('show');
      document.getElementById('instrument-grid').classList.add('error-sel');
      ok = false;
    } else {
      document.getElementById('err-instrument').classList.remove('show');
      document.getElementById('instrument-grid').classList.remove('error-sel');
    }
    if (!level) {
      document.getElementById('err-level').classList.add('show');
      document.getElementById('level-grid').classList.add('error-sel');
      ok = false;
    } else {
      document.getElementById('err-level').classList.remove('show');
      document.getElementById('level-grid').classList.remove('error-sel');
    }
    if (!document.getElementById('genre').value.trim()) { markErr('genre'); ok = false; } else clearErr('genre');
    if (!document.getElementById('audition-song').value.trim()) { markErr('audition-song'); ok = false; } else clearErr('audition-song');
    if (!dorm) {
      document.getElementById('err-dorm').classList.add('show');
      document.getElementById('dorm-grid').classList.add('error-sel'); ok = false;
    } else {
      document.getElementById('err-dorm').classList.remove('show');
      document.getElementById('dorm-grid').classList.remove('error-sel');
    }
  }
  if (s === 2) {
    if (!document.getElementById('motivation').value.trim()) { markErr('motivation'); ok = false; } else clearErr('motivation');
    if (!agreeChecked) {
      document.getElementById('err-agree').classList.add('show');
      document.getElementById('agree-check').classList.add('error-sel');
      ok = false;
    } else {
      document.getElementById('err-agree').classList.remove('show');
      document.getElementById('agree-check').classList.remove('error-sel');
    }
  }
  if (!ok) {
    toast('필수 항목을 모두 입력/선택해주세요.');
    const first = document.querySelector('.form-section.active .error-msg.show');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return ok;
}

// ── FORM INPUTS ──
window.toggleInstrument = function (el, name) {
  el.classList.toggle('selected');
  instruments = el.classList.contains('selected')
    ? [...new Set([...instruments, name])]
    : instruments.filter(i => i !== name);
  if (instruments.length > 0) {
    document.getElementById('err-instrument').classList.remove('show');
    document.getElementById('instrument-grid').classList.remove('error-sel');
  }
};

window.selectLevel = function (el, lv) {
  document.querySelectorAll('#level-grid .level-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  level = lv;
  document.getElementById('err-level').classList.remove('show');
  document.getElementById('level-grid').classList.remove('error-sel');
};

window.selectDorm = function (el, dormValue) {
  document.querySelectorAll('#dorm-grid .level-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  dorm = dormValue;
  document.getElementById('err-dorm').classList.remove('show');
  document.getElementById('dorm-grid').classList.remove('error-sel');
};

window.toggleDay = function (el) {
  el.classList.toggle('checked');
  el.querySelector('.check-box').innerHTML = el.classList.contains('checked') ? '✓' : '';
};

window.toggleAgree = function (el) {
  el.classList.toggle('checked');
  el.querySelector('.check-box').innerHTML = el.classList.contains('checked') ? '✓' : '';
  agreeChecked = el.classList.contains('checked');
  if (agreeChecked) {
    document.getElementById('err-agree').classList.remove('show');
    el.classList.remove('error-sel');
  }
};

// ── REVIEW ──
function buildReview() {
  const rows = [
    ['이름', document.getElementById('name').value],
    ['학번/사번', document.getElementById('student-id').value],
    ['학과/소속', document.getElementById('dept').value + ' ' + document.getElementById('grade').value],
    ['연락처', document.getElementById('phone').value],
    ['이메일', document.getElementById('email').value],
    ['담당 파트', instruments.join(', ')],
    ['연주 경력', level],
    ['선호 장르', document.getElementById('genre').value],
    ['오디션 곡목', document.getElementById('audition-song').value],
    ['이전 경험', document.getElementById('prev-band').value || '없음'],
    ['지원 동기', document.getElementById('motivation').value],
    ['음악적 목표', document.getElementById('goals').value || '—'],
    ['대표 아티스트', document.getElementById('artist').value || '—'],
  ];
  document.getElementById('review-content').innerHTML = rows.map(([l, v]) => `
    <div style="display:flex;gap:20px;padding:14px 20px;border-bottom:1px solid #1a1a1a;align-items:flex-start">
      <span style="font-size:11px;letter-spacing:0.1em;color:#555;text-transform:uppercase;min-width:110px;flex-shrink:0;padding-top:2px">${l}</span>
      <span style="font-size:13px;color:#e0e0e0;line-height:1.7">${esc(v)}</span>
    </div>`).join('');
}

// ── SUBMIT ──
window.submitForm = async function () {
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  loading(true);

  const application = {
    submittedAt: new Date().toISOString(),
    status: 'pending',
    note: '',
    name: document.getElementById('name').value.trim(),
    studentId: document.getElementById('student-id').value.trim(),
    dept: document.getElementById('dept').value.trim(),
    grade: document.getElementById('grade').value,
    phone: document.getElementById('phone').value.trim(),
    email: document.getElementById('email').value.trim(),
    instruments: [...instruments],
    level,
    genre: document.getElementById('genre').value,
    prevBand: document.getElementById('prev-band').value.trim(),
    song: document.getElementById('audition-song').value.trim(),
    motivation: document.getElementById('motivation').value.trim(),
    goals: document.getElementById('goals').value.trim(),
    artist: document.getElementById('artist').value.trim(),
  };

  try {
    await addApp(application);
    loading(false);
    document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
    document.querySelector('.progress-bar').style.display = 'none';
    document.getElementById('success').classList.add('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    loading(false);
    btn.disabled = false;
    toast('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
  }
};

// ══════════════════════════════════
// ADMIN
// ══════════════════════════════════
let adminLoggedIn = false;
let allApps = [];
let filterPart = '전체';
let sortKey = 'submittedAt';
let sortDir = -1;
let modalId = null;

window.showAdminPage = function () {
  document.getElementById('app-page').style.display = 'none';
  document.getElementById('admin-page').classList.add('show');
  if (!adminLoggedIn) {
    document.getElementById('admin-login').style.display = 'block';
    document.getElementById('admin-dashboard').classList.remove('show');
  }
};

window.hideAdminPage = function () {
  document.getElementById('app-page').style.display = 'block';
  document.getElementById('admin-page').classList.remove('show');
};

window.doLogin = async function () {
  const id = document.getElementById('login-id').value.trim();
  const pw = document.getElementById('login-pw').value.trim();
  if (id === import.meta.env.VITE_ADMIN_ID && pw === import.meta.env.VITE_ADMIN_PW) {
    adminLoggedIn = true;
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-dashboard').classList.add('show');
    await loadDashboard();
  } else {
    document.getElementById('login-error').classList.add('show');
    document.getElementById('login-pw').value = '';
  }
};

async function loadDashboard() {
  loading(true);
  allApps = await loadApps();
  loading(false);
  renderStats();
  renderTable();
}

// 어드민 페이지에서 새로고침 버튼 역할
window.refreshDashboard = async function () {
  loading(true);
  allApps = await loadApps();
  loading(false);
  renderStats();
  renderTable();
  toast('새로고침 완료', 'var(--success)');
};

function renderStats() {
  const total = allApps.length;
  const pending = allApps.filter(a => a.status === 'pending').length;
  const pass = allApps.filter(a => a.status === 'pass').length;
  const pc = {};
  allApps.forEach(a => (a.instruments || []).forEach(p => { pc[p] = (pc[p] || 0) + 1; }));
  const top = Object.keys(pc).sort((a, b) => pc[b] - pc[a])[0] || '—';
  document.getElementById('stats-row').innerHTML = `
    <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-label">총 지원자</div></div>
    <div class="stat-card"><div class="stat-num" style="color:var(--accent2)">${pending}</div><div class="stat-label">검토 중</div></div>
    <div class="stat-card"><div class="stat-num" style="color:var(--success)">${pass}</div><div class="stat-label">합격</div></div>
    <div class="stat-card"><div class="stat-num" style="font-size:32px;color:var(--muted)">${top}</div><div class="stat-label">최다 지원 파트</div></div>`;
}

window.setFilter = function (btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filterPart = btn.dataset.filter;
  renderTable();
};

window.sortBy = function (k) {
  if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = -1; }
  renderTable();
};

window.renderTable = function () {
  const q = (document.getElementById('search-input').value || '').toLowerCase();
  let list = allApps.filter(a => {
    const mf = filterPart === '전체' || (a.instruments || []).some(p => p.includes(filterPart));
    const ms = !q || a.name.toLowerCase().includes(q) || a.dept.toLowerCase().includes(q)
      || (a.instruments || []).join(',').toLowerCase().includes(q) || a.song.toLowerCase().includes(q);
    return mf && ms;
  }).sort((a, b) => {
    const av = sortKey === 'instruments' ? (a.instruments || []).join(',') : (a[sortKey] ?? '');
    const bv = sortKey === 'instruments' ? (b.instruments || []).join(',') : (b[sortKey] ?? '');
    return av < bv ? -sortDir : av > bv ? sortDir : 0;
  });

  const em = document.getElementById('empty-state');
  const tb = document.getElementById('apps-tbody');
  if (!list.length) { tb.innerHTML = ''; em.style.display = 'block'; return; }
  em.style.display = 'none';

  const tm = { 보컬: 'vocal', 일렉기타: 'guitar', 베이스: 'bass', 드럼: 'drum', 키보드: 'keyboard', 어쿠스틱기타: 'acoustic', 바이올린: 'violin' };
  const sl = { pending: '검토 중', pass: '합격', fail: '불합격' };
  const sc = { pending: 'status-pending', pass: 'status-pass', fail: 'status-fail' };

  tb.innerHTML = list.map((a, i) => {
    const tags = (a.instruments || []).map(p => `<span class="tag ${tm[p] || 'other'}">${p}</span>`).join('');
    const dt = new Date(a.submittedAt);
    const ds = `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    return `<tr onclick="openModal('${a.docId}')">
      <td style="color:var(--muted)">${i + 1}</td>
      <td style="font-weight:500">${esc(a.name)}</td>
      <td style="font-size:12px;color:var(--muted)">${esc(a.dept)}<br>${esc(a.grade)}</td>
      <td>${tags}</td>
      <td style="font-size:12px;color:var(--muted)">${esc(a.level)}</td>
      <td style="font-size:12px;color:var(--muted)">${esc(a.genre)}</td>
      <td style="font-size:12px">${esc(a.song)}</td>
      <td style="font-size:12px;color:var(--muted)">${ds}</td>
      <td><span class="status-badge ${sc[a.status]}">${sl[a.status]}</span></td>
    </tr>`;
  }).join('');
};

window.openModal = function (docId) {
  const a = allApps.find(x => x.docId === docId);
  if (!a) return;
  modalId = docId;
  document.getElementById('m-name').textContent = a.name;
  document.getElementById('m-sub').textContent = `${a.dept} ${a.grade} · ${a.phone} · ${a.email}`;
  const tm = { 보컬: 'vocal', 일렉기타: 'guitar', 베이스: 'bass', 드럼: 'drum', 키보드: 'keyboard', 어쿠스틱기타: 'acoustic', 바이올린: 'violin' };
  const tags = (a.instruments || []).map(p => `<span class="tag ${tm[p] || 'other'}">${p}</span>`).join('');
  document.getElementById('modal-body').innerHTML = `
    <div class="modal-section">
      <div class="modal-section-title">기본 정보</div>
      <div class="modal-row"><span class="modal-row-label">학번/사번</span><span class="modal-row-val">${esc(a.studentId)}</span></div>
      <div class="modal-row"><span class="modal-row-label">학과/학년</span><span class="modal-row-val">${esc(a.dept)} ${esc(a.grade)}</span></div>
      <div class="modal-row"><span class="modal-row-label">연락처</span><span class="modal-row-val">${esc(a.phone)}</span></div>
      <div class="modal-row"><span class="modal-row-label">이메일</span><span class="modal-row-val">${esc(a.email)}</span></div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">음악 정보</div>
      <div class="modal-row"><span class="modal-row-label">담당 파트</span><span class="modal-row-val">${tags}</span></div>
      <div class="modal-row"><span class="modal-row-label">연주 경력</span><span class="modal-row-val">${esc(a.level)}</span></div>
      <div class="modal-row"><span class="modal-row-label">선호 장르</span><span class="modal-row-val">${esc(a.genre)}</span></div>
      <div class="modal-row"><span class="modal-row-label">오디션 곡</span><span class="modal-row-val">${esc(a.song)}</span></div>
      <div class="modal-row"><span class="modal-row-label">이전 경험</span><span class="modal-row-val">${esc(a.prevBand || '없음')}</span></div>
      <div class="modal-row"><span class="modal-row-label">대표 아티스트</span><span class="modal-row-val">${esc(a.artist || '—')}</span></div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">지원 동기</div>
      <div class="modal-motivation">${esc(a.motivation)}</div>
    </div>
    ${a.goals ? `<div class="modal-section"><div class="modal-section-title">음악적 목표</div><div class="modal-motivation">${esc(a.goals)}</div></div>` : ''}
    ${a.note ? `<div class="modal-section"><div class="modal-section-title">관리자 메모</div><div style="font-size:13px;color:var(--accent);padding:12px;border:1px solid #2a2a00;background:#111">${esc(a.note)}</div></div>` : ''}
  `;
  document.getElementById('modal-status').value = a.status;
  document.getElementById('modal-note').value = a.note || '';
  document.getElementById('modal-overlay').classList.add('show');
  document.body.style.overflow = 'hidden';
};

window.closeModal = function () {
  document.getElementById('modal-overlay').classList.remove('show');
  document.body.style.overflow = '';
  modalId = null;
};

window.updateStatus = async function () {
  if (!modalId) return;
  const newStatus = document.getElementById('modal-status').value;
  const a = allApps.find(x => x.docId === modalId);
  if (!a) return;
  loading(true);
  await updateApp(modalId, { status: newStatus });
  a.status = newStatus;
  loading(false);
  renderStats();
  renderTable();
  toast('상태가 저장되었습니다.', 'var(--success)');
};

window.saveNote = async function () {
  if (!modalId) return;
  const note = document.getElementById('modal-note').value.trim();
  const a = allApps.find(x => x.docId === modalId);
  if (!a) return;
  loading(true);
  await updateApp(modalId, { note });
  a.note = note;
  loading(false);
  toast('메모가 저장되었습니다.', 'var(--success)');
  window.openModal(modalId);
};

window.exportCSV = function () {
  const headers = ['번호', '이름', '학번', '학과', '학년', '연락처', '이메일', '파트', '경력', '장르', '오디션곡', '활동요일', '상태', '메모', '접수일시'];
  const rows = allApps.map((a, i) => [
    i + 1, a.name, a.studentId, a.dept, a.grade, a.phone, a.email,
    (a.instruments || []).join('/'), a.level, a.genre, a.song,
    { pending: '검토중', pass: '합격', fail: '불합격' }[a.status],
    a.note || '',
    new Date(a.submittedAt).toLocaleString('ko-KR')
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const el = document.createElement('a');
  el.href = url;
  el.download = `밴드부_지원자_${new Date().toLocaleDateString('ko-KR').replace(/\s|\./g, '')}.csv`;
  el.click();
  URL.revokeObjectURL(url);
  toast('CSV 저장 완료', 'var(--success)');
};

document.addEventListener('keydown', e => { if (e.key === 'Escape') window.closeModal(); });