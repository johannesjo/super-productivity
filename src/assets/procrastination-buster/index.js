(function () {
  const t = document.createElement('link').relList;
  if (t && t.supports && t.supports('modulepreload')) return;
  for (const s of document.querySelectorAll('link[rel="modulepreload"]')) r(s);
  new MutationObserver((s) => {
    for (const i of s)
      if (i.type === 'childList')
        for (const l of i.addedNodes)
          l.tagName === 'LINK' && l.rel === 'modulepreload' && r(l);
  }).observe(document, { childList: !0, subtree: !0 });
  function n(s) {
    const i = {};
    return (
      s.integrity && (i.integrity = s.integrity),
      s.referrerPolicy && (i.referrerPolicy = s.referrerPolicy),
      s.crossOrigin === 'use-credentials'
        ? (i.credentials = 'include')
        : s.crossOrigin === 'anonymous'
          ? (i.credentials = 'omit')
          : (i.credentials = 'same-origin'),
      i
    );
  }
  function r(s) {
    if (s.ep) return;
    s.ep = !0;
    const i = n(s);
    fetch(s.href, i);
  }
})();
const ae = !0,
  ce = (e, t) => e === t,
  ue = Symbol('solid-track'),
  fe = Symbol('solid-dev-component'),
  N = { equals: ce };
let de = ne;
const T = 1,
  W = 2,
  he = {};
var d = null;
let V = null,
  ge = null,
  h = null,
  p = null,
  A = null,
  j = 0;
function B(e, t) {
  const n = h,
    r = d,
    s = e.length === 0,
    i = t === void 0 ? r : t,
    l = s
      ? { owned: null, cleanups: null, context: null, owner: null }
      : { owned: null, cleanups: null, context: i ? i.context : null, owner: i },
    o = s
      ? () =>
          e(() => {
            throw new Error(
              'Dispose method must be an explicit argument to createRoot function',
            );
          })
      : () => e(() => I(() => D(l)));
  (d = l), (h = null);
  try {
    return R(o, !0);
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
  t.name && (n.name = t.name), t.internal ? (n.internal = !0) : we(n);
  const r = (s) => (typeof s == 'function' && (s = s(n.value)), ee(n, s));
  return [z.bind(n), r];
}
function G(e, t, n) {
  const r = H(e, t, !1, T, n);
  L(r);
}
function M(e, t, n) {
  n = n ? Object.assign({}, N, n) : N;
  const r = H(e, t, !0, 0, n);
  return (
    (r.observers = null),
    (r.observerSlots = null),
    (r.comparator = n.equals || void 0),
    L(r),
    z.bind(r)
  );
}
function I(e) {
  if (h === null) return e();
  const t = h;
  h = null;
  try {
    return e();
  } finally {
    h = t;
  }
}
function pe(e) {
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
function me(e, t) {
  const n = H(() => I(() => (Object.assign(e, { [fe]: !0 }), e(t))), void 0, !0, 0);
  return (
    (n.props = t),
    (n.observers = null),
    (n.observerSlots = null),
    (n.name = e.name),
    (n.component = e),
    L(n),
    n.tValue !== void 0 ? n.tValue : n.value
  );
}
function we(e) {
  d && (d.sourceMap ? d.sourceMap.push(e) : (d.sourceMap = [e]), (e.graph = d));
}
function z() {
  if (this.sources && this.state)
    if (this.state === T) L(this);
    else {
      const e = p;
      (p = null), R(() => U(this), !1), (p = e);
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
function ee(e, t, n) {
  let r = e.value;
  return (
    (!e.comparator || !e.comparator(r, t)) &&
      ((e.value = t),
      e.observers &&
        e.observers.length &&
        R(() => {
          for (let s = 0; s < e.observers.length; s += 1) {
            const i = e.observers[s],
              l = V && V.running;
            l && V.disposed.has(i),
              (l ? !i.tState : !i.state) &&
                (i.pure ? p.push(i) : A.push(i), i.observers && se(i)),
              l || (i.state = T);
          }
          if (p.length > 1e6)
            throw (
              ((p = []),
              ae ? new Error('Potential Infinite Loop Detected.') : new Error())
            );
        }, !1)),
    t
  );
}
function L(e) {
  if (!e.fn) return;
  D(e);
  const t = j;
  be(e, e.value, t);
}
function be(e, t, n) {
  let r;
  const s = d,
    i = h;
  h = d = e;
  try {
    r = e.fn(t);
  } catch (l) {
    return (
      e.pure && ((e.state = T), e.owned && e.owned.forEach(D), (e.owned = null)),
      (e.updatedAt = n + 1),
      ie(l)
    );
  } finally {
    (h = i), (d = s);
  }
  (!e.updatedAt || e.updatedAt <= n) &&
    (e.updatedAt != null && 'observers' in e ? ee(e, r) : (e.value = r),
    (e.updatedAt = n));
}
function H(e, t, n, r = T, s) {
  const i = {
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
      : d !== he && (d.owned ? d.owned.push(i) : (d.owned = [i])),
    s && s.name && (i.name = s.name),
    i
  );
}
function te(e) {
  if (e.state === 0) return;
  if (e.state === W) return U(e);
  if (e.suspense && I(e.suspense.inFallback)) return e.suspense.effects.push(e);
  const t = [e];
  for (; (e = e.owner) && (!e.updatedAt || e.updatedAt < j); ) e.state && t.push(e);
  for (let n = t.length - 1; n >= 0; n--)
    if (((e = t[n]), e.state === T)) L(e);
    else if (e.state === W) {
      const r = p;
      (p = null), R(() => U(e, t[0]), !1), (p = r);
    }
}
function R(e, t) {
  if (p) return e();
  let n = !1;
  t || (p = []), A ? (n = !0) : (A = []), j++;
  try {
    const r = e();
    return ye(n), r;
  } catch (r) {
    n || (A = null), (p = null), ie(r);
  }
}
function ye(e) {
  if ((p && (ne(p), (p = null)), e)) return;
  const t = A;
  (A = null), t.length && R(() => de(t), !1);
}
function ne(e) {
  for (let t = 0; t < e.length; t++) te(e[t]);
}
function U(e, t) {
  e.state = 0;
  for (let n = 0; n < e.sources.length; n += 1) {
    const r = e.sources[n];
    if (r.sources) {
      const s = r.state;
      s === T
        ? r !== t && (!r.updatedAt || r.updatedAt < j) && te(r)
        : s === W && U(r, t);
    }
  }
}
function se(e) {
  for (let t = 0; t < e.observers.length; t += 1) {
    const n = e.observers[t];
    n.state || ((n.state = W), n.pure ? p.push(n) : A.push(n), n.observers && se(n));
  }
}
function D(e) {
  let t;
  if (e.sources)
    for (; e.sources.length; ) {
      const n = e.sources.pop(),
        r = e.sourceSlots.pop(),
        s = n.observers;
      if (s && s.length) {
        const i = s.pop(),
          l = n.observerSlots.pop();
        r < s.length && ((i.sourceSlots[l] = r), (s[r] = i), (n.observerSlots[r] = l));
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
function ve(e) {
  return e instanceof Error
    ? e
    : new Error(typeof e == 'string' ? e : 'Unknown error', { cause: e });
}
function ie(e, t = d) {
  throw ve(e);
}
const Se = Symbol('fallback');
function X(e) {
  for (let t = 0; t < e.length; t++) e[t]();
}
function $e(e, t, n = {}) {
  let r = [],
    s = [],
    i = [],
    l = 0,
    o = t.length > 1 ? [] : null;
  return (
    pe(() => X(i)),
    () => {
      let c = e() || [],
        u = c.length,
        f,
        a;
      return (
        c[ue],
        I(() => {
          let m, $, w, C, E, b, y, S, x;
          if (u === 0)
            l !== 0 && (X(i), (i = []), (r = []), (s = []), (l = 0), o && (o = [])),
              n.fallback &&
                ((r = [Se]), (s[0] = B((le) => ((i[0] = le), n.fallback()))), (l = 1));
          else if (l === 0) {
            for (s = new Array(u), a = 0; a < u; a++) (r[a] = c[a]), (s[a] = B(g));
            l = u;
          } else {
            for (
              w = new Array(u),
                C = new Array(u),
                o && (E = new Array(u)),
                b = 0,
                y = Math.min(l, u);
              b < y && r[b] === c[b];
              b++
            );
            for (y = l - 1, S = u - 1; y >= b && S >= b && r[y] === c[S]; y--, S--)
              (w[S] = s[y]), (C[S] = i[y]), o && (E[S] = o[y]);
            for (m = new Map(), $ = new Array(S + 1), a = S; a >= b; a--)
              (x = c[a]), (f = m.get(x)), ($[a] = f === void 0 ? -1 : f), m.set(x, a);
            for (f = b; f <= y; f++)
              (x = r[f]),
                (a = m.get(x)),
                a !== void 0 && a !== -1
                  ? ((w[a] = s[f]),
                    (C[a] = i[f]),
                    o && (E[a] = o[f]),
                    (a = $[a]),
                    m.set(x, a))
                  : i[f]();
            for (a = b; a < u; a++)
              a in w
                ? ((s[a] = w[a]), (i[a] = C[a]), o && ((o[a] = E[a]), o[a](a)))
                : (s[a] = B(g));
            (s = s.slice(0, (l = u))), (r = c.slice(0));
          }
          return s;
        })
      );
      function g(m) {
        if (((i[a] = m), o)) {
          const [$, w] = q(a, { name: 'index' });
          return (o[a] = w), t(c[a], $);
        }
        return t(c[a]);
      }
    }
  );
}
function k(e, t) {
  return me(e, t || {});
}
const xe = (e) =>
  `Attempting to access a stale value from <${e}> that could possibly be undefined. This may occur because you are reading the accessor returned from the component at a time where it has already been unmounted. We recommend cleaning up any stale timers or async, or reading from the initial condition.`;
function Y(e) {
  const t = 'fallback' in e && { fallback: () => e.fallback };
  return M(
    $e(() => e.each, e.children, t || void 0),
    void 0,
    { name: 'value' },
  );
}
function P(e) {
  const t = e.keyed,
    n = M(() => e.when, void 0, { name: 'condition value' }),
    r = t ? n : M(n, void 0, { equals: (s, i) => !s == !i, name: 'condition' });
  return M(
    () => {
      const s = r();
      if (s) {
        const i = e.children;
        return typeof i == 'function' && i.length > 0
          ? I(() =>
              i(
                t
                  ? s
                  : () => {
                      if (!I(r)) throw xe('Show');
                      return n();
                    },
              ),
            )
          : i;
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
const ke = (e) => M(() => e());
function _e(e, t, n) {
  let r = n.length,
    s = t.length,
    i = r,
    l = 0,
    o = 0,
    c = t[s - 1].nextSibling,
    u = null;
  for (; l < s || o < i; ) {
    if (t[l] === n[o]) {
      l++, o++;
      continue;
    }
    for (; t[s - 1] === n[i - 1]; ) s--, i--;
    if (s === l) {
      const f = i < r ? (o ? n[o - 1].nextSibling : n[i - o]) : c;
      for (; o < i; ) e.insertBefore(n[o++], f);
    } else if (i === o) for (; l < s; ) (!u || !u.has(t[l])) && t[l].remove(), l++;
    else if (t[l] === n[i - 1] && n[o] === t[s - 1]) {
      const f = t[--s].nextSibling;
      e.insertBefore(n[o++], t[l++].nextSibling),
        e.insertBefore(n[--i], f),
        (t[s] = n[i]);
    } else {
      if (!u) {
        u = new Map();
        let a = o;
        for (; a < i; ) u.set(n[a], a++);
      }
      const f = u.get(t[l]);
      if (f != null)
        if (o < f && f < i) {
          let a = l,
            g = 1,
            m;
          for (; ++a < s && a < i && !((m = u.get(t[a])) == null || m !== f + g); ) g++;
          if (g > f - o) {
            const $ = t[l];
            for (; o < f; ) e.insertBefore(n[o++], $);
          } else e.replaceChild(n[o++], t[l++]);
        } else l++;
      else t[l++].remove();
    }
  }
}
const J = '_$DX_DELEGATE';
function Ae(e, t, n, r = {}) {
  if (!t)
    throw new Error(
      "The `element` passed to `render(..., element)` doesn't exist. Make sure `element` exists in the document.",
    );
  let s;
  return (
    B((i) => {
      (s = i), t === document ? e() : v(t, e(), t.firstChild ? null : void 0, n);
    }, r.owner),
    () => {
      s(), (t.textContent = '');
    }
  );
}
function _(e, t, n, r) {
  let s;
  const i = () => {
      const o = document.createElement('template');
      return (o.innerHTML = e), o.content.firstChild;
    },
    l = () => (s || (s = i())).cloneNode(!0);
  return (l.cloneNode = l), l;
}
function re(e, t = window.document) {
  const n = t[J] || (t[J] = new Set());
  for (let r = 0, s = e.length; r < s; r++) {
    const i = e[r];
    n.has(i) || (n.add(i), t.addEventListener(i, Ce));
  }
}
function Te(e, t, n, r) {
  Array.isArray(n) ? ((e[`$$${t}`] = n[0]), (e[`$$${t}Data`] = n[1])) : (e[`$$${t}`] = n);
}
function v(e, t, n, r) {
  if ((n !== void 0 && !r && (r = []), typeof t != 'function')) return F(e, t, r, n);
  G((s) => F(e, t(), s, n), r);
}
function Ce(e) {
  let t = e.target;
  const n = `$$${e.type}`,
    r = e.target,
    s = e.currentTarget,
    i = (c) => Object.defineProperty(e, 'target', { configurable: !0, value: c }),
    l = () => {
      const c = t[n];
      if (c && !t.disabled) {
        const u = t[`${n}Data`];
        if ((u !== void 0 ? c.call(t, u, e) : c.call(t, e), e.cancelBubble)) return;
      }
      return (
        t.host &&
          typeof t.host != 'string' &&
          !t.host._$host &&
          t.contains(e.target) &&
          i(t.host),
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
    const c = e.composedPath();
    i(c[0]);
    for (let u = 0; u < c.length - 2 && ((t = c[u]), !!l()); u++) {
      if (t._$host) {
        (t = t._$host), o();
        break;
      }
      if (t.parentNode === s) break;
    }
  } else o();
  i(r);
}
function F(e, t, n, r, s) {
  for (; typeof n == 'function'; ) n = n();
  if (t === n) return n;
  const i = typeof t,
    l = r !== void 0;
  if (((e = (l && n[0] && n[0].parentNode) || e), i === 'string' || i === 'number')) {
    if (i === 'number' && ((t = t.toString()), t === n)) return n;
    if (l) {
      let o = n[0];
      o && o.nodeType === 3
        ? o.data !== t && (o.data = t)
        : (o = document.createTextNode(t)),
        (n = O(e, n, r, o));
    } else
      n !== '' && typeof n == 'string'
        ? (n = e.firstChild.data = t)
        : (n = e.textContent = t);
  } else if (t == null || i === 'boolean') n = O(e, n, r);
  else {
    if (i === 'function')
      return (
        G(() => {
          let o = t();
          for (; typeof o == 'function'; ) o = o();
          n = F(e, o, n, r);
        }),
        () => n
      );
    if (Array.isArray(t)) {
      const o = [],
        c = n && Array.isArray(n);
      if (K(o, t, n, s)) return G(() => (n = F(e, o, n, r, !0))), () => n;
      if (o.length === 0) {
        if (((n = O(e, n, r)), l)) return n;
      } else c ? (n.length === 0 ? Q(e, o, r) : _e(e, n, o)) : (n && O(e), Q(e, o));
      n = o;
    } else if (t.nodeType) {
      if (Array.isArray(n)) {
        if (l) return (n = O(e, n, r, t));
        O(e, n, null, t);
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
  let s = !1;
  for (let i = 0, l = t.length; i < l; i++) {
    let o = t[i],
      c = n && n[e.length],
      u;
    if (!(o == null || o === !0 || o === !1))
      if ((u = typeof o) == 'object' && o.nodeType) e.push(o);
      else if (Array.isArray(o)) s = K(e, o, c) || s;
      else if (u === 'function')
        if (r) {
          for (; typeof o == 'function'; ) o = o();
          s = K(e, Array.isArray(o) ? o : [o], Array.isArray(c) ? c : [c]) || s;
        } else e.push(o), (s = !0);
      else {
        const f = String(o);
        c && c.nodeType === 3 && c.data === f
          ? e.push(c)
          : e.push(document.createTextNode(f));
      }
  }
  return s;
}
function Q(e, t, n = null) {
  for (let r = 0, s = t.length; r < s; r++) e.insertBefore(t[r], n);
}
function O(e, t, n, r) {
  if (n === void 0) return (e.textContent = '');
  const s = r || document.createTextNode('');
  if (t.length) {
    let i = !1;
    for (let l = t.length - 1; l >= 0; l--) {
      const o = t[l];
      if (s !== o) {
        const c = o.parentNode === e;
        !i && !l ? (c ? e.replaceChild(s, o) : e.insertBefore(s, n)) : c && o.remove();
      } else i = !0;
    }
  } else e.insertBefore(s, n);
  return [s];
}
var oe = ((e) => (
  (e.START_POMODORO = 'START_POMODORO'), (e.START_FOCUS_MODE = 'START_FOCUS_MODE'), e
))(oe || {});
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
var Oe = _(
  `<div class="page-fade info-content"><div class=intro><h2>Understanding Procrastination</h2><p><strong>Procrastination is an emotion regulation problem, not a time management problem.</strong></p></div><section><h3>The Procrastination Cycle</h3><p>When we face tasks that trigger uncomfortable emotions, we enter a feedback loop:</p><div class=procrastination-graph><div class=graph-item>Fear of failure</div><div class=sync-icon>→</div><div class=graph-item>Avoid the task</div><div class=sync-icon>→</div><div class=graph-item>Temporary relief</div><div class=sync-icon>→</div><div class=graph-item>Increased anxiety</div></div></section><section><h3>Breaking the Cycle</h3><p>The key is to approach procrastination with curiosity and compassion, not judgment. Ask yourself:</p><ul><li>What emotions come up when I think about this task?</li><li>What specific aspect feels most challenging?</li><li>What am I afraid might happen if I start?</li></ul></section><section><h3>Practical Strategies</h3><ul><li><strong>Start small:</strong> What's the tiniest first step you could take?</li><li><strong>Time-box:</strong> Work for just 10-25 minutes, then take a break</li><li><strong>Reframe:</strong> Focus on progress over perfection</li><li><strong>Self-compassion:</strong> Speak to yourself as you would to a good friend</li></ul></section><section><h3>Common Triggers</h3><p>Procrastination is often triggered by perfectionism, fear of failure, feeling overwhelmed, unclear expectations, or finding the task boring. Identifying your specific trigger is the first step to moving forward.</p></section><div class=action-buttons><button class=primary-button>Back to work!`,
);
const Ie = (e) =>
  (() => {
    var t = Oe(),
      n = t.firstChild,
      r = n.nextSibling,
      s = r.nextSibling,
      i = s.nextSibling,
      l = i.nextSibling,
      o = l.nextSibling,
      c = o.firstChild;
    return Te(c, 'click', e.onBackToWork), t;
  })();
re(['click']);
var Pe = _('<header class="header page-fade"><button class=back-button>← Back'),
  Me = _(
    `<div class="intro page-fade"><h2>What's holding you back?</h2><p class=text-muted>Choose what best matches your current feeling:</p><button class=info-button>Learn about procrastination →`,
  ),
  De = _('<div class="blocker-grid page-fade">'),
  Le = _(
    '<div class="strategy-container page-fade"><div class=selected-type><h2 class=text-primary></h2><p class="emotion text-muted"></p></div><h3>Recommended Strategies:</h3><div class=strategy-list>',
  ),
  Re = _('<div class=app><main class=main>'),
  Be = _(
    '<button class="blocker-card card card-clickable"><h3 class=text-primary></h3><p class=text-muted>',
  ),
  Ne = _(
    '<button class=strategy-action-btn title="Start a focus session">🎯 Start focus session',
  ),
  We = _(
    '<div class="strategy-item card"><div class=strategy-content><p class=strategy-text>',
  );
const Ue = () => {
  const [e, t] = q('home'),
    [n, r] = q(null),
    s = (o) => {
      r(o), t('strategies');
    },
    i = () => {
      t('home'), r(null);
    },
    l = async (o, c) =>
      new Promise((u) => {
        const f = Math.random().toString(36).substr(2, 9),
          a = (g) => {
            g.data.messageId === f &&
              (window.removeEventListener('message', a), u(g.data.response));
          };
        window.addEventListener('message', a),
          window.parent.postMessage({ type: o, payload: c, messageId: f }, '*');
      });
  return (() => {
    var o = Re(),
      c = o.firstChild;
    return (
      v(
        o,
        k(P, {
          get when() {
            return e() !== 'home';
          },
          get children() {
            var u = Pe(),
              f = u.firstChild;
            return (f.$$click = i), u;
          },
        }),
        c,
      ),
      v(
        c,
        k(P, {
          get when() {
            return e() === 'home';
          },
          get children() {
            return [
              (() => {
                var u = Me(),
                  f = u.firstChild,
                  a = f.nextSibling,
                  g = a.nextSibling;
                return (g.$$click = () => t('info')), u;
              })(),
              (() => {
                var u = De();
                return (
                  v(
                    u,
                    k(Y, {
                      each: Ee,
                      children: (f) =>
                        (() => {
                          var a = Be(),
                            g = a.firstChild,
                            m = g.nextSibling;
                          return (
                            (a.$$click = () => s(f)),
                            v(g, () => f.title),
                            v(m, () => f.emotion),
                            a
                          );
                        })(),
                    }),
                  ),
                  u
                );
              })(),
            ];
          },
        }),
        null,
      ),
      v(
        c,
        k(P, {
          get when() {
            return e() === 'info';
          },
          get children() {
            return k(Ie, { onBackToWork: () => l(oe.START_FOCUS_MODE) });
          },
        }),
        null,
      ),
      v(
        c,
        k(P, {
          get when() {
            return ke(() => e() === 'strategies')() && n();
          },
          get children() {
            var u = Le(),
              f = u.firstChild,
              a = f.firstChild,
              g = a.nextSibling,
              m = f.nextSibling,
              $ = m.nextSibling;
            return (
              v(a, () => n().title),
              v(g, () => n().emotion),
              v(
                $,
                k(Y, {
                  get each() {
                    return n().strategies;
                  },
                  children: (w) => {
                    const C = typeof w == 'string' ? w : w.text,
                      E = typeof w != 'string' && w.action;
                    return (() => {
                      var b = We(),
                        y = b.firstChild,
                        S = y.firstChild;
                      return (
                        v(S, C),
                        v(
                          y,
                          k(P, {
                            when: E,
                            get children() {
                              var x = Ne();
                              return (x.$$click = () => l('START_POMODORO')), x;
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
              u
            );
          },
        }),
        null,
      ),
      o
    );
  })();
};
re(['click']);
const Z = document.getElementById('root');
Z && Ae(() => k(Ue, {}), Z);
