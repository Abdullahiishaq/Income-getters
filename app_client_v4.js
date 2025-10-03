// Client app v4 - continuation of v3; connects modals to v3 API endpoints and seeds UI from /api/jobs
const apiBase = "/api";

function token(){ return localStorage.getItem('ig_token'); }
function setToken(t){ if(t) localStorage.setItem('ig_token', t); else localStorage.removeItem('ig_token'); }
function currentUser(){ try { return JSON.parse(localStorage.getItem('ig_user')); } catch(e){ return null; } }
function setUser(u){ if(u) localStorage.setItem('ig_user', JSON.stringify(u)); else localStorage.removeItem('ig_user'); }

async function fetchJobs(){ try { const res = await fetch(apiBase + '/jobs'); return res.ok? (await res.json()).jobs : []; } catch(e){ return []; } }

function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function truncate(s,len){ return (s||'').length>len? s.slice(0,len-1)+'…': s; }

async function renderJobs(){
  const jobs = await fetchJobs();
  document.getElementById('count').textContent = jobs.length;
  const container = document.getElementById('jobsContainer'); container.innerHTML = '';
  if(jobs.length===0){ container.innerHTML = '<div class="bg-white p-6 rounded shadow text-gray-500">No jobs found.</div>'; return; }
  jobs.forEach(j=>{
    const el = document.createElement('div');
    el.className = 'job-card bg-white p-4 rounded shadow flex justify-between items-start';
    el.innerHTML = `
      <div>
        <h3 class="text-lg font-semibold">${escapeHtml(j.title)}</h3>
        <div class="text-sm text-gray-600">${escapeHtml(j.category)} • ${escapeHtml(j.type)} • ${escapeHtml(j.location)}</div>
        <p class="mt-2 text-gray-700">${truncate(escapeHtml(j.description), 140)}</p>
      </div>
      <div class="text-right">
        <div class="text-sm text-gray-500 mb-2">${escapeHtml(j.budget)}</div>
        <button class="viewBtn bg-green-600 text-white px-3 py-1 rounded" data-id="${j.id}">View</button>
      </div>`;
    container.appendChild(el);
  });
  document.querySelectorAll('.viewBtn').forEach(b=> b.addEventListener('click', async e=>{
    const id = e.currentTarget.dataset.id;
    const res = await fetch(apiBase + '/jobs/' + id);
    const j = await res.json();
    showDetail(j.job);
  }));
}

function showDetail(job){
  const modal = document.getElementById('postJobModal'); // reuse for quick view
  // populate and open a simple detail overlay (or use jobDetailModal if implemented)
  alert('Job: ' + job.title + '\n' + (job.description||'') );
}

// modal helpers
function openModal(id){ document.getElementById(id).classList.remove('hidden'); document.getElementById(id).classList.add('modal-open'); }
function closeModal(id){ document.getElementById(id).classList.add('hidden'); document.getElementById(id).classList.remove('modal-open'); }

document.addEventListener('DOMContentLoaded', ()=>{
  renderJobs();
  const signinBtn = document.getElementById('signinBtn');
  const profileBtn = document.getElementById('profileBtn');
  const postJobBtn = document.getElementById('postJobBtn');

  function refreshAuthUI(){
    const u = currentUser();
    if(u){ signinBtn.textContent = 'Hi, ' + (u.name||u.email); profileBtn.classList.remove('hidden'); }
    else { signinBtn.textContent = 'Sign in / Register'; profileBtn.classList.add('hidden'); }
  }
  refreshAuthUI();

  signinBtn.onclick = ()=> openModal('authModal');
  document.getElementById('closeAuth').onclick = ()=> closeModal('authModal');

  document.getElementById('showRegister').onclick = ()=> { openModal('authModal'); document.getElementById('regName').focus(); };

  // login
  document.getElementById('doLogin').onclick = async (e)=>{
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const res = await fetch(apiBase + '/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
    const j = await res.json();
    if(res.ok){ setToken(j.token); setUser(j.user); alert('Logged in'); refreshAuthUI(); closeModal('authModal'); }
    else alert(j.error || 'Login failed');
  };

  // register
  document.getElementById('doRegister').onclick = async (e)=>{
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    const res = await fetch(apiBase + '/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, email, password, role }) });
    const j = await res.json();
    if(res.ok){ setToken(j.token); setUser(j.user); alert('Registered — please complete your profile'); refreshAuthUI(); }
    else alert(j.error || 'Registration failed');
  };

  // profile avatar preview
  document.getElementById('pfAvatar').addEventListener('change', (e)=>{
    const f = e.target.files[0]; if(!f) return;
    const img = document.getElementById('avatarPreview'); img.src = URL.createObjectURL(f); img.classList.remove('hidden');
  });

  // save profile
  document.getElementById('saveProfile').onclick = async (e)=>{
    e.preventDefault();
    const tk = token(); if(!tk){ alert('Sign in first'); return; }
    const fd = new FormData();
    fd.append('title', document.getElementById('pfTitle').value || '');
    fd.append('skills', document.getElementById('pfSkills').value || '');
    fd.append('bio', document.getElementById('pfBio').value || '');
    const avatar = document.getElementById('pfAvatar').files[0];
    const cv = document.getElementById('pfCv').files[0];
    if(avatar) fd.append('avatar', avatar);
    if(cv) fd.append('cv', cv);
    const res = await fetch(apiBase + '/me', { method:'PUT', body: fd, headers: { 'Authorization': 'Bearer ' + tk } });
    const j = await res.json();
    if(res.ok){ alert('Profile updated'); setUser(j.user); closeModal('authModal'); }
    else alert(j.error || 'Save failed');
  };

  // logout
  document.getElementById('logoutBtn').onclick = ()=>{ setToken(null); setUser(null); alert('Logged out'); refreshAuthUI(); closeModal('authModal'); };

  // post job
  document.getElementById('postJobForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const tk = token(); if(!tk){ alert('Sign in first'); openModal('authModal'); return; }
    const fd = new FormData(e.target);
    const res = await fetch(apiBase + '/jobs', { method:'POST', body: fd, headers: { 'Authorization': 'Bearer ' + tk } });
    const j = await res.json();
    if(res.ok){ alert('Job posted'); closeModal('postJobModal'); renderJobs(); }
    else alert(j.error || 'Failed to post job');
  });

  document.getElementById('postJobBtn').onclick = ()=> {
    if(!token()){ alert('Please sign in to post a job'); openModal('authModal'); return; }
    openModal('postJobModal');
  };
});