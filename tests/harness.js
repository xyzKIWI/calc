'use strict';
// 測試用 harness：不修改任何 calc-*.html。
// 讀入頁面原始 HTML，建立極簡 DOM，並在 node:vm 中原封不動執行頁面第一段 <script>（計算引擎）。
// 測試透過「勾選選項／填入欄位 → 按下計算按鈕 → 讀取結果欄位文字」驗證頁面實際輸出。

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

// ---------- HTML 解析 ----------

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title']);

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos|nbsp);/g, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[e];
  });
}

function parseAttributes(src) {
  const attrs = new Map();
  const re = /([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1].toLowerCase();
    if (attrs.has(name)) continue;
    const raw = m[2] ?? m[3] ?? m[4] ?? '';
    attrs.set(name, decodeEntities(raw));
  }
  return attrs;
}

function parseInto(parent, html, doc) {
  const tagRe = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>|<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/gi;
  const stack = [parent];
  let last = 0;
  let m;
  const top = () => stack[stack.length - 1];
  const text = s => { if (s) top().appendChild(new TextNode(decodeEntities(s), doc)); };
  while ((m = tagRe.exec(html))) {
    text(html.slice(last, m.index));
    last = tagRe.lastIndex;
    if (m[0].startsWith('<!')) continue;
    if (m[1]) {
      const name = m[1].toLowerCase();
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i].tagName === name) { stack.length = i; break; }
      }
      continue;
    }
    const name = m[2].toLowerCase();
    const el = new Element(name, parseAttributes(m[3] || ''), doc);
    top().appendChild(el);
    if (RAW_TEXT.has(name)) {
      const close = new RegExp(`</${name}\\s*>`, 'ig');
      close.lastIndex = last;
      const c = close.exec(html);
      const end = c ? c.index : html.length;
      const inner = html.slice(last, end);
      if (inner) el.appendChild(new TextNode(name === 'script' || name === 'style' ? inner : decodeEntities(inner), doc));
      last = tagRe.lastIndex = c ? close.lastIndex : html.length;
      continue;
    }
    if (!VOID.has(name) && !m[4]) stack.push(el);
  }
  text(html.slice(last));
}

// ---------- 極簡 DOM ----------

class TextNode {
  constructor(value, doc) { this.nodeType = 3; this.nodeValue = value; this.parentNode = null; this.ownerDocument = doc; }
  get textContent() { return this.nodeValue; }
}

function camelToData(key) { return 'data-' + key.replace(/[A-Z]/g, c => '-' + c.toLowerCase()); }

class Element {
  constructor(tagName, attrs, doc) {
    this.nodeType = 1;
    this.tagName = tagName;
    this.attrs = attrs || new Map();
    this.childNodes = [];
    this.parentNode = null;
    this.ownerDocument = doc;
    this.listeners = {};
    this.onclick = null;
    this.oninput = null;
    this.onchange = null;
    this._checked = this.attrs.has('checked');
    this._selected = this.attrs.has('selected');
    this._value = null;
    const el = this;
    this.dataset = new Proxy({}, {
      get(_, key) { return typeof key === 'string' ? el.getAttribute(camelToData(key)) ?? undefined : undefined; },
      set(_, key, v) { el.setAttribute(camelToData(key), String(v)); return true; },
    });
    this.classList = {
      contains: c => el.classNames().includes(c),
      add: (...cs) => { const s = new Set(el.classNames()); cs.forEach(c => s.add(c)); el.setAttribute('class', [...s].join(' ')); },
      remove: (...cs) => { el.setAttribute('class', el.classNames().filter(c => !cs.includes(c)).join(' ')); },
      toggle: c => { if (el.classList.contains(c)) { el.classList.remove(c); return false; } el.classList.add(c); return true; },
    };
  }

  classNames() { return (this.getAttribute('class') || '').split(/\s+/).filter(Boolean); }
  getAttribute(n) { return this.attrs.has(n) ? this.attrs.get(n) : null; }
  setAttribute(n, v) { this.attrs.set(n, String(v)); }
  hasAttribute(n) { return this.attrs.has(n); }
  removeAttribute(n) { this.attrs.delete(n); }
  appendChild(node) { node.parentNode = this; this.childNodes.push(node); return node; }
  get children() { return this.childNodes.filter(n => n.nodeType === 1); }
  get id() { return this.getAttribute('id') || ''; }
  get className() { return this.getAttribute('class') || ''; }
  get type() { return (this.getAttribute('type') || (this.tagName === 'input' ? 'text' : '')).toLowerCase(); }
  get name() { return this.getAttribute('name') || ''; }

  get hidden() { return this.attrs.has('hidden'); }
  set hidden(v) { if (v) this.attrs.set('hidden', ''); else this.attrs.delete('hidden'); }
  get disabled() { return this.attrs.has('disabled'); }
  set disabled(v) { if (v) this.attrs.set('disabled', ''); else this.attrs.delete('disabled'); }

  get checked() { return this._checked; }
  set checked(v) {
    v = Boolean(v);
    if (v && this.type === 'radio' && this.name) {
      for (const other of this.ownerDocument.documentElement.querySelectorAll('input')) {
        if (other.type === 'radio' && other.name === this.name) other._checked = false;
      }
    }
    this._checked = v;
  }
  get selected() { return this._selected; }
  set selected(v) { this._selected = Boolean(v); }

  get options() { return this.querySelectorAll('option'); }

  get value() {
    if (this.tagName === 'select') {
      const opts = this.options;
      const sel = opts.find(o => o.selected);
      if (sel) return sel.value;
      return this._noneSelected || !opts.length ? '' : opts[0].value;
    }
    if (this.tagName === 'option') return this.attrs.has('value') ? this.getAttribute('value') : this.textContent;
    if (this._value !== null) return this._value;
    return this.getAttribute('value') ?? (this.type === 'radio' || this.type === 'checkbox' ? 'on' : '');
  }
  set value(v) {
    v = String(v);
    if (this.tagName === 'select') {
      // 與瀏覽器相同：找不到相符 option 時，select.value 變成空字串
      for (const o of this.options) o.selected = false;
      const hit = this.options.find(o => o.value === v);
      if (hit) hit.selected = true;
      this._noneSelected = !hit;
      return;
    }
    if (this.tagName === 'input' && this.type === 'number') {
      // 與瀏覽器相同：type=number 只接受合法浮點數字串，否則清成空字串
      if (v !== '' && !/^-?(?:\d+|\d*\.\d+)(?:[eE][-+]?\d+)?$/.test(v)) v = '';
    }
    this._value = v;
  }

  get textContent() { return this.childNodes.map(n => n.textContent).join(''); }
  set textContent(v) { this.childNodes = []; if (v !== '' && v != null) this.appendChild(new TextNode(String(v), this.ownerDocument)); }
  get innerHTML() { return this._innerHTML ?? ''; }
  set innerHTML(html) { this._innerHTML = String(html); this.childNodes = []; parseInto(this, String(html), this.ownerDocument); }

  descendants() {
    const out = [];
    const walk = el => { for (const c of el.childNodes) if (c.nodeType === 1) { out.push(c); walk(c); } };
    walk(this);
    return out;
  }
  querySelectorAll(sel) {
    const groups = parseSelector(sel);
    return this.descendants().filter(el => groups.some(g => matchesComplex(el, g, this)));
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  matches(sel) { return parseSelector(sel).some(g => matchesComplex(this, g, null)); }
  closest(sel) {
    for (let el = this; el && el.nodeType === 1; el = el.parentNode) if (el.matches(sel)) return el;
    return null;
  }

  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatchEvent(type) {
    const event = { type, target: this, currentTarget: this, preventDefault() {} };
    const prop = this['on' + type];
    if (typeof prop === 'function') prop.call(this, event);
    const inline = this.getAttribute('on' + type);
    if (inline && typeof prop !== 'function') this.ownerDocument.runInline(inline, this, event);
    for (const fn of this.listeners[type] || []) fn.call(this, event);
  }
  click() { this.dispatchEvent('click'); }
}

// 支援本頁面用到的選擇器子集：tag、#id、.class、[attr]、[attr=v]、[attr="v"]、:checked、逗號、子孫組合
function parseSelector(sel) {
  return sel.split(',').map(s => s.trim()).filter(Boolean).map(group => {
    const parts = group.split(/\s+/);
    return parts.map(part => {
      const c = { tag: null, id: null, classes: [], attrs: [], checked: false };
      const re = /^([a-zA-Z][a-zA-Z0-9-]*)|#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]|:(checked)/g;
      let m;
      let consumed = 0;
      while ((m = re.exec(part)) && m[0] !== '') {
        if (m.index !== consumed) break;
        consumed = re.lastIndex;
        if (m[1]) c.tag = m[1].toLowerCase();
        else if (m[2]) c.id = m[2];
        else if (m[3]) c.classes.push(m[3]);
        else if (m[4]) c.attrs.push([m[4], m[5] ?? m[6] ?? m[7]]);
        else if (m[8]) c.checked = true;
      }
      if (consumed !== part.length) throw new Error(`harness: unsupported selector "${sel}"`);
      return c;
    });
  });
}

function matchesCompound(el, c) {
  if (c.tag && el.tagName !== c.tag) return false;
  if (c.id && el.id !== c.id) return false;
  for (const k of c.classes) if (!el.classList.contains(k)) return false;
  for (const [name, val] of c.attrs) {
    if (!el.hasAttribute(name)) return false;
    if (val !== undefined && el.getAttribute(name) !== val) return false;
  }
  if (c.checked && !(el.tagName === 'option' ? el.selected : el.checked)) return false;
  return true;
}

function matchesComplex(el, compounds, scope) {
  if (!matchesCompound(el, compounds[compounds.length - 1])) return false;
  let i = compounds.length - 2;
  let anc = el.parentNode;
  while (i >= 0 && anc && anc.nodeType === 1 && anc !== scope) {
    if (matchesCompound(anc, compounds[i])) i -= 1;
    anc = anc.parentNode;
  }
  return i < 0;
}

class Document {
  constructor(html) {
    this.documentElement = new Element('#root', new Map(), this);
    parseInto(this.documentElement, html, this);
    this.runInline = () => { throw new Error('harness: context not attached'); };
  }
  querySelectorAll(sel) { return this.documentElement.querySelectorAll(sel); }
  querySelector(sel) { return this.documentElement.querySelector(sel); }
  getElementById(id) { return this.documentElement.descendants().find(e => e.id === id) || null; }
  get title() { const t = this.querySelector('title'); return t ? t.textContent : ''; }
}

// ---------- 載入頁面 ----------

function loadPage(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const doc = new Document(html);
  const scripts = doc.querySelectorAll('script');
  if (scripts.length < 1) throw new Error(`${file}: no <script>`);
  const engine = scripts[0].textContent;
  const ctx = vm.createContext({ document: doc, console });
  doc.runInline = (code, el, event) => {
    ctx.__harnessEl = el;
    ctx.__harnessEvent = event;
    vm.runInContext(`(function(event){${code}\n}).call(__harnessEl, __harnessEvent)`, ctx);
  };
  vm.runInContext(engine, ctx, { filename: file });
  // 以 JSON 複製一份到測試端（避免跨 vm realm 的物件比較問題）；頁面本身仍使用自己的那份
  const defs = JSON.parse(vm.runInContext('JSON.stringify(typeof DEFS !== "undefined" ? DEFS : CALCULATORS)', ctx));
  return new Page(file, doc, ctx, defs);
}

function page(file) {
  // 每次呼叫都回傳全新載入的頁面，避免測試之間互相污染
  return loadPage(file);
}

class Page {
  constructor(file, doc, ctx, defs) {
    this.file = file;
    this.doc = doc;
    this.ctx = ctx;
    this.defs = defs;
    this.engine = defs === undefined ? null : (vm.runInContext('typeof DEFS !== "undefined"', ctx) ? 'shared' : 'ten');
  }

  def(slug) {
    const d = this.defs.find(x => x.slug === slug);
    if (!d) throw new Error(`${this.file}: unknown slug ${slug}`);
    return d;
  }

  card(slug) {
    const c = this.doc.querySelector(`[data-slug="${slug}"]`);
    if (!c) throw new Error(`${this.file}: no card ${slug}`);
    return c;
  }

  radioGroup(slug, itemIndex) {
    const c = this.card(slug);
    for (const name of [`${slug}_${itemIndex}`, `${slug}__${itemIndex}`]) {
      const radios = c.querySelectorAll(`input[name="${name}"]`);
      if (radios.length) return radios;
    }
    throw new Error(`${slug}: no radio group for item ${itemIndex}`);
  }

  // 依「選項序號」勾選；null/undefined 代表該題不作答（測缺值）
  choose(slug, optionIndices) {
    optionIndices.forEach((opt, i) => {
      if (opt === null || opt === undefined) return;
      const radios = this.radioGroup(slug, i);
      if (!radios[opt]) throw new Error(`${slug}: item ${i} has no option ${opt}`);
      radios[opt].checked = true;
      radios[opt].dispatchEvent('input');
      radios[opt].dispatchEvent('change');
    });
  }

  // 規則型（rule_any）：每項 Yes/No
  chooseRule(slug, yesNo) {
    const c = this.card(slug);
    yesNo.forEach((ans, i) => {
      if (ans === null || ans === undefined) return;
      const r = c.querySelector(`input[name="${slug}_rule_${i}"][value="${ans ? 'Yes' : 'No'}"]`);
      if (!r) throw new Error(`${slug}: rule item ${i} missing`);
      r.checked = true;
      r.dispatchEvent('change');
    });
  }

  // 填欄位：{ inputId: value }，依物件順序填入並觸發 input/change（與使用者操作相同）
  fill(slug, values) {
    const c = this.card(slug);
    for (const [id, v] of Object.entries(values)) {
      const e = c.querySelector(`[data-input-id="${id}"]`) || c.querySelector(`[data-applicability-id="${id}"]`);
      if (!e) throw new Error(`${slug}: no input ${id}`);
      e.value = v;
      e.dispatchEvent('input');
      e.dispatchEvent('change');
    }
  }

  // 適用條件全部填成「適用」的答案（各計算機定義中的 expected 值）
  fillApplicable(slug, overrides = {}) {
    const d = this.def(slug);
    const values = Object.fromEntries((d.applicability || []).map(a => [a.id, a.expected]));
    this.fill(slug, { ...values, ...overrides });
  }

  calculate(slug) {
    const btn = this.card(slug).querySelector('[data-action="calculate"]');
    if (!btn) throw new Error(`${slug}: no calculate button`);
    btn.click();
    return this.output(slug);
  }

  output(slug) {
    const c = this.card(slug);
    const text = sel => { const e = c.querySelector(sel); return e ? e.textContent : ''; };
    const out = c.querySelector('.out');
    const result = c.querySelector('[data-role="result"]');
    const shown = out ? out.classList.contains('show') : result ? !result.hidden : false;
    return {
      value: text('[data-role="value"]'),
      unit: text('[data-role="unit"]'),
      interpretation: text('[data-role="interpretation"]'),
      shown,
    };
  }

  // 一次完成：勾選＋（可選）欄位＋計算
  score(slug, optionIndices, values) {
    if (values) this.fill(slug, values);
    this.choose(slug, optionIndices);
    return this.calculate(slug);
  }

  rule(slug, yesNo, values) {
    if (values) this.fill(slug, values);
    this.chooseRule(slug, yesNo);
    return this.calculate(slug);
  }

  form(slug, values) {
    this.fill(slug, values);
    return this.calculate(slug);
  }

  // 決策樹：依序點擊畫面上按鈕文字（data-tree-choice），回傳最後輸出
  tree(slug, choices) {
    const c = this.card(slug);
    const reset = c.querySelector('[data-action="tree-reset"]');
    if (reset) reset.click();
    for (const choice of choices) {
      const btn = c.querySelector('.tree').querySelectorAll('button').find(b => b.getAttribute('data-tree-choice') === choice);
      if (!btn) {
        const avail = c.querySelector('.tree').querySelectorAll('button').map(b => b.getAttribute('data-tree-choice'));
        throw new Error(`${slug}: no tree choice "${choice}" (available: ${avail.join(' / ')})`);
      }
      btn.click();
    }
    return { ...this.output(slug), question: c.querySelector('.tree .ql') ? c.querySelector('.tree .ql').textContent : null };
  }

  // 列出某題各選項的分數（直接讀 HTML 上 radio 的 value，用來比對文獻權重）
  optionValues(slug, itemIndex) {
    return this.radioGroup(slug, itemIndex).map(r => r.value);
  }
}

const PAGES = ['calc-ten.html', 'calc-trauma.html', 'calc-cardio.html', 'calc-neuro.html', 'calc-peds.html', 'calc-triage.html', 'calc-resp.html', 'calc-tox.html', 'calc-gi.html'];

module.exports = { page, loadPage, PAGES, Document, ROOT };
