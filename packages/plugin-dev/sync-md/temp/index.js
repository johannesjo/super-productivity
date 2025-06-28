var Ke = Object.defineProperty;
var Ye = (e, t, s) =>
  t in e
    ? Ke(e, t, { enumerable: !0, configurable: !0, writable: !0, value: s })
    : (e[t] = s);
var z = (e, t, s) => Ye(e, typeof t != 'symbol' ? t + '' : t, s);
(function () {
  const t = document.createElement('link').relList;
  if (t && t.supports && t.supports('modulepreload')) return;
  for (const i of document.querySelectorAll('link[rel="modulepreload"]')) n(i);
  new MutationObserver((i) => {
    for (const r of i)
      if (r.type === 'childList')
        for (const o of r.addedNodes)
          o.tagName === 'LINK' && o.rel === 'modulepreload' && n(o);
  }).observe(document, { childList: !0, subtree: !0 });
  function s(i) {
    const r = {};
    return (
      i.integrity && (r.integrity = i.integrity),
      i.referrerPolicy && (r.referrerPolicy = i.referrerPolicy),
      i.crossOrigin === 'use-credentials'
        ? (r.credentials = 'include')
        : i.crossOrigin === 'anonymous'
          ? (r.credentials = 'omit')
          : (r.credentials = 'same-origin'),
      r
    );
  }
  function n(i) {
    if (i.ep) return;
    i.ep = !0;
    const r = s(i);
    fetch(i.href, r);
  }
})();
const He = !0,
  ze = (e, t) => e === t,
  Qe = Symbol('solid-track'),
  Xe = Symbol('solid-dev-component'),
  le = { equals: ze };
let xe = Ce;
const R = 1,
  ae = 2,
  Ze = {};
var p = null;
let Se = null,
  et = null,
  w = null,
  m = null,
  j = null,
  fe = 0;
function oe(e, t) {
  const s = w,
    n = p,
    i = e.length === 0,
    r = t === void 0 ? n : t,
    o = i
      ? { owned: null, cleanups: null, context: null, owner: null }
      : { owned: null, cleanups: null, context: r ? r.context : null, owner: r },
    l = i
      ? () =>
          e(() => {
            throw new Error(
              'Dispose method must be an explicit argument to createRoot function',
            );
          })
      : () => e(() => G(() => X(o)));
  (p = o), (w = null);
  try {
    return Z(l, !0);
  } finally {
    (w = s), (p = n);
  }
}
function T(e, t) {
  t = t ? Object.assign({}, le, t) : le;
  const s = {
    value: e,
    observers: null,
    observerSlots: null,
    comparator: t.equals || void 0,
  };
  t.name && (s.name = t.name), t.internal ? (s.internal = !0) : rt(s);
  const n = (i) => (typeof i == 'function' && (i = i(s.value)), De(s, i));
  return [Ne.bind(s), n];
}
function _(e, t, s) {
  const n = he(e, t, !1, R, s);
  V(n);
}
function tt(e, t, s) {
  xe = at;
  const n = he(e, t, !1, R, s);
  (n.user = !0), j ? j.push(n) : V(n);
}
function Q(e, t, s) {
  s = s ? Object.assign({}, le, s) : le;
  const n = he(e, t, !0, 0, s);
  return (
    (n.observers = null),
    (n.observerSlots = null),
    (n.comparator = s.equals || void 0),
    V(n),
    Ne.bind(n)
  );
}
function G(e) {
  if (w === null) return e();
  const t = w;
  w = null;
  try {
    return e();
  } finally {
    w = t;
  }
}
function st(e) {
  tt(() => G(e));
}
function nt(e) {
  return (
    p === null
      ? console.warn(
          'cleanups created outside a `createRoot` or `render` will never be run',
        )
      : p.cleanups === null
        ? (p.cleanups = [e])
        : p.cleanups.push(e),
    e
  );
}
function it(e, t) {
  const s = he(() => G(() => (Object.assign(e, { [Xe]: !0 }), e(t))), void 0, !0, 0);
  return (
    (s.props = t),
    (s.observers = null),
    (s.observerSlots = null),
    (s.name = e.name),
    (s.component = e),
    V(s),
    s.tValue !== void 0 ? s.tValue : s.value
  );
}
function rt(e) {
  p && (p.sourceMap ? p.sourceMap.push(e) : (p.sourceMap = [e]), (e.graph = p));
}
function Ne() {
  if (this.sources && this.state)
    if (this.state === R) V(this);
    else {
      const e = m;
      (m = null), Z(() => ue(this), !1), (m = e);
    }
  if (w) {
    const e = this.observers ? this.observers.length : 0;
    w.sources
      ? (w.sources.push(this), w.sourceSlots.push(e))
      : ((w.sources = [this]), (w.sourceSlots = [e])),
      this.observers
        ? (this.observers.push(w), this.observerSlots.push(w.sources.length - 1))
        : ((this.observers = [w]), (this.observerSlots = [w.sources.length - 1]));
  }
  return this.value;
}
function De(e, t, s) {
  let n = e.value;
  return (
    (!e.comparator || !e.comparator(n, t)) &&
      ((e.value = t),
      e.observers &&
        e.observers.length &&
        Z(() => {
          for (let i = 0; i < e.observers.length; i += 1) {
            const r = e.observers[i],
              o = Se && Se.running;
            o && Se.disposed.has(r),
              (o ? !r.tState : !r.state) &&
                (r.pure ? m.push(r) : j.push(r), r.observers && Fe(r)),
              o || (r.state = R);
          }
          if (m.length > 1e6)
            throw (
              ((m = []),
              He ? new Error('Potential Infinite Loop Detected.') : new Error())
            );
        }, !1)),
    t
  );
}
function V(e) {
  if (!e.fn) return;
  X(e);
  const t = fe;
  ot(e, e.value, t);
}
function ot(e, t, s) {
  let n;
  const i = p,
    r = w;
  w = p = e;
  try {
    n = e.fn(t);
  } catch (o) {
    return (
      e.pure && ((e.state = R), e.owned && e.owned.forEach(X), (e.owned = null)),
      (e.updatedAt = s + 1),
      Me(o)
    );
  } finally {
    (w = r), (p = i);
  }
  (!e.updatedAt || e.updatedAt <= s) &&
    (e.updatedAt != null && 'observers' in e ? De(e, n) : (e.value = n),
    (e.updatedAt = s));
}
function he(e, t, s, n = R, i) {
  const r = {
    fn: e,
    state: n,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value: t,
    owner: p,
    context: p ? p.context : null,
    pure: s,
  };
  return (
    p === null
      ? console.warn(
          'computations created outside a `createRoot` or `render` will never be disposed',
        )
      : p !== Ze && (p.owned ? p.owned.push(r) : (p.owned = [r])),
    i && i.name && (r.name = i.name),
    r
  );
}
function ce(e) {
  if (e.state === 0) return;
  if (e.state === ae) return ue(e);
  if (e.suspense && G(e.suspense.inFallback)) return e.suspense.effects.push(e);
  const t = [e];
  for (; (e = e.owner) && (!e.updatedAt || e.updatedAt < fe); ) e.state && t.push(e);
  for (let s = t.length - 1; s >= 0; s--)
    if (((e = t[s]), e.state === R)) V(e);
    else if (e.state === ae) {
      const n = m;
      (m = null), Z(() => ue(e, t[0]), !1), (m = n);
    }
}
function Z(e, t) {
  if (m) return e();
  let s = !1;
  t || (m = []), j ? (s = !0) : (j = []), fe++;
  try {
    const n = e();
    return lt(s), n;
  } catch (n) {
    s || (j = null), (m = null), Me(n);
  }
}
function lt(e) {
  if ((m && (Ce(m), (m = null)), e)) return;
  const t = j;
  (j = null), t.length && Z(() => xe(t), !1);
}
function Ce(e) {
  for (let t = 0; t < e.length; t++) ce(e[t]);
}
function at(e) {
  let t,
    s = 0;
  for (t = 0; t < e.length; t++) {
    const n = e[t];
    n.user ? (e[s++] = n) : ce(n);
  }
  for (t = 0; t < s; t++) ce(e[t]);
}
function ue(e, t) {
  e.state = 0;
  for (let s = 0; s < e.sources.length; s += 1) {
    const n = e.sources[s];
    if (n.sources) {
      const i = n.state;
      i === R
        ? n !== t && (!n.updatedAt || n.updatedAt < fe) && ce(n)
        : i === ae && ue(n, t);
    }
  }
}
function Fe(e) {
  for (let t = 0; t < e.observers.length; t += 1) {
    const s = e.observers[t];
    s.state || ((s.state = ae), s.pure ? m.push(s) : j.push(s), s.observers && Fe(s));
  }
}
function X(e) {
  let t;
  if (e.sources)
    for (; e.sources.length; ) {
      const s = e.sources.pop(),
        n = e.sourceSlots.pop(),
        i = s.observers;
      if (i && i.length) {
        const r = i.pop(),
          o = s.observerSlots.pop();
        n < i.length && ((r.sourceSlots[o] = n), (i[n] = r), (s.observerSlots[n] = o));
      }
    }
  if (e.tOwned) {
    for (t = e.tOwned.length - 1; t >= 0; t--) X(e.tOwned[t]);
    delete e.tOwned;
  }
  if (e.owned) {
    for (t = e.owned.length - 1; t >= 0; t--) X(e.owned[t]);
    e.owned = null;
  }
  if (e.cleanups) {
    for (t = e.cleanups.length - 1; t >= 0; t--) e.cleanups[t]();
    e.cleanups = null;
  }
  (e.state = 0), delete e.sourceMap;
}
function ct(e) {
  return e instanceof Error
    ? e
    : new Error(typeof e == 'string' ? e : 'Unknown error', { cause: e });
}
function Me(e, t = p) {
  throw ct(e);
}
const ut = Symbol('fallback');
function Te(e) {
  for (let t = 0; t < e.length; t++) e[t]();
}
function dt(e, t, s = {}) {
  let n = [],
    i = [],
    r = [],
    o = 0,
    l = t.length > 1 ? [] : null;
  return (
    nt(() => Te(r)),
    () => {
      let a = e() || [],
        d = a.length,
        f,
        c;
      return (
        a[Qe],
        G(() => {
          let g, v, A, L, $, S, k, x, O;
          if (d === 0)
            o !== 0 && (Te(r), (r = []), (n = []), (i = []), (o = 0), l && (l = [])),
              s.fallback &&
                ((n = [ut]), (i[0] = oe((pe) => ((r[0] = pe), s.fallback()))), (o = 1));
          else if (o === 0) {
            for (i = new Array(d), c = 0; c < d; c++) (n[c] = a[c]), (i[c] = oe(y));
            o = d;
          } else {
            for (
              A = new Array(d),
                L = new Array(d),
                l && ($ = new Array(d)),
                S = 0,
                k = Math.min(o, d);
              S < k && n[S] === a[S];
              S++
            );
            for (k = o - 1, x = d - 1; k >= S && x >= S && n[k] === a[x]; k--, x--)
              (A[x] = i[k]), (L[x] = r[k]), l && ($[x] = l[k]);
            for (g = new Map(), v = new Array(x + 1), c = x; c >= S; c--)
              (O = a[c]), (f = g.get(O)), (v[c] = f === void 0 ? -1 : f), g.set(O, c);
            for (f = S; f <= k; f++)
              (O = n[f]),
                (c = g.get(O)),
                c !== void 0 && c !== -1
                  ? ((A[c] = i[f]),
                    (L[c] = r[f]),
                    l && ($[c] = l[f]),
                    (c = v[c]),
                    g.set(O, c))
                  : r[f]();
            for (c = S; c < d; c++)
              c in A
                ? ((i[c] = A[c]), (r[c] = L[c]), l && ((l[c] = $[c]), l[c](c)))
                : (i[c] = oe(y));
            (i = i.slice(0, (o = d))), (n = a.slice(0));
          }
          return i;
        })
      );
      function y(g) {
        if (((r[c] = g), l)) {
          const [v, A] = T(c, { name: 'index' });
          return (l[c] = A), t(a[c], v);
        }
        return t(a[c]);
      }
    }
  );
}
function W(e, t) {
  return it(e, t || {});
}
const ft = (e) =>
  `Attempting to access a stale value from <${e}> that could possibly be undefined. This may occur because you are reading the accessor returned from the component at a time where it has already been unmounted. We recommend cleaning up any stale timers or async, or reading from the initial condition.`;
function ht(e) {
  const t = 'fallback' in e && { fallback: () => e.fallback };
  return Q(
    dt(() => e.each, e.children, t || void 0),
    void 0,
    { name: 'value' },
  );
}
function re(e) {
  const t = e.keyed,
    s = Q(() => e.when, void 0, { name: 'condition value' }),
    n = t ? s : Q(s, void 0, { equals: (i, r) => !i == !r, name: 'condition' });
  return Q(
    () => {
      const i = n();
      if (i) {
        const r = e.children;
        return typeof r == 'function' && r.length > 0
          ? G(() =>
              r(
                t
                  ? i
                  : () => {
                      if (!G(n)) throw ft('Show');
                      return s();
                    },
              ),
            )
          : r;
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
const pt = (e) => Q(() => e());
function gt(e, t, s) {
  let n = s.length,
    i = t.length,
    r = n,
    o = 0,
    l = 0,
    a = t[i - 1].nextSibling,
    d = null;
  for (; o < i || l < r; ) {
    if (t[o] === s[l]) {
      o++, l++;
      continue;
    }
    for (; t[i - 1] === s[r - 1]; ) i--, r--;
    if (i === o) {
      const f = r < n ? (l ? s[l - 1].nextSibling : s[r - l]) : a;
      for (; l < r; ) e.insertBefore(s[l++], f);
    } else if (r === l) for (; o < i; ) (!d || !d.has(t[o])) && t[o].remove(), o++;
    else if (t[o] === s[r - 1] && s[l] === t[i - 1]) {
      const f = t[--i].nextSibling;
      e.insertBefore(s[l++], t[o++].nextSibling),
        e.insertBefore(s[--r], f),
        (t[i] = s[r]);
    } else {
      if (!d) {
        d = new Map();
        let c = l;
        for (; c < r; ) d.set(s[c], c++);
      }
      const f = d.get(t[o]);
      if (f != null)
        if (l < f && f < r) {
          let c = o,
            y = 1,
            g;
          for (; ++c < i && c < r && !((g = d.get(t[c])) == null || g !== f + y); ) y++;
          if (y > f - l) {
            const v = t[o];
            for (; l < f; ) e.insertBefore(s[l++], v);
          } else e.replaceChild(s[l++], t[o++]);
        } else o++;
      else t[o++].remove();
    }
  }
}
const Ie = '_$DX_DELEGATE';
function wt(e, t, s, n = {}) {
  if (!t)
    throw new Error(
      "The `element` passed to `render(..., element)` doesn't exist. Make sure `element` exists in the document.",
    );
  let i;
  return (
    oe((r) => {
      (i = r), t === document ? e() : I(t, e(), t.firstChild ? null : void 0, s);
    }, n.owner),
    () => {
      i(), (t.textContent = '');
    }
  );
}
function J(e, t, s, n) {
  let i;
  const r = () => {
      const l = document.createElement('template');
      return (l.innerHTML = e), l.content.firstChild;
    },
    o = () => (i || (i = r())).cloneNode(!0);
  return (o.cloneNode = o), o;
}
function yt(e, t = window.document) {
  const s = t[Ie] || (t[Ie] = new Set());
  for (let n = 0, i = e.length; n < i; n++) {
    const r = e[n];
    s.has(r) || (s.add(r), t.addEventListener(r, St));
  }
}
function bt(e, t) {
  t == null ? e.removeAttribute('class') : (e.className = t);
}
function I(e, t, s, n) {
  if ((s !== void 0 && !n && (n = []), typeof t != 'function')) return de(e, t, n, s);
  _((i) => de(e, t(), i, s), n);
}
function St(e) {
  let t = e.target;
  const s = `$$${e.type}`,
    n = e.target,
    i = e.currentTarget,
    r = (a) => Object.defineProperty(e, 'target', { configurable: !0, value: a }),
    o = () => {
      const a = t[s];
      if (a && !t.disabled) {
        const d = t[`${s}Data`];
        if ((d !== void 0 ? a.call(t, d, e) : a.call(t, e), e.cancelBubble)) return;
      }
      return (
        t.host &&
          typeof t.host != 'string' &&
          !t.host._$host &&
          t.contains(e.target) &&
          r(t.host),
        !0
      );
    },
    l = () => {
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
    const a = e.composedPath();
    r(a[0]);
    for (let d = 0; d < a.length - 2 && ((t = a[d]), !!o()); d++) {
      if (t._$host) {
        (t = t._$host), l();
        break;
      }
      if (t.parentNode === i) break;
    }
  } else l();
  r(n);
}
function de(e, t, s, n, i) {
  for (; typeof s == 'function'; ) s = s();
  if (t === s) return s;
  const r = typeof t,
    o = n !== void 0;
  if (((e = (o && s[0] && s[0].parentNode) || e), r === 'string' || r === 'number')) {
    if (r === 'number' && ((t = t.toString()), t === s)) return s;
    if (o) {
      let l = s[0];
      l && l.nodeType === 3
        ? l.data !== t && (l.data = t)
        : (l = document.createTextNode(t)),
        (s = B(e, s, n, l));
    } else
      s !== '' && typeof s == 'string'
        ? (s = e.firstChild.data = t)
        : (s = e.textContent = t);
  } else if (t == null || r === 'boolean') s = B(e, s, n);
  else {
    if (r === 'function')
      return (
        _(() => {
          let l = t();
          for (; typeof l == 'function'; ) l = l();
          s = de(e, l, s, n);
        }),
        () => s
      );
    if (Array.isArray(t)) {
      const l = [],
        a = s && Array.isArray(s);
      if (me(l, t, s, i)) return _(() => (s = de(e, l, s, n, !0))), () => s;
      if (l.length === 0) {
        if (((s = B(e, s, n)), o)) return s;
      } else a ? (s.length === 0 ? Ae(e, l, n) : gt(e, s, l)) : (s && B(e), Ae(e, l));
      s = l;
    } else if (t.nodeType) {
      if (Array.isArray(s)) {
        if (o) return (s = B(e, s, n, t));
        B(e, s, null, t);
      } else
        s == null || s === '' || !e.firstChild
          ? e.appendChild(t)
          : e.replaceChild(t, e.firstChild);
      s = t;
    } else console.warn('Unrecognized value. Skipped inserting', t);
  }
  return s;
}
function me(e, t, s, n) {
  let i = !1;
  for (let r = 0, o = t.length; r < o; r++) {
    let l = t[r],
      a = s && s[e.length],
      d;
    if (!(l == null || l === !0 || l === !1))
      if ((d = typeof l) == 'object' && l.nodeType) e.push(l);
      else if (Array.isArray(l)) i = me(e, l, a) || i;
      else if (d === 'function')
        if (n) {
          for (; typeof l == 'function'; ) l = l();
          i = me(e, Array.isArray(l) ? l : [l], Array.isArray(a) ? a : [a]) || i;
        } else e.push(l), (i = !0);
      else {
        const f = String(l);
        a && a.nodeType === 3 && a.data === f
          ? e.push(a)
          : e.push(document.createTextNode(f));
      }
  }
  return i;
}
function Ae(e, t, s = null) {
  for (let n = 0, i = t.length; n < i; n++) e.insertBefore(t[n], s);
}
function B(e, t, s, n) {
  if (s === void 0) return (e.textContent = '');
  const i = n || document.createTextNode('');
  if (t.length) {
    let r = !1;
    for (let o = t.length - 1; o >= 0; o--) {
      const l = t[o];
      if (i !== l) {
        const a = l.parentNode === e;
        !r && !o ? (a ? e.replaceChild(i, l) : e.insertBefore(i, s)) : a && l.remove();
      } else r = !0;
    }
  } else e.insertBefore(i, s);
  return [i];
}
const P = {
  getAllProjects: async () => {
    var e;
    return (e = window.PluginAPI) != null && e.getAllProjects
      ? window.PluginAPI.getAllProjects()
      : [];
  },
  getTasks: async () => {
    var e;
    return (e = window.PluginAPI) != null && e.getTasks
      ? window.PluginAPI.getTasks()
      : [];
  },
  addTask: async (e) => {
    var t;
    if ((t = window.PluginAPI) != null && t.addTask) return window.PluginAPI.addTask(e);
    throw new Error('PluginAPI.addTask not available');
  },
  updateTask: async (e, t) => {
    var s;
    if ((s = window.PluginAPI) != null && s.updateTask)
      return window.PluginAPI.updateTask(e, t);
    throw new Error('PluginAPI.updateTask not available');
  },
  deleteTask: async (e) => {
    var t;
    if ((t = window.PluginAPI) != null && t.deleteTask)
      return window.PluginAPI.deleteTask(e);
    throw new Error('PluginAPI.deleteTask not available');
  },
  persistDataSynced: async (e) => {
    var t;
    if ((t = window.PluginAPI) != null && t.persistDataSynced)
      return window.PluginAPI.persistDataSynced(e);
    throw new Error('PluginAPI.persistDataSynced not available');
  },
  loadSyncedData: async () => {
    var e;
    return (e = window.PluginAPI) != null && e.loadSyncedData
      ? window.PluginAPI.loadSyncedData()
      : null;
  },
  onMessage: (e) => {
    var t;
    (t = window.PluginAPI) != null && t.onMessage && window.PluginAPI.onMessage(e);
  },
  executeNodeScript: async (e) => {
    var t;
    if ((t = window.PluginAPI) != null && t.executeNodeScript)
      return window.PluginAPI.executeNodeScript(e);
    throw new Error('PluginAPI.executeNodeScript not available');
  },
};
var mt = J(
    '<div class="status error">This plugin requires the desktop version of Super Productivity to access local files. Please use the Electron app instead of the web version.',
  ),
  vt = J('<div>'),
  Pt = J(
    '<div class=sync-info><h3>Sync Status</h3><div class=sync-item><span class=sync-item-label>Status:</span><span class=sync-item-value></span></div><div class=sync-item><span class=sync-item-label>Last sync:</span><span class=sync-item-value></span></div><div class=sync-item><span class=sync-item-label>Tasks synced:</span><span class=sync-item-value></span></div><div class=button-group><button class=btn-secondary>Sync Now',
  ),
  kt = J('<div class=preview-container><h3>File Preview</h3><pre>'),
  Et = J(
    '<div class=sync-md-app><h2>Sync.md Configuration</h2><div class=field-group><label for=filePath>Markdown File Path</label><input type=text id=filePath placeholder=/path/to/your/file.md><div class=help-text>Path to the markdown file to sync with</div></div><div class=field-group><label for=projectId>Project</label><select id=projectId><option value>Select a project...</option></select><div class=help-text>Tasks will be synced to this project</div></div><div class=field-group><label for=syncDirection>Sync Direction</label><select id=syncDirection><option value=bidirectional>Bidirectional (Two-way sync)</option><option value=fileToProject>File → Project only</option><option value=projectToFile>Project → File only</option></select><div class=help-text>Control how changes are synchronized</div></div><div class=button-group><button class=btn-primary>Save Configuration</button><button class=btn-secondary>Test Connection</button><button class=btn-secondary>Test Node Script',
  ),
  Tt = J('<option>');
const It = () => {
  const [e, t] = T([]),
    [s, n] = T(null),
    [i, r] = T(''),
    [o, l] = T(''),
    [a, d] = T('bidirectional'),
    [f, c] = T(null),
    [y, g] = T(!1),
    [v, A] = T(null),
    [L, $] = T(0),
    [S, k] = T(null),
    [x, O] = T(!0);
  st(async () => {
    await pe();
  });
  const pe = async () => {
      try {
        const u = await K({ type: 'checkDesktopMode' });
        O((u == null ? void 0 : u.isDesktop) !== !1);
        const N = await P.getAllProjects();
        t(N);
        const F = await P.loadSyncedData();
        if (F) {
          const D = JSON.parse(F);
          n(D),
            r(D.filePath || ''),
            l(D.projectId || ''),
            d(D.syncDirection || 'bidirectional'),
            await ge();
        }
      } catch (u) {
        console.error('Failed to initialize:', u),
          b('Failed to initialize plugin', 'error');
      }
    },
    ge = async () => {
      try {
        const u = await K({ type: 'getSyncInfo' });
        u && (A(u.lastSyncTime ? new Date(u.lastSyncTime) : null), $(u.taskCount || 0));
      } catch (u) {
        console.error('Failed to get sync info:', u);
      }
    },
    Le = async () => {
      if (!i() || !o()) {
        b('Please fill in all required fields', 'error');
        return;
      }
      const u = { filePath: i(), projectId: o(), syncDirection: a(), enabled: !0 };
      try {
        g(!0),
          await P.persistDataSynced(JSON.stringify(u)),
          n(u),
          await K({ type: 'configUpdated', config: u }),
          b('Configuration saved successfully', 'success'),
          await ge();
      } catch (N) {
        console.error('Failed to save config:', N),
          b('Failed to save configuration', 'error');
      } finally {
        g(!1);
      }
    },
    Oe = async () => {
      if (!i()) {
        b('Please enter a file path', 'error');
        return;
      }
      try {
        g(!0), b('Testing file access...', 'info');
        const u = await K({ type: 'testFile', filePath: i() });
        u != null && u.success
          ? (b('File is accessible and valid!', 'success'), u.preview && k(u.preview))
          : b((u == null ? void 0 : u.error) || 'Failed to access file', 'error');
      } catch (u) {
        console.error('Test failed:', u), b('Test failed: ' + u.message, 'error');
      } finally {
        g(!1);
      }
    },
    Ue = async () => {
      try {
        g(!0), b('Testing node script execution...', 'info');
        const u = await P.executeNodeScript({
          script: `
          const fs = require('fs');
          const path = require('path');
          
          // Test basic operations
          const testData = {
            message: 'Node script execution works!',
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            platform: process.platform,
            canAccessFs: typeof fs.readFileSync === 'function',
            canAccessPath: typeof path.join === 'function'
          };
          
          return testData;
        `,
          timeout: 5e3,
        });
        u.success
          ? (console.log('Node script test result:', u.result),
            b(`Success! Node ${u.result.nodeVersion} on ${u.result.platform}`, 'success'))
          : b(`Node script test failed: ${u.error}`, 'error');
      } catch (u) {
        console.error('Node script test failed:', u),
          b('Node script test failed: ' + u.message, 'error');
      } finally {
        g(!1);
      }
    },
    Re = async () => {
      try {
        g(!0), b('Syncing...', 'info');
        const u = await K({ type: 'syncNow' });
        u != null && u.success
          ? (b('Sync completed successfully', 'success'), await ge())
          : b((u == null ? void 0 : u.error) || 'Sync failed', 'error');
      } catch (u) {
        console.error('Sync failed:', u), b('Sync failed: ' + u.message, 'error');
      } finally {
        g(!1);
      }
    },
    K = async (u) => (
      console.log('Sending message to plugin:', u),
      new Promise((N) => {
        const F = Date.now().toString(),
          D = (E) => {
            var Y, ee, U;
            console.log('Received message event:', E.data),
              ((Y = E.data) == null ? void 0 : Y.messageId) === F
                ? (window.removeEventListener('message', D), N(E.data.response || E.data))
                : ((ee = E.data) == null ? void 0 : ee.type) ===
                    'PLUGIN_MESSAGE_RESPONSE' &&
                  ((U = E.data) == null ? void 0 : U.messageId) === F &&
                  (window.removeEventListener('message', D),
                  N(E.data.response || E.data.result));
          };
        window.addEventListener('message', D),
          window.parent.postMessage(
            { type: 'PLUGIN_MESSAGE', message: u, messageId: F },
            '*',
          ),
          setTimeout(() => {
            window.removeEventListener('message', D),
              N({ success: !1, error: 'Request timeout' });
          }, 1e4);
      })
    ),
    b = (u, N) => {
      c({ message: u, type: N }), setTimeout(() => c(null), 5e3);
    };
  return (() => {
    var u = Et(),
      N = u.firstChild,
      F = N.nextSibling,
      D = F.firstChild,
      E = D.nextSibling,
      Y = F.nextSibling,
      ee = Y.firstChild,
      U = ee.nextSibling;
    U.firstChild;
    var ve = Y.nextSibling,
      qe = ve.firstChild,
      we = qe.nextSibling,
      Ge = ve.nextSibling,
      ye = Ge.firstChild,
      be = ye.nextSibling,
      Pe = be.nextSibling;
    return (
      I(
        u,
        W(re, {
          get when() {
            return !x();
          },
          get children() {
            return mt();
          },
        }),
        F,
      ),
      (E.$$input = (h) => r(h.currentTarget.value)),
      U.addEventListener('change', (h) => l(h.currentTarget.value)),
      I(
        U,
        W(ht, {
          get each() {
            return e();
          },
          children: (h) =>
            (() => {
              var M = Tt();
              return I(M, () => h.title), _(() => (M.value = h.id)), M;
            })(),
        }),
        null,
      ),
      we.addEventListener('change', (h) => d(h.currentTarget.value)),
      (ye.$$click = Le),
      (be.$$click = Oe),
      (Pe.$$click = Ue),
      I(
        u,
        W(re, {
          get when() {
            return f();
          },
          get children() {
            var h = vt();
            return I(h, () => f().message), _(() => bt(h, `status ${f().type}`)), h;
          },
        }),
        null,
      ),
      I(
        u,
        W(re, {
          get when() {
            return s();
          },
          get children() {
            var h = Pt(),
              M = h.firstChild,
              q = M.nextSibling,
              te = q.firstChild,
              se = te.nextSibling,
              H = q.nextSibling,
              ne = H.firstChild,
              Be = ne.nextSibling,
              ke = H.nextSibling,
              We = ke.firstChild,
              Ve = We.nextSibling,
              Je = ke.nextSibling,
              Ee = Je.firstChild;
            return (
              I(se, () => {
                var ie;
                return (ie = s()) != null && ie.enabled ? 'Active' : 'Not configured';
              }),
              I(
                Be,
                (() => {
                  var ie = pt(() => !!v());
                  return () => (ie() ? v().toLocaleString() : 'Never');
                })(),
              ),
              I(Ve, L),
              (Ee.$$click = Re),
              _(() => (Ee.disabled = y())),
              h
            );
          },
        }),
        null,
      ),
      I(
        u,
        W(re, {
          get when() {
            return S();
          },
          get children() {
            var h = kt(),
              M = h.firstChild,
              q = M.nextSibling;
            return I(q, S), h;
          },
        }),
        null,
      ),
      _(
        (h) => {
          var M = y(),
            q = y(),
            te = y(),
            se = y(),
            H = y(),
            ne = y();
          return (
            M !== h.e && (E.disabled = h.e = M),
            q !== h.t && (U.disabled = h.t = q),
            te !== h.a && (we.disabled = h.a = te),
            se !== h.o && (ye.disabled = h.o = se),
            H !== h.i && (be.disabled = h.i = H),
            ne !== h.n && (Pe.disabled = h.n = ne),
            h
          );
        },
        { e: void 0, t: void 0, a: void 0, o: void 0, i: void 0, n: void 0 },
      ),
      _(() => (E.value = i())),
      _(() => (U.value = o())),
      _(() => (we.value = a())),
      u
    );
  })();
};
yt(['input', 'click']);
function At(e) {
  const t = e.split(`
`),
    s = [],
    n = [];
  t.forEach((r, o) => {
    const l = r.match(/^(\s*)([-*])\s*\[([ x])\]\s*(.*)$/);
    if (!l) return;
    const [, a, d, f, c] = l,
      y = a.length,
      g = f.toLowerCase() === 'x',
      v = c.match(/^\(([^)]+)\)\s*(.+)$/),
      A = v ? v[1] : void 0,
      L = v ? v[2] : c,
      $ = { id: A, title: L.trim(), isDone: g, children: [], level: Math.floor(y / 2) };
    for (; n.length > 0 && n[n.length - 1].indent >= y; ) n.pop();
    if (n.length === 0) s.push($);
    else {
      const S = n[n.length - 1].node;
      S.children.push($), ($.parentId = S.id || null);
    }
    n.push({ node: $, indent: y });
  });
  const i = (r, o = []) => {
    r.forEach((l) => {
      const a = [];
      l.children.forEach((d) => {
        a.push(d);
      }),
        (l.children = a),
        i(l.children, [...o, l]);
    });
  };
  return i(s), s;
}
function $t(e) {
  const t = new Map(),
    s = [],
    n = new Set();
  return (
    e.forEach((i) => {
      const r = {
        id: i.id,
        title: i.title,
        isDone: i.isDone || !1,
        children: [],
        notes: i.notes,
        parentId: i.parentId || null,
        level: 0,
      };
      t.set(i.id, r);
    }),
    e.forEach((i) => {
      const r = t.get(i.id);
      if (i.parentId && t.has(i.parentId)) {
        const o = t.get(i.parentId);
        n.has(i.id) || (o.children.push(r), n.add(i.id), (r.level = o.level + 1));
      }
      i.subTaskIds &&
        i.subTaskIds.length > 0 &&
        i.subTaskIds.forEach((o) => {
          const l = t.get(o);
          l &&
            !n.has(o) &&
            (r.children.push(l), (l.parentId = i.id), (l.level = r.level + 1), n.add(o));
        }),
        !i.parentId && !n.has(i.id) && s.push(r);
    }),
    s
  );
}
function _e(e, t = 0) {
  const s = [];
  return (
    e.forEach((n) => {
      const i = '  '.repeat(t),
        r = n.isDone ? '[x]' : '[ ]',
        o = n.id ? `(${n.id}) ` : '',
        l = `${i}- ${r} ${o}${n.title}`;
      s.push(l),
        n.notes &&
          n.notes
            .split(
              `
`,
            )
            .filter((d) => d.trim())
            .forEach((d) => {
              s.push(`${i}  - ${d.trim()}`);
            }),
        n.children.length > 0 && s.push(_e(n.children, t + 1));
    }),
    s.join(`
`)
  );
}
function xt(e, t, s) {
  const n = [],
    i = (r, o) => {
      for (const l of o) {
        if ((r.id && l.id && r.id === l.id) || r.title === l.title) return l;
        const a = i(r, l.children);
        if (a) return a;
      }
      return null;
    };
  if (s === 'fileToProject' || s === 'bidirectional') {
    const r = (o, l = null) => {
      const a = i(o, t);
      a
        ? (a.isDone !== o.isDone || a.title !== o.title) &&
          n.push({
            type: 'update',
            target: 'task',
            taskId: a.id,
            data: { title: o.title, isDone: o.isDone },
          })
        : n.push({
            type: 'add',
            target: 'task',
            parentId: l,
            data: { title: o.title, isDone: o.isDone, notes: o.notes },
          }),
        o.children.forEach((d) => {
          r(d, o.id || (a == null ? void 0 : a.id) || null);
        });
    };
    e.forEach((o) => r(o));
  }
  if (s === 'projectToFile' || s === 'bidirectional') {
    const r = (o) => {
      const l = i(o, e);
      !l && s === 'projectToFile'
        ? n.push({
            type: 'add',
            target: 'markdown',
            taskId: o.id,
            data: { title: o.title, isDone: o.isDone, notes: o.notes },
          })
        : s === 'bidirectional' &&
          !l &&
          n.push({ type: 'delete', target: 'task', taskId: o.id }),
        o.children.forEach(r);
    };
    t.forEach(r);
  }
  return n;
}
function Nt(e, t, s) {
  try {
    const n = At(e),
      i = $t(t),
      r = xt(n, i, s);
    let o = n;
    (s === 'projectToFile' || s === 'bidirectional') &&
      r
        .filter((c) => c.target === 'markdown')
        .forEach((c) => {
          (c.type === 'add' && c.data) || c.type === 'update' || c.type;
        });
    const l = _e(o),
      a = r.filter((c) => c.type === 'add' && c.target === 'task').length,
      d = r.filter((c) => c.type === 'update' && c.target === 'task').length,
      f = r.filter((c) => c.type === 'delete' && c.target === 'task').length;
    return {
      success: !0,
      operations: r,
      updatedMarkdown: l,
      conflicts: [],
      tasksAdded: a,
      tasksUpdated: d,
      tasksDeleted: f,
    };
  } catch (n) {
    return {
      success: !1,
      operations: [],
      updatedMarkdown: e,
      conflicts: [],
      error: n.message,
      tasksAdded: 0,
      tasksUpdated: 0,
      tasksDeleted: 0,
    };
  }
}
class je {
  constructor(t) {
    z(this, 'watchInterval', null);
    z(this, 'lastFileContent', null);
    z(this, 'lastSyncTime', 0);
    z(this, 'isWatching', !1);
    this.options = t;
  }
  async start() {
    if (this.isWatching) {
      console.log('File watcher already running');
      return;
    }
    (this.isWatching = !0),
      console.log('Starting file watcher for:', this.options.config.filePath),
      await this.performSync(),
      (this.watchInterval = window.setInterval(async () => {
        try {
          await this.checkAndSync();
        } catch (t) {
          console.error('Error in file watcher:', t),
            this.options.onError && this.options.onError(t);
        }
      }, 2e3));
  }
  stop() {
    this.watchInterval &&
      (clearInterval(this.watchInterval), (this.watchInterval = null)),
      (this.isWatching = !1),
      console.log('File watcher stopped');
  }
  async checkAndSync() {
    if (this.options.config.enabled)
      try {
        const t = await this.readFile(this.options.config.filePath);
        t !== this.lastFileContent &&
          (console.log('File changed, syncing...'),
          (this.lastFileContent = t),
          await this.performSync());
      } catch (t) {
        throw (console.error('Error checking file:', t), t);
      }
  }
  async performSync() {
    try {
      const { config: t } = this.options,
        s = await this.readFile(t.filePath);
      this.lastFileContent = s;
      const i = (await P.getTasks()).filter((o) => o.projectId === t.projectId),
        r = Nt(s, i, t.syncDirection);
      if (!r.success) throw new Error(r.error || 'Sync failed');
      (t.syncDirection === 'fileToProject' || t.syncDirection === 'bidirectional') &&
        (await this.applyTaskOperations(r, t.projectId)),
        (t.syncDirection === 'projectToFile' || t.syncDirection === 'bidirectional') &&
          r.updatedMarkdown !== s &&
          (await this.writeFile(t.filePath, r.updatedMarkdown),
          (this.lastFileContent = r.updatedMarkdown)),
        (this.lastSyncTime = Date.now()),
        this.options.onSync && this.options.onSync(r);
    } catch (t) {
      throw (console.error('Sync error:', t), t);
    }
  }
  async applyTaskOperations(t, s) {
    for (const n of t.operations)
      if (n.target === 'task')
        try {
          switch (n.type) {
            case 'add':
              if (n.data) {
                const i = {
                    title: n.data.title || '',
                    isDone: n.data.isDone || !1,
                    projectId: s,
                    parentId: n.parentId || void 0,
                    notes: n.data.notes || void 0,
                  },
                  r = await P.addTask(i);
                console.log('Created task:', r);
              }
              break;
            case 'update':
              n.taskId &&
                n.data &&
                (await P.updateTask(n.taskId, {
                  title: n.data.title,
                  isDone: n.data.isDone,
                }),
                console.log('Updated task:', n.taskId));
              break;
            case 'delete':
              n.taskId &&
                (await P.deleteTask(n.taskId), console.log('Deleted task:', n.taskId));
              break;
          }
        } catch (i) {
          console.error(`Failed to ${n.type} task:`, i);
        }
  }
  async readFile(t) {
    var n, i;
    if (!P.executeNodeScript) throw new Error('Node script execution not available');
    const s = await P.executeNodeScript({
      script: `
        const fs = require('fs');
        const path = require('path');
        
        try {
          const absolutePath = path.resolve(args[0]);
          const content = fs.readFileSync(absolutePath, 'utf8');
          return { success: true, content };
        } catch (error) {
          return { success: false, error: error.message };
        }
      `,
      args: [t],
      timeout: 5e3,
    });
    if (!s.success) throw new Error(`Failed to read file: ${s.error}`);
    if (!((n = s.result) != null && n.success))
      throw new Error(
        `Cannot read file: ${((i = s.result) == null ? void 0 : i.error) || 'Unknown error'}`,
      );
    return s.result.content;
  }
  async writeFile(t, s) {
    var i, r;
    if (!P.executeNodeScript) throw new Error('Node script execution not available');
    const n = await P.executeNodeScript({
      script: `
        const fs = require('fs');
        const path = require('path');
        
        try {
          const absolutePath = path.resolve(args[0]);
          const content = args[1];
          
          // Create backup
          if (fs.existsSync(absolutePath)) {
            const backupPath = absolutePath + '.backup';
            fs.copyFileSync(absolutePath, backupPath);
          }
          
          // Write new content
          fs.writeFileSync(absolutePath, content, 'utf8');
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      `,
      args: [t, s],
      timeout: 5e3,
    });
    if (!n.success) throw new Error(`Failed to write file: ${n.error}`);
    if (!((i = n.result) != null && i.success))
      throw new Error(
        `Cannot write file: ${((r = n.result) == null ? void 0 : r.error) || 'Unknown error'}`,
      );
  }
  async getSyncInfo() {
    const s = (await P.getTasks()).filter(
      (n) => n.projectId === this.options.config.projectId,
    );
    return {
      lastSyncTime: this.lastSyncTime,
      taskCount: s.length,
      isWatching: this.isWatching,
    };
  }
}
let C = null;
window.addEventListener('message', async (e) => {
  var t, s, n;
  if (
    (console.log('Background received message:', e.data),
    ((t = e.data) == null ? void 0 : t.type) === 'PLUGIN_MESSAGE')
  ) {
    const { message: i, messageId: r } = e.data;
    try {
      let o = { success: !0 };
      switch (i.type) {
        case 'configUpdated':
          C && (C.stop(), (C = null)),
            (s = i.config) != null &&
              s.enabled &&
              ((C = new je({
                config: i.config,
                onSync: (a) => {
                  console.log('Sync completed:', a),
                    window.parent.postMessage({ type: 'SYNC_COMPLETED', result: a }, '*');
                },
                onError: (a) => {
                  console.error('Sync error:', a),
                    window.parent.postMessage(
                      { type: 'SYNC_ERROR', error: a.message },
                      '*',
                    );
                },
              })),
              await C.start());
          break;
        case 'testFile':
          const { filePath: l } = i;
          if (!l) o = { success: !1, error: 'No file path provided' };
          else
            try {
              const a = await Dt(l);
              o = {
                success: !0,
                preview:
                  a
                    .split(
                      `
`,
                    )
                    .slice(0, 10).join(`
`) +
                  (a.split(`
`).length > 10
                    ? `
...`
                    : ''),
              };
            } catch (a) {
              o = { success: !1, error: a.message };
            }
          break;
        case 'syncNow':
          C
            ? (await C.performSync(), (o = { success: !0 }))
            : (o = { success: !1, error: 'File watcher not initialized' });
          break;
        case 'getSyncInfo':
          C
            ? (o = { ...(await C.getSyncInfo()), success: !0 })
            : (o = { success: !0, lastSyncTime: 0, taskCount: 0, isWatching: !1 });
          break;
        case 'checkDesktopMode':
          o = {
            success: !0,
            isDesktop:
              typeof window < 'u' &&
              ((n = window.PluginAPI) == null ? void 0 : n.executeNodeScript) !== void 0,
          };
          break;
        default:
          o = { success: !1, error: `Unknown message type: ${i.type}` };
      }
      window.parent.postMessage(
        { type: 'PLUGIN_MESSAGE_RESPONSE', messageId: r, response: o },
        '*',
      );
    } catch (o) {
      console.error('Error handling message:', o),
        window.parent.postMessage(
          {
            type: 'PLUGIN_MESSAGE_RESPONSE',
            messageId: r,
            response: { success: !1, error: o.message },
          },
          '*',
        );
    }
  }
});
async function Dt(e) {
  var s, n, i;
  if (!((s = window.PluginAPI) != null && s.executeNodeScript))
    throw new Error('Node script execution not available');
  const t = await window.PluginAPI.executeNodeScript({
    script: `
      const fs = require('fs');
      const path = require('path');
      
      try {
        const absolutePath = path.resolve(args[0]);
        if (!fs.existsSync(absolutePath)) {
          return { success: false, error: 'File not found' };
        }
        const content = fs.readFileSync(absolutePath, 'utf8');
        return { success: true, content };
      } catch (error) {
        return { success: false, error: error.message };
      }
    `,
    args: [e],
    timeout: 5e3,
  });
  if (!t.success) throw new Error(t.error || 'Failed to execute node script');
  if (!((n = t.result) != null && n.success))
    throw new Error(((i = t.result) == null ? void 0 : i.error) || 'Failed to read file');
  return t.result.content;
}
window.addEventListener('load', async () => {
  var t, s;
  console.log('Sync-MD background script loaded');
  const e = await ((s = (t = window.PluginAPI) == null ? void 0 : t.loadSyncedData) ==
  null
    ? void 0
    : s.call(t));
  if (e)
    try {
      const n = JSON.parse(e);
      n.enabled &&
        ((C = new je({
          config: n,
          onSync: (i) => {
            console.log('Auto-sync completed:', i);
          },
          onError: (i) => {
            console.error('Auto-sync error:', i);
          },
        })),
        await C.start());
    } catch (n) {
      console.error('Failed to load saved config:', n);
    }
});
const $e = document.getElementById('root');
$e && wt(() => W(It, {}), $e);
