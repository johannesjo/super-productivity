(function () {
  const t = document.createElement('link').relList;
  if (t && t.supports && t.supports('modulepreload')) return;
  for (const i of document.querySelectorAll('link[rel="modulepreload"]')) r(i);
  new MutationObserver((i) => {
    for (const s of i)
      if (s.type === 'childList')
        for (const l of s.addedNodes)
          l.tagName === 'LINK' && l.rel === 'modulepreload' && r(l);
  }).observe(document, { childList: !0, subtree: !0 });
  function n(i) {
    const s = {};
    return (
      i.integrity && (s.integrity = i.integrity),
      i.referrerPolicy && (s.referrerPolicy = i.referrerPolicy),
      i.crossOrigin === 'use-credentials'
        ? (s.credentials = 'include')
        : i.crossOrigin === 'anonymous'
          ? (s.credentials = 'omit')
          : (s.credentials = 'same-origin'),
      s
    );
  }
  function r(i) {
    if (i.ep) return;
    i.ep = !0;
    const s = n(i);
    fetch(i.href, s);
  }
})();
const fe = !1,
  ue = (e, t) => e === t,
  de = Symbol('solid-track'),
  M = { equals: ue };
let he = se;
const T = 1,
  N = 2,
  z = { owned: null, cleanups: null, context: null, owner: null };
var h = null;
let q = null,
  pe = null,
  d = null,
  p = null,
  x = null,
  U = 0;
function L(e, t) {
  const n = d,
    r = h,
    i = e.length === 0,
    s = t === void 0 ? r : t,
    l = i ? z : { owned: null, cleanups: null, context: s ? s.context : null, owner: s },
    o = i ? e : () => e(() => P(() => D(l)));
  (h = l), (d = null);
  try {
    return B(o, !0);
  } finally {
    (d = n), (h = r);
  }
}
function V(e, t) {
  t = t ? Object.assign({}, M, t) : M;
  const n = {
      value: e,
      observers: null,
      observerSlots: null,
      comparator: t.equals || void 0,
    },
    r = (i) => (typeof i == 'function' && (i = i(n.value)), te(n, i));
  return [ee.bind(n), r];
}
function G(e, t, n) {
  const r = ne(e, t, !1, T);
  j(r);
}
function R(e, t, n) {
  n = n ? Object.assign({}, M, n) : M;
  const r = ne(e, t, !0, 0);
  return (
    (r.observers = null),
    (r.observerSlots = null),
    (r.comparator = n.equals || void 0),
    j(r),
    ee.bind(r)
  );
}
function P(e) {
  if (d === null) return e();
  const t = d;
  d = null;
  try {
    return e();
  } finally {
    d = t;
  }
}
function ge(e) {
  return h === null || (h.cleanups === null ? (h.cleanups = [e]) : h.cleanups.push(e)), e;
}
function ee() {
  if (this.sources && this.state)
    if (this.state === T) j(this);
    else {
      const e = p;
      (p = null), B(() => F(this), !1), (p = e);
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
function te(e, t, n) {
  let r = e.value;
  return (
    (!e.comparator || !e.comparator(r, t)) &&
      ((e.value = t),
      e.observers &&
        e.observers.length &&
        B(() => {
          for (let i = 0; i < e.observers.length; i += 1) {
            const s = e.observers[i],
              l = q && q.running;
            l && q.disposed.has(s),
              (l ? !s.tState : !s.state) &&
                (s.pure ? p.push(s) : x.push(s), s.observers && re(s)),
              l || (s.state = T);
          }
          if (p.length > 1e6) throw ((p = []), new Error());
        }, !1)),
    t
  );
}
function j(e) {
  if (!e.fn) return;
  D(e);
  const t = U;
  me(e, e.value, t);
}
function me(e, t, n) {
  let r;
  const i = h,
    s = d;
  d = h = e;
  try {
    r = e.fn(t);
  } catch (l) {
    return (
      e.pure && ((e.state = T), e.owned && e.owned.forEach(D), (e.owned = null)),
      (e.updatedAt = n + 1),
      oe(l)
    );
  } finally {
    (d = s), (h = i);
  }
  (!e.updatedAt || e.updatedAt <= n) &&
    (e.updatedAt != null && 'observers' in e ? te(e, r) : (e.value = r),
    (e.updatedAt = n));
}
function ne(e, t, n, r = T, i) {
  const s = {
    fn: e,
    state: r,
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
  return h === null || (h !== z && (h.owned ? h.owned.push(s) : (h.owned = [s]))), s;
}
function ie(e) {
  if (e.state === 0) return;
  if (e.state === N) return F(e);
  if (e.suspense && P(e.suspense.inFallback)) return e.suspense.effects.push(e);
  const t = [e];
  for (; (e = e.owner) && (!e.updatedAt || e.updatedAt < U); ) e.state && t.push(e);
  for (let n = t.length - 1; n >= 0; n--)
    if (((e = t[n]), e.state === T)) j(e);
    else if (e.state === N) {
      const r = p;
      (p = null), B(() => F(e, t[0]), !1), (p = r);
    }
}
function B(e, t) {
  if (p) return e();
  let n = !1;
  t || (p = []), x ? (n = !0) : (x = []), U++;
  try {
    const r = e();
    return we(n), r;
  } catch (r) {
    n || (x = null), (p = null), oe(r);
  }
}
function we(e) {
  if ((p && (se(p), (p = null)), e)) return;
  const t = x;
  (x = null), t.length && B(() => he(t), !1);
}
function se(e) {
  for (let t = 0; t < e.length; t++) ie(e[t]);
}
function F(e, t) {
  e.state = 0;
  for (let n = 0; n < e.sources.length; n += 1) {
    const r = e.sources[n];
    if (r.sources) {
      const i = r.state;
      i === T
        ? r !== t && (!r.updatedAt || r.updatedAt < U) && ie(r)
        : i === N && F(r, t);
    }
  }
}
function re(e) {
  for (let t = 0; t < e.observers.length; t += 1) {
    const n = e.observers[t];
    n.state || ((n.state = N), n.pure ? p.push(n) : x.push(n), n.observers && re(n));
  }
}
function D(e) {
  let t;
  if (e.sources)
    for (; e.sources.length; ) {
      const n = e.sources.pop(),
        r = e.sourceSlots.pop(),
        i = n.observers;
      if (i && i.length) {
        const s = i.pop(),
          l = n.observerSlots.pop();
        r < i.length && ((s.sourceSlots[l] = r), (i[r] = s), (n.observerSlots[r] = l));
      }
    }
  if (e.tOwned) {
    for (t = e.tOwned.length - 1; t >= 0; t--) D(e.tOwned[t]);
    delete e.tOwned;
  }
  if (e.owned) {
    for (t = e.owned.length - 1; t >= 0; t--) D(e.owned[t]);
    e.owned = null;
  }
  if (e.cleanups) {
    for (t = e.cleanups.length - 1; t >= 0; t--) e.cleanups[t]();
    e.cleanups = null;
  }
  e.state = 0;
}
function ye(e) {
  return e instanceof Error
    ? e
    : new Error(typeof e == 'string' ? e : 'Unknown error', { cause: e });
}
function oe(e, t = h) {
  throw ye(e);
}
const be = Symbol('fallback');
function X(e) {
  for (let t = 0; t < e.length; t++) e[t]();
}
function Se(e, t, n = {}) {
  let r = [],
    i = [],
    s = [],
    l = 0,
    o = t.length > 1 ? [] : null;
  return (
    ge(() => X(s)),
    () => {
      let f = e() || [],
        a = f.length,
        u,
        c;
      return (
        f[de],
        P(() => {
          let g, $, w, C, O, y, b, v, A;
          if (a === 0)
            l !== 0 && (X(s), (s = []), (r = []), (i = []), (l = 0), o && (o = [])),
              n.fallback &&
                ((r = [be]), (i[0] = L((ae) => ((s[0] = ae), n.fallback()))), (l = 1));
          else if (l === 0) {
            for (i = new Array(a), c = 0; c < a; c++) (r[c] = f[c]), (i[c] = L(m));
            l = a;
          } else {
            for (
              w = new Array(a),
                C = new Array(a),
                o && (O = new Array(a)),
                y = 0,
                b = Math.min(l, a);
              y < b && r[y] === f[y];
              y++
            );
            for (b = l - 1, v = a - 1; b >= y && v >= y && r[b] === f[v]; b--, v--)
              (w[v] = i[b]), (C[v] = s[b]), o && (O[v] = o[b]);
            for (g = new Map(), $ = new Array(v + 1), c = v; c >= y; c--)
              (A = f[c]), (u = g.get(A)), ($[c] = u === void 0 ? -1 : u), g.set(A, c);
            for (u = y; u <= b; u++)
              (A = r[u]),
                (c = g.get(A)),
                c !== void 0 && c !== -1
                  ? ((w[c] = i[u]),
                    (C[c] = s[u]),
                    o && (O[c] = o[u]),
                    (c = $[c]),
                    g.set(A, c))
                  : s[u]();
            for (c = y; c < a; c++)
              c in w
                ? ((i[c] = w[c]), (s[c] = C[c]), o && ((o[c] = O[c]), o[c](c)))
                : (i[c] = L(m));
            (i = i.slice(0, (l = a))), (r = f.slice(0));
          }
          return i;
        })
      );
      function m(g) {
        if (((s[c] = g), o)) {
          const [$, w] = V(c);
          return (o[c] = w), t(f[c], $);
        }
        return t(f[c]);
      }
    }
  );
}
function _(e, t) {
  return P(() => e(t || {}));
}
const ve = (e) => `Stale read from <${e}>.`;
function J(e) {
  const t = 'fallback' in e && { fallback: () => e.fallback };
  return R(Se(() => e.each, e.children, t || void 0));
}
function I(e) {
  const t = e.keyed,
    n = R(() => e.when, void 0, void 0),
    r = t ? n : R(n, void 0, { equals: (i, s) => !i == !s });
  return R(
    () => {
      const i = r();
      if (i) {
        const s = e.children;
        return typeof s == 'function' && s.length > 0
          ? P(() =>
              s(
                t
                  ? i
                  : () => {
                      if (!P(r)) throw ve('Show');
                      return n();
                    },
              ),
            )
          : s;
      }
      return e.fallback;
    },
    void 0,
    void 0,
  );
}
const $e = (e) => R(() => e());
function Ae(e, t, n) {
  let r = n.length,
    i = t.length,
    s = r,
    l = 0,
    o = 0,
    f = t[i - 1].nextSibling,
    a = null;
  for (; l < i || o < s; ) {
    if (t[l] === n[o]) {
      l++, o++;
      continue;
    }
    for (; t[i - 1] === n[s - 1]; ) i--, s--;
    if (i === l) {
      const u = s < r ? (o ? n[o - 1].nextSibling : n[s - o]) : f;
      for (; o < s; ) e.insertBefore(n[o++], u);
    } else if (s === o) for (; l < i; ) (!a || !a.has(t[l])) && t[l].remove(), l++;
    else if (t[l] === n[s - 1] && n[o] === t[i - 1]) {
      const u = t[--i].nextSibling;
      e.insertBefore(n[o++], t[l++].nextSibling),
        e.insertBefore(n[--s], u),
        (t[i] = n[s]);
    } else {
      if (!a) {
        a = new Map();
        let c = o;
        for (; c < s; ) a.set(n[c], c++);
      }
      const u = a.get(t[l]);
      if (u != null)
        if (o < u && u < s) {
          let c = l,
            m = 1,
            g;
          for (; ++c < i && c < s && !((g = a.get(t[c])) == null || g !== u + m); ) m++;
          if (m > u - o) {
            const $ = t[l];
            for (; o < u; ) e.insertBefore(n[o++], $);
          } else e.replaceChild(n[o++], t[l++]);
        } else l++;
      else t[l++].remove();
    }
  }
}
const Q = '_$DX_DELEGATE';
function _e(e, t, n, r = {}) {
  let i;
  return (
    L((s) => {
      (i = s), t === document ? e() : S(t, e(), t.firstChild ? null : void 0, n);
    }, r.owner),
    () => {
      i(), (t.textContent = '');
    }
  );
}
function k(e, t, n, r) {
  let i;
  const s = () => {
      const o = document.createElement('template');
      return (o.innerHTML = e), o.content.firstChild;
    },
    l = () => (i || (i = s())).cloneNode(!0);
  return (l.cloneNode = l), l;
}
function le(e, t = window.document) {
  const n = t[Q] || (t[Q] = new Set());
  for (let r = 0, i = e.length; r < i; r++) {
    const s = e[r];
    n.has(s) || (n.add(s), t.addEventListener(s, xe));
  }
}
function ke(e, t, n, r) {
  Array.isArray(n) ? ((e[`$$${t}`] = n[0]), (e[`$$${t}Data`] = n[1])) : (e[`$$${t}`] = n);
}
function S(e, t, n, r) {
  if ((n !== void 0 && !r && (r = []), typeof t != 'function')) return W(e, t, r, n);
  G((i) => W(e, t(), i, n), r);
}
function xe(e) {
  let t = e.target;
  const n = `$$${e.type}`,
    r = e.target,
    i = e.currentTarget,
    s = (f) => Object.defineProperty(e, 'target', { configurable: !0, value: f }),
    l = () => {
      const f = t[n];
      if (f && !t.disabled) {
        const a = t[`${n}Data`];
        if ((a !== void 0 ? f.call(t, a, e) : f.call(t, e), e.cancelBubble)) return;
      }
      return (
        t.host &&
          typeof t.host != 'string' &&
          !t.host._$host &&
          t.contains(e.target) &&
          s(t.host),
        !0
      );
    },
    o = () => {
      for (; l() && (t = t._$host || t.parentNode || t.host); );
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
    s(f[0]);
    for (let a = 0; a < f.length - 2 && ((t = f[a]), !!l()); a++) {
      if (t._$host) {
        (t = t._$host), o();
        break;
      }
      if (t.parentNode === i) break;
    }
  } else o();
  s(r);
}
function W(e, t, n, r, i) {
  for (; typeof n == 'function'; ) n = n();
  if (t === n) return n;
  const s = typeof t,
    l = r !== void 0;
  if (((e = (l && n[0] && n[0].parentNode) || e), s === 'string' || s === 'number')) {
    if (s === 'number' && ((t = t.toString()), t === n)) return n;
    if (l) {
      let o = n[0];
      o && o.nodeType === 3
        ? o.data !== t && (o.data = t)
        : (o = document.createTextNode(t)),
        (n = E(e, n, r, o));
    } else
      n !== '' && typeof n == 'string'
        ? (n = e.firstChild.data = t)
        : (n = e.textContent = t);
  } else if (t == null || s === 'boolean') n = E(e, n, r);
  else {
    if (s === 'function')
      return (
        G(() => {
          let o = t();
          for (; typeof o == 'function'; ) o = o();
          n = W(e, o, n, r);
        }),
        () => n
      );
    if (Array.isArray(t)) {
      const o = [],
        f = n && Array.isArray(n);
      if (K(o, t, n, i)) return G(() => (n = W(e, o, n, r, !0))), () => n;
      if (o.length === 0) {
        if (((n = E(e, n, r)), l)) return n;
      } else f ? (n.length === 0 ? Y(e, o, r) : Ae(e, n, o)) : (n && E(e), Y(e, o));
      n = o;
    } else if (t.nodeType) {
      if (Array.isArray(n)) {
        if (l) return (n = E(e, n, r, t));
        E(e, n, null, t);
      } else
        n == null || n === '' || !e.firstChild
          ? e.appendChild(t)
          : e.replaceChild(t, e.firstChild);
      n = t;
    }
  }
  return n;
}
function K(e, t, n, r) {
  let i = !1;
  for (let s = 0, l = t.length; s < l; s++) {
    let o = t[s],
      f = n && n[e.length],
      a;
    if (!(o == null || o === !0 || o === !1))
      if ((a = typeof o) == 'object' && o.nodeType) e.push(o);
      else if (Array.isArray(o)) i = K(e, o, f) || i;
      else if (a === 'function')
        if (r) {
          for (; typeof o == 'function'; ) o = o();
          i = K(e, Array.isArray(o) ? o : [o], Array.isArray(f) ? f : [f]) || i;
        } else e.push(o), (i = !0);
      else {
        const u = String(o);
        f && f.nodeType === 3 && f.data === u
          ? e.push(f)
          : e.push(document.createTextNode(u));
      }
  }
  return i;
}
function Y(e, t, n = null) {
  for (let r = 0, i = t.length; r < i; r++) e.insertBefore(t[r], n);
}
function E(e, t, n, r) {
  if (n === void 0) return (e.textContent = '');
  const i = r || document.createTextNode('');
  if (t.length) {
    let s = !1;
    for (let l = t.length - 1; l >= 0; l--) {
      const o = t[l];
      if (i !== o) {
        const f = o.parentNode === e;
        !s && !l ? (f ? e.replaceChild(i, o) : e.insertBefore(i, n)) : f && o.remove();
      } else s = !0;
    }
  } else e.insertBefore(i, n);
  return [i];
}
var H = ((e) => (
  (e.START_POMODORO = 'START_POMODORO'), (e.START_FOCUS_MODE = 'START_FOCUS_MODE'), e
))(H || {});
const Te = [
  {
    id: 'overwhelm',
    title: 'Overwhelm',
    emotion: 'Too much at once',
    strategies: [
      'Create micro-tasks (5 min steps)',
      'Implementation Intentions (If X, then Y)',
      'Pick just one thing',
      { text: 'Start Focus Session', action: !0 },
    ],
  },
  {
    id: 'perfectionism',
    title: 'Perfectionism',
    emotion: "It's not perfect enough",
    strategies: [
      'Time-box your first draft (30 min)',
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
      { text: 'Schedule deep work block', action: !0 },
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
var Ce = k(
  `<div class="page-fade info-content"><div class=intro><h2>Understanding Procrastination</h2><p><strong>Procrastination is an emotion regulation problem, not a time management problem.</strong></p></div><section><h3>The Procrastination Cycle</h3><p>When we face tasks that trigger uncomfortable emotions, we enter a feedback loop:</p><div class=procrastination-graph><div class=graph-item>Fear of failure</div><div class=sync-icon>→</div><div class=graph-item>Avoid the task</div><div class=sync-icon>→</div><div class=graph-item>Temporary relief</div><div class=sync-icon>→</div><div class=graph-item>Increased anxiety</div></div></section><section><h3>Breaking the Cycle</h3><p>The key is to approach procrastination with curiosity and compassion, not judgment. Ask yourself:</p><ul><li>What emotions come up when I think about this task?</li><li>What specific aspect feels most challenging?</li><li>What am I afraid might happen if I start?</li></ul></section><section><h3>Practical Strategies</h3><ul><li><strong>Start small:</strong> What's the tiniest first step you could take?</li><li><strong>Time-box:</strong> Work for just 10-25 minutes, then take a break</li><li><strong>Reframe:</strong> Focus on progress over perfection</li><li><strong>Self-compassion:</strong> Speak to yourself as you would to a good friend</li></ul></section><section><h3>Common Triggers</h3><p>Procrastination is often triggered by perfectionism, fear of failure, feeling overwhelmed, unclear expectations, or finding the task boring. Identifying your specific trigger is the first step to moving forward.</p></section><div class=action-buttons><button class=primary-button>Back to work!`,
);
const Oe = (e) =>
  (() => {
    var t = Ce(),
      n = t.firstChild,
      r = n.nextSibling,
      i = r.nextSibling,
      s = i.nextSibling,
      l = s.nextSibling,
      o = l.nextSibling,
      f = o.firstChild;
    return ke(f, 'click', e.onBackToWork), t;
  })();
le(['click']);
var Ee = k('<header class="header page-fade"><button class=back-button>← Back'),
  Pe = k(
    `<div class="intro page-fade"><h2>What's holding you back?</h2><p class=text-muted>Choose what best matches your current feeling:</p><button class=info-button>Learn about procrastination →`,
  ),
  Ie = k('<div class="blocker-grid page-fade">'),
  Re = k(
    '<div class="strategy-container page-fade"><div class=selected-type><h2 class=text-primary></h2><p class="emotion text-muted"></p></div><h3>Recommended Strategies:</h3><div class=strategy-list>',
  ),
  De = k('<div class=app><main class=main>'),
  Be = k(
    '<button class="blocker-card card card-clickable"><h3 class=text-primary></h3><p class=text-muted>',
  ),
  Le = k(
    '<button class=strategy-action-btn title="Start a focus session">🎯 Start focus session',
  ),
  Me = k(
    '<div class="strategy-item card"><div class=strategy-content><p class=strategy-text>',
  );
const Ne = () => {
  const [e, t] = V('home'),
    [n, r] = V(null),
    i = (o) => {
      r(o), t('strategies');
    },
    s = () => {
      t('home'), r(null);
    },
    l = async (o, f) => {
      const a = window.PluginAPI;
      if (a)
        switch (o) {
          case H.START_FOCUS_MODE:
            return a.dispatchAction({ type: '[FocusMode] Show Focus Overlay' });
          case 'START_POMODORO':
            return a.dispatchAction({ type: '[Pomodoro] Start Pomodoro' });
        }
    };
  return (() => {
    var o = De(),
      f = o.firstChild;
    return (
      S(
        o,
        _(I, {
          get when() {
            return e() !== 'home';
          },
          get children() {
            var a = Ee(),
              u = a.firstChild;
            return (u.$$click = s), a;
          },
        }),
        f,
      ),
      S(
        f,
        _(I, {
          get when() {
            return e() === 'home';
          },
          get children() {
            return [
              (() => {
                var a = Pe(),
                  u = a.firstChild,
                  c = u.nextSibling,
                  m = c.nextSibling;
                return (m.$$click = () => t('info')), a;
              })(),
              (() => {
                var a = Ie();
                return (
                  S(
                    a,
                    _(J, {
                      each: Te,
                      children: (u) =>
                        (() => {
                          var c = Be(),
                            m = c.firstChild,
                            g = m.nextSibling;
                          return (
                            (c.$$click = () => i(u)),
                            S(m, () => u.title),
                            S(g, () => u.emotion),
                            c
                          );
                        })(),
                    }),
                  ),
                  a
                );
              })(),
            ];
          },
        }),
        null,
      ),
      S(
        f,
        _(I, {
          get when() {
            return e() === 'info';
          },
          get children() {
            return _(Oe, { onBackToWork: () => l(H.START_FOCUS_MODE) });
          },
        }),
        null,
      ),
      S(
        f,
        _(I, {
          get when() {
            return $e(() => e() === 'strategies')() && n();
          },
          get children() {
            var a = Re(),
              u = a.firstChild,
              c = u.firstChild,
              m = c.nextSibling,
              g = u.nextSibling,
              $ = g.nextSibling;
            return (
              S(c, () => n().title),
              S(m, () => n().emotion),
              S(
                $,
                _(J, {
                  get each() {
                    return n().strategies;
                  },
                  children: (w) => {
                    const C = typeof w == 'string' ? w : w.text,
                      O = typeof w != 'string' && w.action;
                    return (() => {
                      var y = Me(),
                        b = y.firstChild,
                        v = b.firstChild;
                      return (
                        S(v, C),
                        S(
                          b,
                          _(I, {
                            when: O,
                            get children() {
                              var A = Le();
                              return (A.$$click = () => l('START_POMODORO')), A;
                            },
                          }),
                          null,
                        ),
                        y
                      );
                    })();
                  },
                }),
              ),
              a
            );
          },
        }),
        null,
      ),
      o
    );
  })();
};
le(['click']);
const Z = document.getElementById('root');
function ce() {
  typeof window.PluginAPI < 'u' ? Z && _e(() => _(Ne, {}), Z) : setTimeout(ce, 100);
}
ce();
