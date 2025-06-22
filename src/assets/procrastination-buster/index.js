(function () {
  const t = document.createElement('link').relList;
  if (t && t.supports && t.supports('modulepreload')) return;
  for (const s of document.querySelectorAll('link[rel="modulepreload"]')) i(s);
  new MutationObserver((s) => {
    for (const r of s)
      if (r.type === 'childList')
        for (const o of r.addedNodes)
          o.tagName === 'LINK' && o.rel === 'modulepreload' && i(o);
  }).observe(document, { childList: !0, subtree: !0 });
  function n(s) {
    const r = {};
    return (
      s.integrity && (r.integrity = s.integrity),
      s.referrerPolicy && (r.referrerPolicy = s.referrerPolicy),
      s.crossOrigin === 'use-credentials'
        ? (r.credentials = 'include')
        : s.crossOrigin === 'anonymous'
          ? (r.credentials = 'omit')
          : (r.credentials = 'same-origin'),
      r
    );
  }
  function i(s) {
    if (s.ep) return;
    s.ep = !0;
    const r = n(s);
    fetch(s.href, r);
  }
})();
const ce = !1,
  fe = (e, t) => e === t,
  ue = Symbol('solid-track'),
  M = { equals: fe };
let ae = ne;
const C = 1,
  R = 2,
  Q = { owned: null, cleanups: null, context: null, owner: null };
var h = null;
let G = null,
  de = null,
  d = null,
  p = null,
  v = null,
  q = 0;
function B(e, t) {
  const n = d,
    i = h,
    s = e.length === 0,
    r = t === void 0 ? i : t,
    o = s ? Q : { owned: null, cleanups: null, context: r ? r.context : null, owner: r },
    l = s ? e : () => e(() => x(() => I(o)));
  (h = o), (d = null);
  try {
    return O(l, !0);
  } finally {
    (d = n), (h = i);
  }
}
function W(e, t) {
  t = t ? Object.assign({}, M, t) : M;
  const n = {
      value: e,
      observers: null,
      observerSlots: null,
      comparator: t.equals || void 0,
    },
    i = (s) => (typeof s == 'function' && (s = s(n.value)), z(n, s));
  return [Z.bind(n), i];
}
function V(e, t, n) {
  const i = ee(e, t, !1, C);
  F(i);
}
function D(e, t, n) {
  n = n ? Object.assign({}, M, n) : M;
  const i = ee(e, t, !0, 0);
  return (
    (i.observers = null),
    (i.observerSlots = null),
    (i.comparator = n.equals || void 0),
    F(i),
    Z.bind(i)
  );
}
function x(e) {
  if (d === null) return e();
  const t = d;
  d = null;
  try {
    return e();
  } finally {
    d = t;
  }
}
function he(e) {
  return h === null || (h.cleanups === null ? (h.cleanups = [e]) : h.cleanups.push(e)), e;
}
function Z() {
  if (this.sources && this.state)
    if (this.state === C) F(this);
    else {
      const e = p;
      (p = null), O(() => U(this), !1), (p = e);
    }
  if (d) {
    const e = this.observers ? this.observers.length : 0;
    d.sources
      ? (d.sources.push(this), d.sourceSlots.push(e))
      : ((d.sources = [this]), (d.sourceSlots = [e])),
      this.observers
        ? (this.observers.push(d), this.observerSlots.push(d.sources.length - 1))
        : ((this.observers = [d]), (this.observerSlots = [d.sources.length - 1]));
  }
  return this.value;
}
function z(e, t, n) {
  let i = e.value;
  return (
    (!e.comparator || !e.comparator(i, t)) &&
      ((e.value = t),
      e.observers &&
        e.observers.length &&
        O(() => {
          for (let s = 0; s < e.observers.length; s += 1) {
            const r = e.observers[s],
              o = G && G.running;
            o && G.disposed.has(r),
              (o ? !r.tState : !r.state) &&
                (r.pure ? p.push(r) : v.push(r), r.observers && se(r)),
              o || (r.state = C);
          }
          if (p.length > 1e6) throw ((p = []), new Error());
        }, !1)),
    t
  );
}
function F(e) {
  if (!e.fn) return;
  I(e);
  const t = q;
  pe(e, e.value, t);
}
function pe(e, t, n) {
  let i;
  const s = h,
    r = d;
  d = h = e;
  try {
    i = e.fn(t);
  } catch (o) {
    return (
      e.pure && ((e.state = C), e.owned && e.owned.forEach(I), (e.owned = null)),
      (e.updatedAt = n + 1),
      ie(o)
    );
  } finally {
    (d = r), (h = s);
  }
  (!e.updatedAt || e.updatedAt <= n) &&
    (e.updatedAt != null && 'observers' in e ? z(e, i) : (e.value = i),
    (e.updatedAt = n));
}
function ee(e, t, n, i = C, s) {
  const r = {
    fn: e,
    state: i,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value: t,
    owner: h,
    context: h ? h.context : null,
    pure: n,
  };
  return h === null || (h !== Q && (h.owned ? h.owned.push(r) : (h.owned = [r]))), r;
}
function te(e) {
  if (e.state === 0) return;
  if (e.state === R) return U(e);
  if (e.suspense && x(e.suspense.inFallback)) return e.suspense.effects.push(e);
  const t = [e];
  for (; (e = e.owner) && (!e.updatedAt || e.updatedAt < q); ) e.state && t.push(e);
  for (let n = t.length - 1; n >= 0; n--)
    if (((e = t[n]), e.state === C)) F(e);
    else if (e.state === R) {
      const i = p;
      (p = null), O(() => U(e, t[0]), !1), (p = i);
    }
}
function O(e, t) {
  if (p) return e();
  let n = !1;
  t || (p = []), v ? (n = !0) : (v = []), q++;
  try {
    const i = e();
    return ge(n), i;
  } catch (i) {
    n || (v = null), (p = null), ie(i);
  }
}
function ge(e) {
  if ((p && (ne(p), (p = null)), e)) return;
  const t = v;
  (v = null), t.length && O(() => ae(t), !1);
}
function ne(e) {
  for (let t = 0; t < e.length; t++) te(e[t]);
}
function U(e, t) {
  e.state = 0;
  for (let n = 0; n < e.sources.length; n += 1) {
    const i = e.sources[n];
    if (i.sources) {
      const s = i.state;
      s === C
        ? i !== t && (!i.updatedAt || i.updatedAt < q) && te(i)
        : s === R && U(i, t);
    }
  }
}
function se(e) {
  for (let t = 0; t < e.observers.length; t += 1) {
    const n = e.observers[t];
    n.state || ((n.state = R), n.pure ? p.push(n) : v.push(n), n.observers && se(n));
  }
}
function I(e) {
  let t;
  if (e.sources)
    for (; e.sources.length; ) {
      const n = e.sources.pop(),
        i = e.sourceSlots.pop(),
        s = n.observers;
      if (s && s.length) {
        const r = s.pop(),
          o = n.observerSlots.pop();
        i < s.length && ((r.sourceSlots[o] = i), (s[i] = r), (n.observerSlots[i] = o));
      }
    }
  if (e.tOwned) {
    for (t = e.tOwned.length - 1; t >= 0; t--) I(e.tOwned[t]);
    delete e.tOwned;
  }
  if (e.owned) {
    for (t = e.owned.length - 1; t >= 0; t--) I(e.owned[t]);
    e.owned = null;
  }
  if (e.cleanups) {
    for (t = e.cleanups.length - 1; t >= 0; t--) e.cleanups[t]();
    e.cleanups = null;
  }
  e.state = 0;
}
function me(e) {
  return e instanceof Error
    ? e
    : new Error(typeof e == 'string' ? e : 'Unknown error', { cause: e });
}
function ie(e, t = h) {
  throw me(e);
}
const we = Symbol('fallback');
function H(e) {
  for (let t = 0; t < e.length; t++) e[t]();
}
function ye(e, t, n = {}) {
  let i = [],
    s = [],
    r = [],
    o = 0,
    l = t.length > 1 ? [] : null;
  return (
    he(() => H(r)),
    () => {
      let f = e() || [],
        u = f.length,
        a,
        c;
      return (
        f[ue],
        x(() => {
          let m, A, $, P, L, w, y, b, k;
          if (u === 0)
            o !== 0 && (H(r), (r = []), (i = []), (s = []), (o = 0), l && (l = [])),
              n.fallback &&
                ((i = [we]), (s[0] = B((oe) => ((r[0] = oe), n.fallback()))), (o = 1));
          else if (o === 0) {
            for (s = new Array(u), c = 0; c < u; c++) (i[c] = f[c]), (s[c] = B(_));
            o = u;
          } else {
            for (
              $ = new Array(u),
                P = new Array(u),
                l && (L = new Array(u)),
                w = 0,
                y = Math.min(o, u);
              w < y && i[w] === f[w];
              w++
            );
            for (y = o - 1, b = u - 1; y >= w && b >= w && i[y] === f[b]; y--, b--)
              ($[b] = s[y]), (P[b] = r[y]), l && (L[b] = l[y]);
            for (m = new Map(), A = new Array(b + 1), c = b; c >= w; c--)
              (k = f[c]), (a = m.get(k)), (A[c] = a === void 0 ? -1 : a), m.set(k, c);
            for (a = w; a <= y; a++)
              (k = i[a]),
                (c = m.get(k)),
                c !== void 0 && c !== -1
                  ? (($[c] = s[a]),
                    (P[c] = r[a]),
                    l && (L[c] = l[a]),
                    (c = A[c]),
                    m.set(k, c))
                  : r[a]();
            for (c = w; c < u; c++)
              c in $
                ? ((s[c] = $[c]), (r[c] = P[c]), l && ((l[c] = L[c]), l[c](c)))
                : (s[c] = B(_));
            (s = s.slice(0, (o = u))), (i = f.slice(0));
          }
          return s;
        })
      );
      function _(m) {
        if (((r[c] = m), l)) {
          const [A, $] = W(c);
          return (l[c] = $), t(f[c], A);
        }
        return t(f[c]);
      }
    }
  );
}
function S(e, t) {
  return x(() => e(t || {}));
}
const be = (e) => `Stale read from <${e}>.`;
function re(e) {
  const t = 'fallback' in e && { fallback: () => e.fallback };
  return D(ye(() => e.each, e.children, t || void 0));
}
function N(e) {
  const t = e.keyed,
    n = D(() => e.when, void 0, void 0),
    i = t ? n : D(n, void 0, { equals: (s, r) => !s == !r });
  return D(
    () => {
      const s = i();
      if (s) {
        const r = e.children;
        return typeof r == 'function' && r.length > 0
          ? x(() =>
              r(
                t
                  ? s
                  : () => {
                      if (!x(i)) throw be('Show');
                      return n();
                    },
              ),
            )
          : r;
      }
      return e.fallback;
    },
    void 0,
    void 0,
  );
}
function Se(e, t, n) {
  let i = n.length,
    s = t.length,
    r = i,
    o = 0,
    l = 0,
    f = t[s - 1].nextSibling,
    u = null;
  for (; o < s || l < r; ) {
    if (t[o] === n[l]) {
      o++, l++;
      continue;
    }
    for (; t[s - 1] === n[r - 1]; ) s--, r--;
    if (s === o) {
      const a = r < i ? (l ? n[l - 1].nextSibling : n[r - l]) : f;
      for (; l < r; ) e.insertBefore(n[l++], a);
    } else if (r === l) for (; o < s; ) (!u || !u.has(t[o])) && t[o].remove(), o++;
    else if (t[o] === n[r - 1] && n[l] === t[s - 1]) {
      const a = t[--s].nextSibling;
      e.insertBefore(n[l++], t[o++].nextSibling),
        e.insertBefore(n[--r], a),
        (t[s] = n[r]);
    } else {
      if (!u) {
        u = new Map();
        let c = l;
        for (; c < r; ) u.set(n[c], c++);
      }
      const a = u.get(t[o]);
      if (a != null)
        if (l < a && a < r) {
          let c = o,
            _ = 1,
            m;
          for (; ++c < s && c < r && !((m = u.get(t[c])) == null || m !== a + _); ) _++;
          if (_ > a - l) {
            const A = t[o];
            for (; l < a; ) e.insertBefore(n[l++], A);
          } else e.replaceChild(n[l++], t[o++]);
        } else o++;
      else t[o++].remove();
    }
  }
}
const X = '_$DX_DELEGATE';
function Ae(e, t, n, i = {}) {
  let s;
  return (
    B((r) => {
      (s = r), t === document ? e() : g(t, e(), t.firstChild ? null : void 0, n);
    }, i.owner),
    () => {
      s(), (t.textContent = '');
    }
  );
}
function E(e, t, n, i) {
  let s;
  const r = () => {
      const l = document.createElement('template');
      return (l.innerHTML = e), l.content.firstChild;
    },
    o = () => (s || (s = r())).cloneNode(!0);
  return (o.cloneNode = o), o;
}
function le(e, t = window.document) {
  const n = t[X] || (t[X] = new Set());
  for (let i = 0, s = e.length; i < s; i++) {
    const r = e[i];
    n.has(r) || (n.add(r), t.addEventListener(r, $e));
  }
}
function g(e, t, n, i) {
  if ((n !== void 0 && !i && (i = []), typeof t != 'function')) return j(e, t, i, n);
  V((s) => j(e, t(), s, n), i);
}
function $e(e) {
  let t = e.target;
  const n = `$$${e.type}`,
    i = e.target,
    s = e.currentTarget,
    r = (f) => Object.defineProperty(e, 'target', { configurable: !0, value: f }),
    o = () => {
      const f = t[n];
      if (f && !t.disabled) {
        const u = t[`${n}Data`];
        if ((u !== void 0 ? f.call(t, u, e) : f.call(t, e), e.cancelBubble)) return;
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
    const f = e.composedPath();
    r(f[0]);
    for (let u = 0; u < f.length - 2 && ((t = f[u]), !!o()); u++) {
      if (t._$host) {
        (t = t._$host), l();
        break;
      }
      if (t.parentNode === s) break;
    }
  } else l();
  r(i);
}
function j(e, t, n, i, s) {
  for (; typeof n == 'function'; ) n = n();
  if (t === n) return n;
  const r = typeof t,
    o = i !== void 0;
  if (((e = (o && n[0] && n[0].parentNode) || e), r === 'string' || r === 'number')) {
    if (r === 'number' && ((t = t.toString()), t === n)) return n;
    if (o) {
      let l = n[0];
      l && l.nodeType === 3
        ? l.data !== t && (l.data = t)
        : (l = document.createTextNode(t)),
        (n = T(e, n, i, l));
    } else
      n !== '' && typeof n == 'string'
        ? (n = e.firstChild.data = t)
        : (n = e.textContent = t);
  } else if (t == null || r === 'boolean') n = T(e, n, i);
  else {
    if (r === 'function')
      return (
        V(() => {
          let l = t();
          for (; typeof l == 'function'; ) l = l();
          n = j(e, l, n, i);
        }),
        () => n
      );
    if (Array.isArray(t)) {
      const l = [],
        f = n && Array.isArray(n);
      if (K(l, t, n, s)) return V(() => (n = j(e, l, n, i, !0))), () => n;
      if (l.length === 0) {
        if (((n = T(e, n, i)), o)) return n;
      } else f ? (n.length === 0 ? Y(e, l, i) : Se(e, n, l)) : (n && T(e), Y(e, l));
      n = l;
    } else if (t.nodeType) {
      if (Array.isArray(n)) {
        if (o) return (n = T(e, n, i, t));
        T(e, n, null, t);
      } else
        n == null || n === '' || !e.firstChild
          ? e.appendChild(t)
          : e.replaceChild(t, e.firstChild);
      n = t;
    }
  }
  return n;
}
function K(e, t, n, i) {
  let s = !1;
  for (let r = 0, o = t.length; r < o; r++) {
    let l = t[r],
      f = n && n[e.length],
      u;
    if (!(l == null || l === !0 || l === !1))
      if ((u = typeof l) == 'object' && l.nodeType) e.push(l);
      else if (Array.isArray(l)) s = K(e, l, f) || s;
      else if (u === 'function')
        if (i) {
          for (; typeof l == 'function'; ) l = l();
          s = K(e, Array.isArray(l) ? l : [l], Array.isArray(f) ? f : [f]) || s;
        } else e.push(l), (s = !0);
      else {
        const a = String(l);
        f && f.nodeType === 3 && f.data === a
          ? e.push(f)
          : e.push(document.createTextNode(a));
      }
  }
  return s;
}
function Y(e, t, n = null) {
  for (let i = 0, s = t.length; i < s; i++) e.insertBefore(t[i], n);
}
function T(e, t, n, i) {
  if (n === void 0) return (e.textContent = '');
  const s = i || document.createTextNode('');
  if (t.length) {
    let r = !1;
    for (let o = t.length - 1; o >= 0; o--) {
      const l = t[o];
      if (s !== l) {
        const f = l.parentNode === e;
        !r && !o ? (f ? e.replaceChild(s, l) : e.insertBefore(s, n)) : f && l.remove();
      } else r = !0;
    }
  } else e.insertBefore(s, n);
  return [s];
}
const ve = [
  {
    id: 'overwhelm',
    title: 'Overwhelm',
    emotion: 'Too much at once',
    strategies: [
      'Create micro-tasks (5 min steps)',
      'Start Pomodoro timer (25 min)',
      'Implementation Intentions (If X, then Y)',
      'Pick just one thing',
    ],
  },
  {
    id: 'perfectionism',
    title: 'Perfectionism',
    emotion: "It's not perfect enough",
    strategies: [
      'Set time limit for v0.1',
      'Journal: What is "good enough"?',
      'Practice self-compassion',
      'Progress over perfection',
    ],
  },
  {
    id: 'unclear',
    title: 'Unclear',
    emotion: "I don't know what to do",
    strategies: [
      'Define next concrete step',
      'Talk to someone about it',
      'Create a mind map',
      'Write down questions',
    ],
  },
  {
    id: 'boring',
    title: 'Boredom',
    emotion: "It's boring",
    strategies: [
      'Add gamification',
      'Combine with music/podcast',
      'Plan a reward',
      'Break into smaller parts',
    ],
  },
  {
    id: 'fear',
    title: 'Fear',
    emotion: 'I might fail',
    strategies: [
      'Think through worst case',
      'Run small experiments',
      'Activate support system',
      'Document successes',
    ],
  },
  {
    id: 'energy',
    title: 'Low Energy',
    emotion: "I'm too tired",
    strategies: [
      '5-minute movement break',
      'Drink water',
      'Easiest task first',
      'Power nap (20 min)',
    ],
  },
  {
    id: 'distraction',
    title: 'Distraction',
    emotion: 'Other things are more interesting',
    strategies: [
      'Block distractions',
      'Schedule deep work block',
      'Clear work environment',
      'Start focus ritual',
    ],
  },
  {
    id: 'resistance',
    title: 'Resistance',
    emotion: "I don't want to do this",
    strategies: [
      'Why is it important?',
      'Pair with something pleasant',
      'Consider delegating',
      'Reframe: What will I learn?',
    ],
  },
];
var Ce = E('<div class=blocker-grid>'),
  Ee = E('<button class=blocker-card><h3></h3><p>');
const _e = (e) =>
  (() => {
    var t = Ce();
    return (
      g(
        t,
        S(re, {
          get each() {
            return e.types;
          },
          children: (n) =>
            (() => {
              var i = Ee(),
                s = i.firstChild,
                r = s.nextSibling;
              return (
                (i.$$click = () => e.onSelect(n)),
                g(s, () => n.title),
                g(r, () => n.emotion),
                i
              );
            })(),
        }),
      ),
      t
    );
  })();
le(['click']);
var ke = E(
    '<div class=strategy-container><div class=selected-type><h2></h2><p class=emotion></p></div><h3>Recommended Strategies:</h3><div class=strategy-list>',
  ),
  Te = E('<div class=strategy-item><p class=strategy-text>');
const xe = (e) =>
  (() => {
    var t = ke(),
      n = t.firstChild,
      i = n.firstChild,
      s = i.nextSibling,
      r = n.nextSibling,
      o = r.nextSibling;
    return (
      g(i, () => e.type.title),
      g(s, () => e.type.emotion),
      g(
        o,
        S(re, {
          get each() {
            return e.type.strategies;
          },
          children: (l) =>
            (() => {
              var f = Te(),
                u = f.firstChild;
              return g(u, l), f;
            })(),
        }),
      ),
      t
    );
  })();
var Ie = E('<button class=back-button>← Back'),
  Oe = E(
    "<div class=intro><h2>What's holding you back?</h2><p>Choose what best matches your current feeling:",
  ),
  Pe = E('<div class=app><header class=header></header><main class=main>');
const Le = () => {
  const [e, t] = W(null),
    [n, i] = W(!0),
    s = (l) => {
      t(l), i(!1);
    },
    r = () => {
      t(null), i(!0);
    },
    o = async (l, f) => {
      const u = e();
      if (u)
        try {
          const a =
            f === 'task'
              ? { type: 'ADD_STRATEGY_TASK', strategy: l, blockerType: u.title }
              : { type: 'START_POMODORO' };
          window.parent !== window &&
            window.parent.postMessage(
              { type: 'PLUGIN_MESSAGE', pluginId: 'procrastination-buster', data: a },
              '*',
            );
        } catch (a) {
          console.error('Failed to send message:', a);
        }
    };
  return (() => {
    var l = Pe(),
      f = l.firstChild,
      u = f.nextSibling;
    return (
      g(
        f,
        S(N, {
          get when() {
            return !n();
          },
          get children() {
            var a = Ie();
            return (a.$$click = r), a;
          },
        }),
      ),
      g(
        u,
        S(N, {
          get when() {
            return n();
          },
          get children() {
            return Oe();
          },
        }),
        null,
      ),
      g(
        u,
        S(N, {
          get when() {
            return !e();
          },
          get children() {
            return S(_e, { types: ve, onSelect: s });
          },
        }),
        null,
      ),
      g(
        u,
        S(N, {
          get when() {
            return e();
          },
          get children() {
            return S(xe, {
              get type() {
                return e();
              },
              onStrategyAction: o,
            });
          },
        }),
        null,
      ),
      l
    );
  })();
};
le(['click']);
const J = document.getElementById('root');
J && Ae(() => S(Le, {}), J);
