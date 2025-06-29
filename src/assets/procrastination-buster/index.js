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
const ce = !0,
  ue = (e, t) => e === t,
  fe = Symbol('solid-track'),
  de = Symbol('solid-dev-component'),
  N = { equals: ue };
let he = ie;
const k = 1,
  F = 2,
  pe = {};
var d = null;
let V = null,
  ge = null,
  h = null,
  p = null,
  x = null,
  j = 0;
function L(e, t) {
  const n = h,
    r = d,
    i = e.length === 0,
    s = t === void 0 ? r : t,
    l = i
      ? { owned: null, cleanups: null, context: null, owner: null }
      : { owned: null, cleanups: null, context: s ? s.context : null, owner: s },
    o = i
      ? () =>
          e(() => {
            throw new Error(
              'Dispose method must be an explicit argument to createRoot function',
            );
          })
      : () => e(() => P(() => D(l)));
  (d = l), (h = null);
  try {
    return B(o, !0);
  } finally {
    (h = n), (d = r);
  }
}
function q(e, t) {
  t = t ? Object.assign({}, N, t) : N;
  const n = {
    value: e,
    observers: null,
    observerSlots: null,
    comparator: t.equals || void 0,
  };
  t.name && (n.name = t.name), t.internal ? (n.internal = !0) : be(n);
  const r = (i) => (typeof i == 'function' && (i = i(n.value)), te(n, i));
  return [ee.bind(n), r];
}
function G(e, t, n) {
  const r = X(e, t, !1, k, n);
  M(r);
}
function R(e, t, n) {
  n = n ? Object.assign({}, N, n) : N;
  const r = X(e, t, !0, 0, n);
  return (
    (r.observers = null),
    (r.observerSlots = null),
    (r.comparator = n.equals || void 0),
    M(r),
    ee.bind(r)
  );
}
function P(e) {
  if (h === null) return e();
  const t = h;
  h = null;
  try {
    return e();
  } finally {
    h = t;
  }
}
function me(e) {
  return (
    d === null
      ? console.warn(
          'cleanups created outside a `createRoot` or `render` will never be run',
        )
      : d.cleanups === null
        ? (d.cleanups = [e])
        : d.cleanups.push(e),
    e
  );
}
function we(e, t) {
  const n = X(() => P(() => (Object.assign(e, { [de]: !0 }), e(t))), void 0, !0, 0);
  return (
    (n.props = t),
    (n.observers = null),
    (n.observerSlots = null),
    (n.name = e.name),
    (n.component = e),
    M(n),
    n.tValue !== void 0 ? n.tValue : n.value
  );
}
function be(e) {
  d && (d.sourceMap ? d.sourceMap.push(e) : (d.sourceMap = [e]), (e.graph = d));
}
function ee() {
  if (this.sources && this.state)
    if (this.state === k) M(this);
    else {
      const e = p;
      (p = null), B(() => W(this), !1), (p = e);
    }
  if (h) {
    const e = this.observers ? this.observers.length : 0;
    h.sources
      ? (h.sources.push(this), h.sourceSlots.push(e))
      : ((h.sources = [this]), (h.sourceSlots = [e])),
      this.observers
        ? (this.observers.push(h), this.observerSlots.push(h.sources.length - 1))
        : ((this.observers = [h]), (this.observerSlots = [h.sources.length - 1]));
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
              l = V && V.running;
            l && V.disposed.has(s),
              (l ? !s.tState : !s.state) &&
                (s.pure ? p.push(s) : x.push(s), s.observers && se(s)),
              l || (s.state = k);
          }
          if (p.length > 1e6)
            throw (
              ((p = []),
              ce ? new Error('Potential Infinite Loop Detected.') : new Error())
            );
        }, !1)),
    t
  );
}
function M(e) {
  if (!e.fn) return;
  D(e);
  const t = j;
  ye(e, e.value, t);
}
function ye(e, t, n) {
  let r;
  const i = d,
    s = h;
  h = d = e;
  try {
    r = e.fn(t);
  } catch (l) {
    return (
      e.pure && ((e.state = k), e.owned && e.owned.forEach(D), (e.owned = null)),
      (e.updatedAt = n + 1),
      re(l)
    );
  } finally {
    (h = s), (d = i);
  }
  (!e.updatedAt || e.updatedAt <= n) &&
    (e.updatedAt != null && 'observers' in e ? te(e, r) : (e.value = r),
    (e.updatedAt = n));
}
function X(e, t, n, r = k, i) {
  const s = {
    fn: e,
    state: r,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value: t,
    owner: d,
    context: d ? d.context : null,
    pure: n,
  };
  return (
    d === null
      ? console.warn(
          'computations created outside a `createRoot` or `render` will never be disposed',
        )
      : d !== pe && (d.owned ? d.owned.push(s) : (d.owned = [s])),
    i && i.name && (s.name = i.name),
    s
  );
}
function ne(e) {
  if (e.state === 0) return;
  if (e.state === F) return W(e);
  if (e.suspense && P(e.suspense.inFallback)) return e.suspense.effects.push(e);
  const t = [e];
  for (; (e = e.owner) && (!e.updatedAt || e.updatedAt < j); ) e.state && t.push(e);
  for (let n = t.length - 1; n >= 0; n--)
    if (((e = t[n]), e.state === k)) M(e);
    else if (e.state === F) {
      const r = p;
      (p = null), B(() => W(e, t[0]), !1), (p = r);
    }
}
function B(e, t) {
  if (p) return e();
  let n = !1;
  t || (p = []), x ? (n = !0) : (x = []), j++;
  try {
    const r = e();
    return ve(n), r;
  } catch (r) {
    n || (x = null), (p = null), re(r);
  }
}
function ve(e) {
  if ((p && (ie(p), (p = null)), e)) return;
  const t = x;
  (x = null), t.length && B(() => he(t), !1);
}
function ie(e) {
  for (let t = 0; t < e.length; t++) ne(e[t]);
}
function W(e, t) {
  e.state = 0;
  for (let n = 0; n < e.sources.length; n += 1) {
    const r = e.sources[n];
    if (r.sources) {
      const i = r.state;
      i === k
        ? r !== t && (!r.updatedAt || r.updatedAt < j) && ne(r)
        : i === F && W(r, t);
    }
  }
}
function se(e) {
  for (let t = 0; t < e.observers.length; t += 1) {
    const n = e.observers[t];
    n.state || ((n.state = F), n.pure ? p.push(n) : x.push(n), n.observers && se(n));
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
  (e.state = 0), delete e.sourceMap;
}
function Se(e) {
  return e instanceof Error
    ? e
    : new Error(typeof e == 'string' ? e : 'Unknown error', { cause: e });
}
function re(e, t = d) {
  throw Se(e);
}
const $e = Symbol('fallback');
function Y(e) {
  for (let t = 0; t < e.length; t++) e[t]();
}
function Ae(e, t, n = {}) {
  let r = [],
    i = [],
    s = [],
    l = 0,
    o = t.length > 1 ? [] : null;
  return (
    me(() => Y(s)),
    () => {
      let u = e() || [],
        c = u.length,
        f,
        a;
      return (
        u[fe],
        P(() => {
          let g, $, w, C, O, b, y, S, A;
          if (c === 0)
            l !== 0 && (Y(s), (s = []), (r = []), (i = []), (l = 0), o && (o = [])),
              n.fallback &&
                ((r = [$e]), (i[0] = L((ae) => ((s[0] = ae), n.fallback()))), (l = 1));
          else if (l === 0) {
            for (i = new Array(c), a = 0; a < c; a++) (r[a] = u[a]), (i[a] = L(m));
            l = c;
          } else {
            for (
              w = new Array(c),
                C = new Array(c),
                o && (O = new Array(c)),
                b = 0,
                y = Math.min(l, c);
              b < y && r[b] === u[b];
              b++
            );
            for (y = l - 1, S = c - 1; y >= b && S >= b && r[y] === u[S]; y--, S--)
              (w[S] = i[y]), (C[S] = s[y]), o && (O[S] = o[y]);
            for (g = new Map(), $ = new Array(S + 1), a = S; a >= b; a--)
              (A = u[a]), (f = g.get(A)), ($[a] = f === void 0 ? -1 : f), g.set(A, a);
            for (f = b; f <= y; f++)
              (A = r[f]),
                (a = g.get(A)),
                a !== void 0 && a !== -1
                  ? ((w[a] = i[f]),
                    (C[a] = s[f]),
                    o && (O[a] = o[f]),
                    (a = $[a]),
                    g.set(A, a))
                  : s[f]();
            for (a = b; a < c; a++)
              a in w
                ? ((i[a] = w[a]), (s[a] = C[a]), o && ((o[a] = O[a]), o[a](a)))
                : (i[a] = L(m));
            (i = i.slice(0, (l = c))), (r = u.slice(0));
          }
          return i;
        })
      );
      function m(g) {
        if (((s[a] = g), o)) {
          const [$, w] = q(a, { name: 'index' });
          return (o[a] = w), t(u[a], $);
        }
        return t(u[a]);
      }
    }
  );
}
function _(e, t) {
  return we(e, t || {});
}
const _e = (e) =>
  `Attempting to access a stale value from <${e}> that could possibly be undefined. This may occur because you are reading the accessor returned from the component at a time where it has already been unmounted. We recommend cleaning up any stale timers or async, or reading from the initial condition.`;
function J(e) {
  const t = 'fallback' in e && { fallback: () => e.fallback };
  return R(
    Ae(() => e.each, e.children, t || void 0),
    void 0,
    { name: 'value' },
  );
}
function I(e) {
  const t = e.keyed,
    n = R(() => e.when, void 0, { name: 'condition value' }),
    r = t ? n : R(n, void 0, { equals: (i, s) => !i == !s, name: 'condition' });
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
                      if (!P(r)) throw _e('Show');
                      return n();
                    },
              ),
            )
          : s;
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
const Te = (e) => R(() => e());
function xe(e, t, n) {
  let r = n.length,
    i = t.length,
    s = r,
    l = 0,
    o = 0,
    u = t[i - 1].nextSibling,
    c = null;
  for (; l < i || o < s; ) {
    if (t[l] === n[o]) {
      l++, o++;
      continue;
    }
    for (; t[i - 1] === n[s - 1]; ) i--, s--;
    if (i === l) {
      const f = s < r ? (o ? n[o - 1].nextSibling : n[s - o]) : u;
      for (; o < s; ) e.insertBefore(n[o++], f);
    } else if (s === o) for (; l < i; ) (!c || !c.has(t[l])) && t[l].remove(), l++;
    else if (t[l] === n[s - 1] && n[o] === t[i - 1]) {
      const f = t[--i].nextSibling;
      e.insertBefore(n[o++], t[l++].nextSibling),
        e.insertBefore(n[--s], f),
        (t[i] = n[s]);
    } else {
      if (!c) {
        c = new Map();
        let a = o;
        for (; a < s; ) c.set(n[a], a++);
      }
      const f = c.get(t[l]);
      if (f != null)
        if (o < f && f < s) {
          let a = l,
            m = 1,
            g;
          for (; ++a < i && a < s && !((g = c.get(t[a])) == null || g !== f + m); ) m++;
          if (m > f - o) {
            const $ = t[l];
            for (; o < f; ) e.insertBefore(n[o++], $);
          } else e.replaceChild(n[o++], t[l++]);
        } else l++;
      else t[l++].remove();
    }
  }
}
const Q = '_$DX_DELEGATE';
function ke(e, t, n, r = {}) {
  if (!t)
    throw new Error(
      "The `element` passed to `render(..., element)` doesn't exist. Make sure `element` exists in the document.",
    );
  let i;
  return (
    L((s) => {
      (i = s), t === document ? e() : v(t, e(), t.firstChild ? null : void 0, n);
    }, r.owner),
    () => {
      i(), (t.textContent = '');
    }
  );
}
function T(e, t, n, r) {
  let i;
  const s = () => {
      const o = document.createElement('template');
      return (o.innerHTML = e), o.content.firstChild;
    },
    l = () => (i || (i = s())).cloneNode(!0);
  return (l.cloneNode = l), l;
}
function oe(e, t = window.document) {
  const n = t[Q] || (t[Q] = new Set());
  for (let r = 0, i = e.length; r < i; r++) {
    const s = e[r];
    n.has(s) || (n.add(s), t.addEventListener(s, Oe));
  }
}
function Ce(e, t, n, r) {
  Array.isArray(n) ? ((e[`$$${t}`] = n[0]), (e[`$$${t}Data`] = n[1])) : (e[`$$${t}`] = n);
}
function v(e, t, n, r) {
  if ((n !== void 0 && !r && (r = []), typeof t != 'function')) return U(e, t, r, n);
  G((i) => U(e, t(), i, n), r);
}
function Oe(e) {
  let t = e.target;
  const n = `$$${e.type}`,
    r = e.target,
    i = e.currentTarget,
    s = (u) => Object.defineProperty(e, 'target', { configurable: !0, value: u }),
    l = () => {
      const u = t[n];
      if (u && !t.disabled) {
        const c = t[`${n}Data`];
        if ((c !== void 0 ? u.call(t, c, e) : u.call(t, e), e.cancelBubble)) return;
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
    const u = e.composedPath();
    s(u[0]);
    for (let c = 0; c < u.length - 2 && ((t = u[c]), !!l()); c++) {
      if (t._$host) {
        (t = t._$host), o();
        break;
      }
      if (t.parentNode === i) break;
    }
  } else o();
  s(r);
}
function U(e, t, n, r, i) {
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
          n = U(e, o, n, r);
        }),
        () => n
      );
    if (Array.isArray(t)) {
      const o = [],
        u = n && Array.isArray(n);
      if (K(o, t, n, i)) return G(() => (n = U(e, o, n, r, !0))), () => n;
      if (o.length === 0) {
        if (((n = E(e, n, r)), l)) return n;
      } else u ? (n.length === 0 ? Z(e, o, r) : xe(e, n, o)) : (n && E(e), Z(e, o));
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
    } else console.warn('Unrecognized value. Skipped inserting', t);
  }
  return n;
}
function K(e, t, n, r) {
  let i = !1;
  for (let s = 0, l = t.length; s < l; s++) {
    let o = t[s],
      u = n && n[e.length],
      c;
    if (!(o == null || o === !0 || o === !1))
      if ((c = typeof o) == 'object' && o.nodeType) e.push(o);
      else if (Array.isArray(o)) i = K(e, o, u) || i;
      else if (c === 'function')
        if (r) {
          for (; typeof o == 'function'; ) o = o();
          i = K(e, Array.isArray(o) ? o : [o], Array.isArray(u) ? u : [u]) || i;
        } else e.push(o), (i = !0);
      else {
        const f = String(o);
        u && u.nodeType === 3 && u.data === f
          ? e.push(u)
          : e.push(document.createTextNode(f));
      }
  }
  return i;
}
function Z(e, t, n = null) {
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
        const u = o.parentNode === e;
        !s && !l ? (u ? e.replaceChild(i, o) : e.insertBefore(i, n)) : u && o.remove();
      } else s = !0;
    }
  } else e.insertBefore(i, n);
  return [i];
}
var H = ((e) => (
  (e.START_POMODORO = 'START_POMODORO'), (e.START_FOCUS_MODE = 'START_FOCUS_MODE'), e
))(H || {});
const Ee = [
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
var Pe = T(
  `<div class="page-fade info-content"><div class=intro><h2>Understanding Procrastination</h2><p><strong>Procrastination is an emotion regulation problem, not a time management problem.</strong></p></div><section><h3>The Procrastination Cycle</h3><p>When we face tasks that trigger uncomfortable emotions, we enter a feedback loop:</p><div class=procrastination-graph><div class=graph-item>Fear of failure</div><div class=sync-icon>→</div><div class=graph-item>Avoid the task</div><div class=sync-icon>→</div><div class=graph-item>Temporary relief</div><div class=sync-icon>→</div><div class=graph-item>Increased anxiety</div></div></section><section><h3>Breaking the Cycle</h3><p>The key is to approach procrastination with curiosity and compassion, not judgment. Ask yourself:</p><ul><li>What emotions come up when I think about this task?</li><li>What specific aspect feels most challenging?</li><li>What am I afraid might happen if I start?</li></ul></section><section><h3>Practical Strategies</h3><ul><li><strong>Start small:</strong> What's the tiniest first step you could take?</li><li><strong>Time-box:</strong> Work for just 10-25 minutes, then take a break</li><li><strong>Reframe:</strong> Focus on progress over perfection</li><li><strong>Self-compassion:</strong> Speak to yourself as you would to a good friend</li></ul></section><section><h3>Common Triggers</h3><p>Procrastination is often triggered by perfectionism, fear of failure, feeling overwhelmed, unclear expectations, or finding the task boring. Identifying your specific trigger is the first step to moving forward.</p></section><div class=action-buttons><button class=primary-button>Back to work!`,
);
const Ie = (e) =>
  (() => {
    var t = Pe(),
      n = t.firstChild,
      r = n.nextSibling,
      i = r.nextSibling,
      s = i.nextSibling,
      l = s.nextSibling,
      o = l.nextSibling,
      u = o.firstChild;
    return Ce(u, 'click', e.onBackToWork), t;
  })();
oe(['click']);
var Re = T('<header class="header page-fade"><button class=back-button>← Back'),
  De = T(
    `<div class="intro page-fade"><h2>What's holding you back?</h2><p class=text-muted>Choose what best matches your current feeling:</p><button class=info-button>Learn about procrastination →`,
  ),
  Me = T('<div class="blocker-grid page-fade">'),
  Be = T(
    '<div class="strategy-container page-fade"><div class=selected-type><h2 class=text-primary></h2><p class="emotion text-muted"></p></div><h3>Recommended Strategies:</h3><div class=strategy-list>',
  ),
  Le = T('<div class=app><main class=main>'),
  Ne = T(
    '<button class="blocker-card card card-clickable"><h3 class=text-primary></h3><p class=text-muted>',
  ),
  Fe = T(
    '<button class=strategy-action-btn title="Start a focus session">🎯 Start focus session',
  ),
  We = T(
    '<div class="strategy-item card"><div class=strategy-content><p class=strategy-text>',
  );
const Ue = () => {
  const [e, t] = q('home'),
    [n, r] = q(null),
    i = (o) => {
      r(o), t('strategies');
    },
    s = () => {
      t('home'), r(null);
    },
    l = async (o, u) => {
      const c = window.PluginAPI;
      if (c)
        switch (o) {
          case H.START_FOCUS_MODE:
            return c.dispatchAction({ type: '[FocusMode] Show Focus Overlay' });
          case 'START_POMODORO':
            return c.dispatchAction({ type: '[Pomodoro] Start Pomodoro' });
        }
    };
  return (() => {
    var o = Le(),
      u = o.firstChild;
    return (
      v(
        o,
        _(I, {
          get when() {
            return e() !== 'home';
          },
          get children() {
            var c = Re(),
              f = c.firstChild;
            return (f.$$click = s), c;
          },
        }),
        u,
      ),
      v(
        u,
        _(I, {
          get when() {
            return e() === 'home';
          },
          get children() {
            return [
              (() => {
                var c = De(),
                  f = c.firstChild,
                  a = f.nextSibling,
                  m = a.nextSibling;
                return (m.$$click = () => t('info')), c;
              })(),
              (() => {
                var c = Me();
                return (
                  v(
                    c,
                    _(J, {
                      each: Ee,
                      children: (f) =>
                        (() => {
                          var a = Ne(),
                            m = a.firstChild,
                            g = m.nextSibling;
                          return (
                            (a.$$click = () => i(f)),
                            v(m, () => f.title),
                            v(g, () => f.emotion),
                            a
                          );
                        })(),
                    }),
                  ),
                  c
                );
              })(),
            ];
          },
        }),
        null,
      ),
      v(
        u,
        _(I, {
          get when() {
            return e() === 'info';
          },
          get children() {
            return _(Ie, { onBackToWork: () => l(H.START_FOCUS_MODE) });
          },
        }),
        null,
      ),
      v(
        u,
        _(I, {
          get when() {
            return Te(() => e() === 'strategies')() && n();
          },
          get children() {
            var c = Be(),
              f = c.firstChild,
              a = f.firstChild,
              m = a.nextSibling,
              g = f.nextSibling,
              $ = g.nextSibling;
            return (
              v(a, () => n().title),
              v(m, () => n().emotion),
              v(
                $,
                _(J, {
                  get each() {
                    return n().strategies;
                  },
                  children: (w) => {
                    const C = typeof w == 'string' ? w : w.text,
                      O = typeof w != 'string' && w.action;
                    return (() => {
                      var b = We(),
                        y = b.firstChild,
                        S = y.firstChild;
                      return (
                        v(S, C),
                        v(
                          y,
                          _(I, {
                            when: O,
                            get children() {
                              var A = Fe();
                              return (A.$$click = () => l('START_POMODORO')), A;
                            },
                          }),
                          null,
                        ),
                        b
                      );
                    })();
                  },
                }),
              ),
              c
            );
          },
        }),
        null,
      ),
      o
    );
  })();
};
oe(['click']);
const z = document.getElementById('root');
function le() {
  typeof window.PluginAPI < 'u' ? z && ke(() => _(Ue, {}), z) : setTimeout(le, 100);
}
le();
