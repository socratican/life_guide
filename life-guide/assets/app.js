/* ===================================================
   高性价比人生指南 · 前端逻辑（无依赖）
   路由：#/   #/t/01   #/i/01-01
   =================================================== */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const EV_LABEL = { A: '有具体数字可查', B: '有研究支持', C: '经验与通行做法' };

const state = {
  themes: [],
  index: [],
  cache: new Map(),
  homeEv: 'all',
  homeQ: '',
  themeEv: 'all',
  themeQ: '',
  route: { view: 'home' },
  theme: null,
  item: null,
};

/* ---------- 工具 ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function highlight(text, q) {
  const t = esc(text);
  if (!q) return t;
  const kw = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!kw) return t;
  return t.replace(new RegExp(kw, 'gi'), m => `<mark>${m}</mark>`);
}

function autoLink(s) {
  return esc(s).replace(/(https?:\/\/[^\s;，。）)」]+)/g,
    u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
}

const themeByNo = no => state.themes.find(t => t.no === Number(no));

async function getJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

async function loadTheme(no) {
  if (state.cache.has(no)) return state.cache.get(no);
  const d = await getJSON(`data/t/${String(no).padStart(2, '0')}.json`);
  state.cache.set(no, d);
  return d;
}

/* ---------- 主题色 ---------- */
(function initTheme() {
  const saved = localStorage.getItem('hlb-theme');
  const sys = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = saved || sys;
  $('#themeToggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('hlb-theme', next);
  });
})();

/* ---------- 路由 ---------- */
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  if (!h) return { view: 'home' };
  if (h.startsWith('?q=')) {
    try { return { view: 'home', q: decodeURIComponent(h.slice(3)) }; } catch (e) { return { view: 'home' }; }
  }
  const [kind, arg] = h.split('/');
  if (kind === 't' && /^\d{1,2}$/.test(arg)) return { view: 'theme', no: Number(arg) };
  if (kind === 'i' && /^\d{1,2}-\d{1,2}$/.test(arg)) {
    const [no, n] = arg.split('-').map(Number);
    return { view: 'item', no, n, id: arg };
  }
  return { view: 'home' };
}

window.addEventListener('hashchange', route);

async function route() {
  const r = parseHash();
  state.route = r;
  if (r.view === 'home' && typeof r.q === 'string') {
    state.homeQ = r.q;
    $('#q').value = r.q;
    $('#qClear').hidden = !r.q;
  }
  showView(r.view);
  if (r.view === 'home') return renderHome();
  if (r.view === 'theme') return renderTheme(r.no);
  if (r.view === 'item') return renderItem(r.no, r.n, r.id);
}

function showView(name) {
  ['home', 'theme', 'item'].forEach(v => { $('#view-' + v).hidden = v !== name; });
  $('#empty').hidden = true;
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function fail(msg) {
  const el = $('#empty');
  el.hidden = false;
  el.innerHTML = `<b>${esc(msg)}</b><p>如果是直接双击打开的 index.html，请改用本地服务器访问；部署到 GitHub Pages 后即可正常加载。</p>`;
}

/* ---------- 一级：主题 ---------- */
function renderHome() {
  const q = state.homeQ.trim();
  const ev = state.homeEv;
  const filtering = !!q || ev !== 'all';

  $('.hero').hidden = filtering;
  $('#homeTitle').textContent = filtering ? '筛选结果' : '全部主题';
  $('#homeHint').textContent = '';
  $('#themeGrid').hidden = filtering;
  $('#searchResults').hidden = !filtering;

  if (!filtering) {
    renderGrid();
    return;
  }

  let list = state.index;
  if (ev !== 'all') list = list.filter(x => x.e === ev);
  if (q) {
    const k = q.toLowerCase();
    list = list
      .map(x => {
        const inTitle = x.t.toLowerCase().includes(k);
        const inHint = (x.h || '').toLowerCase().includes(k);
        const th = themeByNo(x.x);
        const inTheme = th && th.name.toLowerCase().includes(k);
        if (!inTitle && !inHint && !inTheme) return null;
        return { ...x, score: (inTitle ? 10 : 0) + (inHint ? 3 : 0) + (inTheme ? 1 : 0) };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
  }

  $('#homeHint').textContent = `共 ${list.length} 条`;
  const top = list.slice(0, 100);
  $('#searchResults').innerHTML =
    top.map(x => {
      const th = themeByNo(x.x);
      return `<a class="result-row" href="#/i/${x.i}">
        <span class="rid">${x.i}</span>
        <span class="badge ${x.e}">${x.e}</span>
        <span class="result-main">
          <span class="result-title">${highlight(x.t, q)}</span>
          <span class="result-sub">${highlight(x.h || '', q)}</span>
        </span>
        <span class="result-theme">${esc(th ? th.name : '')}</span>
      </a>`;
    }).join('') +
    (list.length > top.length
      ? `<p class="hint" style="padding:16px 0">只显示前 100 条（共 ${list.length} 条），请再输入关键词缩小范围。</p>`
      : '');
}

function renderGrid() {
  $('#themeGrid').innerHTML = state.themes.map(t => `
    <a class="tcard" href="#/t/${String(t.no).padStart(2, '0')}">
      <span class="tcard-top">
        <span class="tno">${String(t.no).padStart(2, '0')}</span>
        <span class="tcount">${t.count} 条</span>
      </span>
      <h3>${esc(t.name)}</h3>
      <p class="tintro">${esc(t.intro || '')}</p>
      <span class="tmore">查看条目 →</span>
    </a>`).join('');
}

/* ---------- 二级：条目 ---------- */
async function renderTheme(no) {
  const th = themeByNo(no);
  if (!th) { location.hash = '#/'; return; }

  let data;
  try { data = await loadTheme(no); }
  catch (e) { return fail('条目数据加载失败'); }

  state.theme = data;
  state.themeQ = '';
  state.themeEv = 'all';
  $('#localQ').value = '';
  $$('#view-theme .chip').forEach(c => c.classList.toggle('is-on', c.dataset.ev === 'all'));

  $('#themeCrumbs').innerHTML =
    `<a href="#/">全部主题</a><span class="sep">/</span><span class="cur">${esc(data.name)}</span>`;
  $('#themeNo').textContent = String(no).padStart(2, '0');
  $('#themeName').textContent = data.name;
  const intro = data.intro || '';
  $('#themeIntro').textContent = intro;
  $('#themeIntro').className = 'theme-intro' + (intro.length > 110 ? ' clamp' : '');
  const oldBtn = $('#themeIntro').nextElementSibling;
  if (oldBtn && oldBtn.classList.contains('expand')) oldBtn.remove();
  if (intro.length > 110) {
    const btn = document.createElement('button');
    btn.className = 'expand'; btn.type = 'button'; btn.textContent = '展开本节说明';
    btn.onclick = () => {
      const on = $('#themeIntro').classList.toggle('clamp');
      btn.textContent = on ? '展开本节说明' : '收起';
    };
    $('#themeIntro').after(btn);
  }

  paintItems();
  document.title = `${data.name} · 高性价比人生指南`;
}

function paintItems() {
  const data = state.theme;
  if (!data) return;
  const q = state.themeQ.trim().toLowerCase();
  const ev = state.themeEv;

  let list = data.items;
  if (ev !== 'all') list = list.filter(x => x.e === ev);
  if (q) list = list.filter(x => x.t.toLowerCase().includes(q) || (x.s || '').toLowerCase().includes(q));

  $('#itemHint').textContent = (q || ev !== 'all')
    ? `显示 ${list.length} / ${data.items.length} 条`
    : `共 ${data.items.length} 条`;

  $('#itemList').innerHTML = list.length
    ? list.map(x => `
      <a class="row" href="#/i/${x.id}">
        <span class="rid">${x.id}</span>
        <span class="badge ${x.e}">${x.e}</span>
        <span class="row-main">
          <span class="rt">${highlight(x.t, state.themeQ.trim())}</span>
          <span class="rh">${highlight((x.s || '').slice(0, 90), state.themeQ.trim())}</span>
        </span>
        <svg class="arrow" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M5 2.5 9.5 7 5 11.5" fill="none" stroke="currentColor" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>`).join('')
    : `<p class="hint" style="padding:24px 0">没有符合条件的条目。</p>`;
}

/* ---------- 三级：解释 ---------- */
async function renderItem(no, n, id) {
  const th = themeByNo(no);
  if (!th) { location.hash = '#/'; return; }

  let data;
  try { data = await loadTheme(no); }
  catch (e) { return fail('条目数据加载失败'); }

  const idx = data.items.findIndex(x => x.id === id);
  if (idx < 0) { location.hash = `#/t/${no}`; return; }
  const it = data.items[idx];
  state.theme = data;
  state.item = it;

  $('#itemCrumbs').innerHTML =
    `<a href="#/">全部主题</a><span class="sep">/</span>` +
    `<a href="#/t/${String(no).padStart(2, '0')}">${esc(data.name)}</a><span class="sep">/</span>` +
    `<span class="cur">${it.id}</span>`;

  const field = (label, text, cls = '') => text
    ? `<section class="field ${cls}"><div class="field-head"><span class="bar"></span>${label}</div><p>${esc(text)}</p></section>`
    : '';

  $('#detail').innerHTML = `
    <div class="dmeta">
      <span class="badge ${it.e}">${it.e}</span>
      <span>证据等级 ${it.e} · ${esc(EV_LABEL[it.e] || '')}</span>
      ${it.k ? '<span class="wr">原书标注：有争议</span>' : ''}
      <span class="dot">·</span>
      <span class="tag">${String(no).padStart(2, '0')} ${esc(data.name)}</span>
      <span class="dot">·</span>
      <span>第 ${idx + 1} / ${data.items.length} 条</span>
    </div>
    <h1>${esc(it.t)}</h1>
    ${it.s ? `<div class="lead">${esc(it.s)}</div>` : ''}
    ${field('成本', it.c)}
    ${field('收益', it.g, 'gain')}
    ${field('备注', it.m)}
    ${it.q ? `<section class="field">
        <details class="src"><summary>来源与参考（${(it.q.match(/https?:/g) || []).length} 个链接）</summary>
        <div class="src-body">${autoLink(it.q)}</div></details>
      </section>` : ''}
  `;

  const prev = data.items[idx - 1];
  const next = data.items[idx + 1];
  $('#pager').innerHTML =
    (prev
      ? `<a href="#/i/${prev.id}"><span class="lbl">← 上一条</span><span class="tt">${esc(prev.t)}</span></a>`
      : `<span class="spacer"></span>`) +
    (next
      ? `<a class="next" href="#/i/${next.id}"><span class="lbl">下一条 →</span><span class="tt">${esc(next.t)}</span></a>`
      : `<span class="spacer"></span>`);

  document.title = `${it.t} · ${data.name}`;
}

/* ---------- 交互绑定 ---------- */
(function bind() {
  const qEl = $('#q');
  const clearBtn = $('#qClear');

  qEl.addEventListener('input', () => {
    state.homeQ = qEl.value;
    clearBtn.hidden = !qEl.value;
    if (state.route.view !== 'home') {
      location.hash = '#/';
      return;
    }
    renderHome();
  });

  clearBtn.addEventListener('click', () => {
    qEl.value = ''; state.homeQ = '';
    clearBtn.hidden = true; qEl.focus();
    renderHome();
  });

  $('#homeFilters').addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    state.homeEv = btn.dataset.ev;
    $$('#homeFilters .chip').forEach(c => c.classList.toggle('is-on', c === btn));
    renderHome();
  });

  $('#view-theme').addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    state.themeEv = btn.dataset.ev;
    $$('#view-theme .chip').forEach(c => c.classList.toggle('is-on', c === btn));
    paintItems();
  });

  let tId;
  $('#localQ').addEventListener('input', e => {
    clearTimeout(tId);
    tId = setTimeout(() => { state.themeQ = e.target.value; paintItems(); }, 90);
  });

  document.addEventListener('keydown', e => {
    const typing = /input|textarea/i.test(document.activeElement.tagName);
    if (e.key === '/' && !typing) {
      e.preventDefault(); qEl.focus(); qEl.select();
    } else if (state.route.view === 'item' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !typing) {
      const items = (state.theme || {}).items || [];
      const i = items.findIndex(x => x.id === (state.item || {}).id);
      if (i < 0) return;
      const t = items[e.key === 'ArrowLeft' ? i - 1 : i + 1];
      if (t) { e.preventDefault(); location.hash = `#/i/${t.id}`; }
    } else if (e.key === 'Escape') {
      if (typing) { document.activeElement.blur(); return; }
      const r = state.route;
      if (r.view === 'item') location.hash = `#/t/${r.no}`;
      else if (r.view === 'theme') location.hash = '#/';
    }
  });
})();

/* ---------- 启动 ---------- */
(async function boot() {
  try {
    const [themes, index] = await Promise.all([
      getJSON('data/themes.json'),
      getJSON('data/search.json'),
    ]);
    state.themes = themes.themes;
    state.index = index;

    const total = state.themes.reduce((a, t) => a + t.count, 0);
    const byEv = { A: 0, B: 0, C: 0 };
    state.index.forEach(x => { byEv[x.e] = (byEv[x.e] || 0) + 1; });
    $('#stats').innerHTML = `
      <div class="stat"><b>${state.themes.length}</b><span>生活主题</span></div>
      <div class="stat"><b>${total}</b><span>条建议</span></div>
      <div class="stat"><b>${byEv.A || 0}</b><span>A 级 · 有具体数字</span></div>
      <div class="stat"><b>${byEv.B || 0}</b><span>B 级 · 有研究支持</span></div>`;

    route();
  } catch (err) {
    console.error(err);
    fail('数据加载失败：' + err.message);
  }
})();
