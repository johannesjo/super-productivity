(function () {
  const t = document.createElement('link').relList;
  if (t && t.supports && t.supports('modulepreload')) return;
  for (const s of document.querySelectorAll('link[rel="modulepreload"]')) i(s);
  new MutationObserver((s) => {
    for (const l of s)
      if (l.type === 'childList')
        for (const o of l.addedNodes)
          o.tagName === 'LINK' && o.rel === 'modulepreload' && i(o);
  }).observe(document, { childList: !0, subtree: !0 });
  function n(s) {
    const l = {};
    return (
      s.integrity && (l.integrity = s.integrity),
      s.referrerPolicy && (l.referrerPolicy = s.referrerPolicy),
      s.crossOrigin === 'use-credentials'
        ? (l.credentials = 'include')
        : s.crossOrigin === 'anonymous'
          ? (l.credentials = 'omit')
          : (l.credentials = 'same-origin'),
      l
    );
  }
  function i(s) {
    if (s.ep) return;
    s.ep = !0;
    const l = n(s);
    fetch(s.href, l);
  }
})();
const Be = !0,
  Ue = (e, t) => e === t,
  Ve = Symbol('solid-track'),
  Re = Symbol('solid-dev-component'),
  Y = { equals: Ue };
let Se = $e;
const D = 1,
  z = 2,
  qe = {};
var g = null;
let ae = null,
  Ge = null,
  p = null,
  w = null,
  k = null,
  ne = 0;
function X(e, t) {
  const n = p,
    i = g,
    s = e.length === 0,
    l = t === void 0 ? i : t,
    o = s
      ? { owned: null, cleanups: null, context: null, owner: null }
      : { owned: null, cleanups: null, context: l ? l.context : null, owner: l },
    r = s
      ? () =>
          e(() => {
            throw new Error(
              'Dispose method must be an explicit argument to createRoot function',
            );
          })
      : () => e(() => L(() => G(o)));
  (g = o), (p = null);
  try {
    return K(r, !0);
  } finally {
    (p = n), (g = i);
  }
}
function A(e, t) {
  t = t ? Object.assign({}, Y, t) : Y;
  const n = {
    value: e,
    observers: null,
    observerSlots: null,
    comparator: t.equals || void 0,
  };
  t.name && (n.name = t.name), t.internal ? (n.internal = !0) : Qe(n);
  const i = (s) => (typeof s == 'function' && (s = s(n.value)), Ae(n, s));
  return [Pe.bind(n), i];
}
function _(e, t, n) {
  const i = se(e, t, !1, D, n);
  B(i);
}
function Ke(e, t, n) {
  Se = ze;
  const i = se(e, t, !1, D, n);
  (i.user = !0), k ? k.push(i) : B(i);
}
function q(e, t, n) {
  n = n ? Object.assign({}, Y, n) : Y;
  const i = se(e, t, !0, 0, n);
  return (
    (i.observers = null),
    (i.observerSlots = null),
    (i.comparator = n.equals || void 0),
    B(i),
    Pe.bind(i)
  );
}
function L(e) {
  if (p === null) return e();
  const t = p;
  p = null;
  try {
    return e();
  } finally {
    p = t;
  }
}
function He(e) {
  Ke(() => L(e));
}
function Je(e) {
  return (
    g === null
      ? console.warn(
          'cleanups created outside a `createRoot` or `render` will never be run',
        )
      : g.cleanups === null
        ? (g.cleanups = [e])
        : g.cleanups.push(e),
    e
  );
}
function We(e, t) {
  const n = se(() => L(() => (Object.assign(e, { [Re]: !0 }), e(t))), void 0, !0, 0);
  return (
    (n.props = t),
    (n.observers = null),
    (n.observerSlots = null),
    (n.name = e.name),
    (n.component = e),
    B(n),
    n.tValue !== void 0 ? n.tValue : n.value
  );
}
function Qe(e) {
  g && (g.sourceMap ? g.sourceMap.push(e) : (g.sourceMap = [e]), (e.graph = g));
}
function Pe() {
  if (this.sources && this.state)
    if (this.state === D) B(this);
    else {
      const e = w;
      (w = null), K(() => ee(this), !1), (w = e);
    }
  if (p) {
    const e = this.observers ? this.observers.length : 0;
    p.sources
      ? (p.sources.push(this), p.sourceSlots.push(e))
      : ((p.sources = [this]), (p.sourceSlots = [e])),
      this.observers
        ? (this.observers.push(p), this.observerSlots.push(p.sources.length - 1))
        : ((this.observers = [p]), (this.observerSlots = [p.sources.length - 1]));
  }
  return this.value;
}
function Ae(e, t, n) {
  let i = e.value;
  return (
    (!e.comparator || !e.comparator(i, t)) &&
      ((e.value = t),
      e.observers &&
        e.observers.length &&
        K(() => {
          for (let s = 0; s < e.observers.length; s += 1) {
            const l = e.observers[s],
              o = ae && ae.running;
            o && ae.disposed.has(l),
              (o ? !l.tState : !l.state) &&
                (l.pure ? w.push(l) : k.push(l), l.observers && Te(l)),
              o || (l.state = D);
          }
          if (w.length > 1e6)
            throw (
              ((w = []),
              Be ? new Error('Potential Infinite Loop Detected.') : new Error())
            );
        }, !1)),
    t
  );
}
function B(e) {
  if (!e.fn) return;
  G(e);
  const t = ne;
  Xe(e, e.value, t);
}
function Xe(e, t, n) {
  let i;
  const s = g,
    l = p;
  p = g = e;
  try {
    i = e.fn(t);
  } catch (o) {
    return (
      e.pure && ((e.state = D), e.owned && e.owned.forEach(G), (e.owned = null)),
      (e.updatedAt = n + 1),
      xe(o)
    );
  } finally {
    (p = l), (g = s);
  }
  (!e.updatedAt || e.updatedAt <= n) &&
    (e.updatedAt != null && 'observers' in e ? Ae(e, i) : (e.value = i),
    (e.updatedAt = n));
}
function se(e, t, n, i = D, s) {
  const l = {
    fn: e,
    state: i,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value: t,
    owner: g,
    context: g ? g.context : null,
    pure: n,
  };
  return (
    g === null
      ? console.warn(
          'computations created outside a `createRoot` or `render` will never be disposed',
        )
      : g !== qe && (g.owned ? g.owned.push(l) : (g.owned = [l])),
    s && s.name && (l.name = s.name),
    l
  );
}
function Z(e) {
  if (e.state === 0) return;
  if (e.state === z) return ee(e);
  if (e.suspense && L(e.suspense.inFallback)) return e.suspense.effects.push(e);
  const t = [e];
  for (; (e = e.owner) && (!e.updatedAt || e.updatedAt < ne); ) e.state && t.push(e);
  for (let n = t.length - 1; n >= 0; n--)
    if (((e = t[n]), e.state === D)) B(e);
    else if (e.state === z) {
      const i = w;
      (w = null), K(() => ee(e, t[0]), !1), (w = i);
    }
}
function K(e, t) {
  if (w) return e();
  let n = !1;
  t || (w = []), k ? (n = !0) : (k = []), ne++;
  try {
    const i = e();
    return Ye(n), i;
  } catch (i) {
    n || (k = null), (w = null), xe(i);
  }
}
function Ye(e) {
  if ((w && ($e(w), (w = null)), e)) return;
  const t = k;
  (k = null), t.length && K(() => Se(t), !1);
}
function $e(e) {
  for (let t = 0; t < e.length; t++) Z(e[t]);
}
function ze(e) {
  let t,
    n = 0;
  for (t = 0; t < e.length; t++) {
    const i = e[t];
    i.user ? (e[n++] = i) : Z(i);
  }
  for (t = 0; t < n; t++) Z(e[t]);
}
function ee(e, t) {
  e.state = 0;
  for (let n = 0; n < e.sources.length; n += 1) {
    const i = e.sources[n];
    if (i.sources) {
      const s = i.state;
      s === D
        ? i !== t && (!i.updatedAt || i.updatedAt < ne) && Z(i)
        : s === z && ee(i, t);
    }
  }
}
function Te(e) {
  for (let t = 0; t < e.observers.length; t += 1) {
    const n = e.observers[t];
    n.state || ((n.state = z), n.pure ? w.push(n) : k.push(n), n.observers && Te(n));
  }
}
function G(e) {
  let t;
  if (e.sources)
    for (; e.sources.length; ) {
      const n = e.sources.pop(),
        i = e.sourceSlots.pop(),
        s = n.observers;
      if (s && s.length) {
        const l = s.pop(),
          o = n.observerSlots.pop();
        i < s.length && ((l.sourceSlots[o] = i), (s[i] = l), (n.observerSlots[i] = o));
      }
    }
  if (e.tOwned) {
    for (t = e.tOwned.length - 1; t >= 0; t--) G(e.tOwned[t]);
    delete e.tOwned;
  }
  if (e.owned) {
    for (t = e.owned.length - 1; t >= 0; t--) G(e.owned[t]);
    e.owned = null;
  }
  if (e.cleanups) {
    for (t = e.cleanups.length - 1; t >= 0; t--) e.cleanups[t]();
    e.cleanups = null;
  }
  (e.state = 0), delete e.sourceMap;
}
function Ze(e) {
  return e instanceof Error
    ? e
    : new Error(typeof e == 'string' ? e : 'Unknown error', { cause: e });
}
function xe(e, t = g) {
  throw Ze(e);
}
const et = Symbol('fallback');
function we(e) {
  for (let t = 0; t < e.length; t++) e[t]();
}
function tt(e, t, n = {}) {
  let i = [],
    s = [],
    l = [],
    o = 0,
    r = t.length > 1 ? [] : null;
  return (
    Je(() => we(l)),
    () => {
      let c = e() || [],
        f = c.length,
        h,
        a;
      return (
        c[Ve],
        L(() => {
          let y, T, I, O, M, m, S, P, x;
          if (f === 0)
            o !== 0 && (we(l), (l = []), (i = []), (s = []), (o = 0), r && (r = [])),
              n.fallback &&
                ((i = [et]), (s[0] = X((ie) => ((l[0] = ie), n.fallback()))), (o = 1));
          else if (o === 0) {
            for (s = new Array(f), a = 0; a < f; a++) (i[a] = c[a]), (s[a] = X(b));
            o = f;
          } else {
            for (
              I = new Array(f),
                O = new Array(f),
                r && (M = new Array(f)),
                m = 0,
                S = Math.min(o, f);
              m < S && i[m] === c[m];
              m++
            );
            for (S = o - 1, P = f - 1; S >= m && P >= m && i[S] === c[P]; S--, P--)
              (I[P] = s[S]), (O[P] = l[S]), r && (M[P] = r[S]);
            for (y = new Map(), T = new Array(P + 1), a = P; a >= m; a--)
              (x = c[a]), (h = y.get(x)), (T[a] = h === void 0 ? -1 : h), y.set(x, a);
            for (h = m; h <= S; h++)
              (x = i[h]),
                (a = y.get(x)),
                a !== void 0 && a !== -1
                  ? ((I[a] = s[h]),
                    (O[a] = l[h]),
                    r && (M[a] = r[h]),
                    (a = T[a]),
                    y.set(x, a))
                  : l[h]();
            for (a = m; a < f; a++)
              a in I
                ? ((s[a] = I[a]), (l[a] = O[a]), r && ((r[a] = M[a]), r[a](a)))
                : (s[a] = X(b));
            (s = s.slice(0, (o = f))), (i = c.slice(0));
          }
          return s;
        })
      );
      function b(y) {
        if (((l[a] = y), r)) {
          const [T, I] = A(a, { name: 'index' });
          return (r[a] = I), t(c[a], T);
        }
        return t(c[a]);
      }
    }
  );
}
function R(e, t) {
  return We(e, t || {});
}
const nt = (e) =>
  `Attempting to access a stale value from <${e}> that could possibly be undefined. This may occur because you are reading the accessor returned from the component at a time where it has already been unmounted. We recommend cleaning up any stale timers or async, or reading from the initial condition.`;
function st(e) {
  const t = 'fallback' in e && { fallback: () => e.fallback };
  return q(
    tt(() => e.each, e.children, t || void 0),
    void 0,
    { name: 'value' },
  );
}
function ce(e) {
  const t = e.keyed,
    n = q(() => e.when, void 0, { name: 'condition value' }),
    i = t ? n : q(n, void 0, { equals: (s, l) => !s == !l, name: 'condition' });
  return q(
    () => {
      const s = i();
      if (s) {
        const l = e.children;
        return typeof l == 'function' && l.length > 0
          ? L(() =>
              l(
                t
                  ? s
                  : () => {
                      if (!L(i)) throw nt('Show');
                      return n();
                    },
              ),
            )
          : l;
      }
      return e.fallback;
    },
    void 0,
    { name: 'value' },
  );
}
globalThis &&
  (globalThis.Solid$$
    ? console.warn(
        'You appear to have multiple instances of Solid. This can lead to unexpected behavior.',
      )
    : (globalThis.Solid$$ = !0));
const it = (e) => q(() => e());
function lt(e, t, n) {
  let i = n.length,
    s = t.length,
    l = i,
    o = 0,
    r = 0,
    c = t[s - 1].nextSibling,
    f = null;
  for (; o < s || r < l; ) {
    if (t[o] === n[r]) {
      o++, r++;
      continue;
    }
    for (; t[s - 1] === n[l - 1]; ) s--, l--;
    if (s === o) {
      const h = l < i ? (r ? n[r - 1].nextSibling : n[l - r]) : c;
      for (; r < l; ) e.insertBefore(n[r++], h);
    } else if (l === r) for (; o < s; ) (!f || !f.has(t[o])) && t[o].remove(), o++;
    else if (t[o] === n[l - 1] && n[r] === t[s - 1]) {
      const h = t[--s].nextSibling;
      e.insertBefore(n[r++], t[o++].nextSibling),
        e.insertBefore(n[--l], h),
        (t[s] = n[l]);
    } else {
      if (!f) {
        f = new Map();
        let a = r;
        for (; a < l; ) f.set(n[a], a++);
      }
      const h = f.get(t[o]);
      if (h != null)
        if (r < h && h < l) {
          let a = o,
            b = 1,
            y;
          for (; ++a < s && a < l && !((y = f.get(t[a])) == null || y !== h + b); ) b++;
          if (b > h - r) {
            const T = t[o];
            for (; r < h; ) e.insertBefore(n[r++], T);
          } else e.replaceChild(n[r++], t[o++]);
        } else o++;
      else t[o++].remove();
    }
  }
}
const be = '_$DX_DELEGATE';
function rt(e, t, n, i = {}) {
  if (!t)
    throw new Error(
      "The `element` passed to `render(..., element)` doesn't exist. Make sure `element` exists in the document.",
    );
  let s;
  return (
    X((l) => {
      (s = l), t === document ? e() : $(t, e(), t.firstChild ? null : void 0, n);
    }, i.owner),
    () => {
      s(), (t.textContent = '');
    }
  );
}
function H(e, t, n, i) {
  let s;
  const l = () => {
      const r = document.createElement('template');
      return (r.innerHTML = e), r.content.firstChild;
    },
    o = () => (s || (s = l())).cloneNode(!0);
  return (o.cloneNode = o), o;
}
function ot(e, t = window.document) {
  const n = t[be] || (t[be] = new Set());
  for (let i = 0, s = e.length; i < s; i++) {
    const l = e[i];
    n.has(l) || (n.add(l), t.addEventListener(l, ct));
  }
}
function at(e, t) {
  t == null ? e.removeAttribute('class') : (e.className = t);
}
function $(e, t, n, i) {
  if ((n !== void 0 && !i && (i = []), typeof t != 'function')) return te(e, t, i, n);
  _((s) => te(e, t(), s, n), i);
}
function ct(e) {
  let t = e.target;
  const n = `$$${e.type}`,
    i = e.target,
    s = e.currentTarget,
    l = (c) => Object.defineProperty(e, 'target', { configurable: !0, value: c }),
    o = () => {
      const c = t[n];
      if (c && !t.disabled) {
        const f = t[`${n}Data`];
        if ((f !== void 0 ? c.call(t, f, e) : c.call(t, e), e.cancelBubble)) return;
      }
      return (
        t.host &&
          typeof t.host != 'string' &&
          !t.host._$host &&
          t.contains(e.target) &&
          l(t.host),
        !0
      );
    },
    r = () => {
      for (; o() && (t = t._$host || t.parentNode || t.host); );
    };
  if (
    (Object.defineProperty(e, 'currentTarget', {
      configurable: !0,
      get() {
        return t || document;
      },
    }),
    e.composedPath)
  ) {
    const c = e.composedPath();
    l(c[0]);
    for (let f = 0; f < c.length - 2 && ((t = c[f]), !!o()); f++) {
      if (t._$host) {
        (t = t._$host), r();
        break;
      }
      if (t.parentNode === s) break;
    }
  } else r();
  l(i);
}
function te(e, t, n, i, s) {
  for (; typeof n == 'function'; ) n = n();
  if (t === n) return n;
  const l = typeof t,
    o = i !== void 0;
  if (((e = (o && n[0] && n[0].parentNode) || e), l === 'string' || l === 'number')) {
    if (l === 'number' && ((t = t.toString()), t === n)) return n;
    if (o) {
      let r = n[0];
      r && r.nodeType === 3
        ? r.data !== t && (r.data = t)
        : (r = document.createTextNode(t)),
        (n = F(e, n, i, r));
    } else
      n !== '' && typeof n == 'string'
        ? (n = e.firstChild.data = t)
        : (n = e.textContent = t);
  } else if (t == null || l === 'boolean') n = F(e, n, i);
  else {
    if (l === 'function')
      return (
        _(() => {
          let r = t();
          for (; typeof r == 'function'; ) r = r();
          n = te(e, r, n, i);
        }),
        () => n
      );
    if (Array.isArray(t)) {
      const r = [],
        c = n && Array.isArray(n);
      if (fe(r, t, n, s)) return _(() => (n = te(e, r, n, i, !0))), () => n;
      if (r.length === 0) {
        if (((n = F(e, n, i)), o)) return n;
      } else c ? (n.length === 0 ? me(e, r, i) : lt(e, n, r)) : (n && F(e), me(e, r));
      n = r;
    } else if (t.nodeType) {
      if (Array.isArray(n)) {
        if (o) return (n = F(e, n, i, t));
        F(e, n, null, t);
      } else
        n == null || n === '' || !e.firstChild
          ? e.appendChild(t)
          : e.replaceChild(t, e.firstChild);
      n = t;
    } else console.warn('Unrecognized value. Skipped inserting', t);
  }
  return n;
}
function fe(e, t, n, i) {
  let s = !1;
  for (let l = 0, o = t.length; l < o; l++) {
    let r = t[l],
      c = n && n[e.length],
      f;
    if (!(r == null || r === !0 || r === !1))
      if ((f = typeof r) == 'object' && r.nodeType) e.push(r);
      else if (Array.isArray(r)) s = fe(e, r, c) || s;
      else if (f === 'function')
        if (i) {
          for (; typeof r == 'function'; ) r = r();
          s = fe(e, Array.isArray(r) ? r : [r], Array.isArray(c) ? c : [c]) || s;
        } else e.push(r), (s = !0);
      else {
        const h = String(r);
        c && c.nodeType === 3 && c.data === h
          ? e.push(c)
          : e.push(document.createTextNode(h));
      }
  }
  return s;
}
function me(e, t, n = null) {
  for (let i = 0, s = t.length; i < s; i++) e.insertBefore(t[i], n);
}
function F(e, t, n, i) {
  if (n === void 0) return (e.textContent = '');
  const s = i || document.createTextNode('');
  if (t.length) {
    let l = !1;
    for (let o = t.length - 1; o >= 0; o--) {
      const r = t[o];
      if (s !== r) {
        const c = r.parentNode === e;
        !l && !o ? (c ? e.replaceChild(s, r) : e.insertBefore(s, n)) : c && r.remove();
      } else l = !0;
    }
  } else e.insertBefore(s, n);
  return [s];
}
const ue = {
  getAllProjects: async () =>
    window.PluginAPI?.getAllProjects ? window.PluginAPI.getAllProjects() : [],
  getTasks: async () => (window.PluginAPI?.getTasks ? window.PluginAPI.getTasks() : []),
  addTask: async (e) => {
    if (window.PluginAPI?.addTask) return window.PluginAPI.addTask(e);
    throw new Error('PluginAPI.addTask not available');
  },
  updateTask: async (e, t) => {
    if (window.PluginAPI?.updateTask) return window.PluginAPI.updateTask(e, t);
    throw new Error('PluginAPI.updateTask not available');
  },
  persistDataSynced: async (e) => {
    if (window.PluginAPI?.persistDataSynced) return window.PluginAPI.persistDataSynced(e);
    throw new Error('PluginAPI.persistDataSynced not available');
  },
  loadSyncedData: async () =>
    window.PluginAPI?.loadSyncedData ? window.PluginAPI.loadSyncedData() : null,
  onMessage: (e) => {
    window.PluginAPI?.onMessage && window.PluginAPI.onMessage(e);
  },
};
var ut = H('<div>'),
  ft = H(
    '<div class=sync-info><h3>Sync Status</h3><div class=sync-item><span class=sync-item-label>Status:</span><span class=sync-item-value></span></div><div class=sync-item><span class=sync-item-label>Last sync:</span><span class=sync-item-value></span></div><div class=sync-item><span class=sync-item-label>Tasks synced:</span><span class=sync-item-value></span></div><div class=button-group><button class=btn-secondary>Sync Now',
  ),
  dt = H('<div class=preview-container><h3>File Preview</h3><pre>'),
  ht = H(
    '<div class=sync-md-app><h2>Sync.md Configuration</h2><div class=field-group><label for=filePath>Markdown File Path</label><input type=text id=filePath placeholder=/path/to/your/file.md><div class=help-text>Path to the markdown file to sync with</div></div><div class=field-group><label for=projectId>Project</label><select id=projectId><option value>Select a project...</option></select><div class=help-text>Tasks will be synced to this project</div></div><div class=field-group><label for=syncDirection>Sync Direction</label><select id=syncDirection><option value=bidirectional>Bidirectional (Two-way sync)</option><option value=fileToProject>File → Project only</option><option value=projectToFile>Project → File only</option></select><div class=help-text>Control how changes are synchronized</div></div><div class=button-group><button class=btn-primary>Save Configuration</button><button class=btn-secondary>Test Connection',
  ),
  gt = H('<option>');
const pt = () => {
  const [e, t] = A([]),
    [n, i] = A(null),
    [s, l] = A(''),
    [o, r] = A(''),
    [c, f] = A('bidirectional'),
    [h, a] = A(null),
    [b, y] = A(!1),
    [T, I] = A(null),
    [O, M] = A(0),
    [m, S] = A(null);
  He(async () => {
    await P();
  });
  const P = async () => {
      try {
        const u = await ue.getAllProjects();
        t(u);
        const C = await ue.loadSyncedData();
        if (C) {
          const j = JSON.parse(C);
          i(j),
            l(j.filePath || ''),
            r(j.projectId || ''),
            f(j.syncDirection || 'bidirectional'),
            await x();
        }
      } catch (u) {
        console.error('Failed to initialize:', u),
          v('Failed to initialize plugin', 'error');
      }
    },
    x = async () => {
      try {
        const u = await J({ type: 'getSyncInfo' });
        u && (I(u.lastSyncTime ? new Date(u.lastSyncTime) : null), M(u.taskCount || 0));
      } catch (u) {
        console.error('Failed to get sync info:', u);
      }
    },
    ie = async () => {
      if (!s() || !o()) {
        v('Please fill in all required fields', 'error');
        return;
      }
      const u = { filePath: s(), projectId: o(), syncDirection: c(), enabled: !0 };
      try {
        y(!0),
          await ue.persistDataSynced(JSON.stringify(u)),
          i(u),
          await J({ type: 'configUpdated', config: u }),
          v('Configuration saved successfully', 'success'),
          await x();
      } catch (C) {
        console.error('Failed to save config:', C),
          v('Failed to save configuration', 'error');
      } finally {
        y(!1);
      }
    },
    Ce = async () => {
      if (!s()) {
        v('Please enter a file path', 'error');
        return;
      }
      try {
        y(!0), v('Testing file access...', 'info');
        const u = await J({ type: 'testFile', filePath: s() });
        u?.success
          ? (v('File is accessible and valid!', 'success'), u.preview && S(u.preview))
          : v(u?.error || 'Failed to access file', 'error');
      } catch (u) {
        console.error('Test failed:', u), v('Test failed: ' + u.message, 'error');
      } finally {
        y(!1);
      }
    },
    Ee = async () => {
      try {
        y(!0), v('Syncing...', 'info');
        const u = await J({ type: 'syncNow' });
        u?.success
          ? (v('Sync completed successfully', 'success'), await x())
          : v(u?.error || 'Sync failed', 'error');
      } catch (u) {
        console.error('Sync failed:', u), v('Sync failed: ' + u.message, 'error');
      } finally {
        y(!1);
      }
    },
    J = async (u) => (
      console.log('Sending message to plugin:', u),
      new Promise((C) => {
        setTimeout(() => {
          C({ success: !0, message: 'Operation completed' });
        }, 500);
      })
    ),
    v = (u, C) => {
      a({ message: u, type: C }), setTimeout(() => a(null), 5e3);
    };
  return (() => {
    var u = ht(),
      C = u.firstChild,
      j = C.nextSibling,
      _e = j.firstChild,
      le = _e.nextSibling,
      de = j.nextSibling,
      Ie = de.firstChild,
      U = Ie.nextSibling;
    U.firstChild;
    var he = de.nextSibling,
      ke = he.firstChild,
      re = ke.nextSibling,
      De = he.nextSibling,
      oe = De.firstChild,
      ge = oe.nextSibling;
    return (
      (le.$$input = (d) => l(d.currentTarget.value)),
      U.addEventListener('change', (d) => r(d.currentTarget.value)),
      $(
        U,
        R(st, {
          get each() {
            return e();
          },
          children: (d) =>
            (() => {
              var E = gt();
              return $(E, () => d.title), _(() => (E.value = d.id)), E;
            })(),
        }),
        null,
      ),
      re.addEventListener('change', (d) => f(d.currentTarget.value)),
      (oe.$$click = ie),
      (ge.$$click = Ce),
      $(
        u,
        R(ce, {
          get when() {
            return h();
          },
          get children() {
            var d = ut();
            return $(d, () => h().message), _(() => at(d, `status ${h().type}`)), d;
          },
        }),
        null,
      ),
      $(
        u,
        R(ce, {
          get when() {
            return n();
          },
          get children() {
            var d = ft(),
              E = d.firstChild,
              N = E.nextSibling,
              W = N.firstChild,
              Q = W.nextSibling,
              V = N.nextSibling,
              je = V.firstChild,
              Ne = je.nextSibling,
              pe = V.nextSibling,
              Le = pe.firstChild,
              Oe = Le.nextSibling,
              Me = pe.nextSibling,
              ye = Me.firstChild;
            return (
              $(Q, () => (n()?.enabled ? 'Active' : 'Not configured')),
              $(
                Ne,
                (() => {
                  var Fe = it(() => !!T());
                  return () => (Fe() ? T().toLocaleString() : 'Never');
                })(),
              ),
              $(Oe, O),
              (ye.$$click = Ee),
              _(() => (ye.disabled = b())),
              d
            );
          },
        }),
        null,
      ),
      $(
        u,
        R(ce, {
          get when() {
            return m();
          },
          get children() {
            var d = dt(),
              E = d.firstChild,
              N = E.nextSibling;
            return $(N, m), d;
          },
        }),
        null,
      ),
      _(
        (d) => {
          var E = b(),
            N = b(),
            W = b(),
            Q = b(),
            V = b();
          return (
            E !== d.e && (le.disabled = d.e = E),
            N !== d.t && (U.disabled = d.t = N),
            W !== d.a && (re.disabled = d.a = W),
            Q !== d.o && (oe.disabled = d.o = Q),
            V !== d.i && (ge.disabled = d.i = V),
            d
          );
        },
        { e: void 0, t: void 0, a: void 0, o: void 0, i: void 0 },
      ),
      _(() => (le.value = s())),
      _(() => (U.value = o())),
      _(() => (re.value = c())),
      u
    );
  })();
};
ot(['input', 'click']);
const ve = document.getElementById('root');
ve && rt(() => R(pt, {}), ve);
