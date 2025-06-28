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
  B = { equals: ue };
let he = ie;
const T = 1,
  U = 2,
  pe = {};
var d = null;
let G = null,
  ge = null,
  h = null,
  p = null,
  A = null,
  j = 0;
function N(e, t) {
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
      : () => e(() => I(() => D(l)));
  (d = l), (h = null);
  try {
    return R(o, !0);
  } finally {
    (h = n), (d = r);
  }
}
function V(e, t) {
  t = t ? Object.assign({}, B, t) : B;
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
function q(e, t, n) {
  const r = X(e, t, !1, T, n);
  L(r);
}
function M(e, t, n) {
  n = n ? Object.assign({}, B, n) : B;
  const r = X(e, t, !0, 0, n);
  return (
    (r.observers = null),
    (r.observerSlots = null),
    (r.comparator = n.equals || void 0),
    L(r),
    ee.bind(r)
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
  const n = X(() => I(() => (Object.assign(e, { [de]: !0 }), e(t))), void 0, !0, 0);
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
function be(e) {
  d && (d.sourceMap ? d.sourceMap.push(e) : (d.sourceMap = [e]), (e.graph = d));
}
function ee() {
  if (this.sources && this.state)
    if (this.state === T) L(this);
    else {
      const e = p;
      (p = null), R(() => W(this), !1), (p = e);
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
        R(() => {
          for (let i = 0; i < e.observers.length; i += 1) {
            const s = e.observers[i],
              l = G && G.running;
            l && G.disposed.has(s),
              (l ? !s.tState : !s.state) &&
                (s.pure ? p.push(s) : A.push(s), s.observers && se(s)),
              l || (s.state = T);
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
function L(e) {
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
      e.pure && ((e.state = T), e.owned && e.owned.forEach(D), (e.owned = null)),
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
function X(e, t, n, r = T, i) {
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
  if (e.state === U) return W(e);
  if (e.suspense && I(e.suspense.inFallback)) return e.suspense.effects.push(e);
  const t = [e];
  for (; (e = e.owner) && (!e.updatedAt || e.updatedAt < j); ) e.state && t.push(e);
  for (let n = t.length - 1; n >= 0; n--)
    if (((e = t[n]), e.state === T)) L(e);
    else if (e.state === U) {
      const r = p;
      (p = null), R(() => W(e, t[0]), !1), (p = r);
    }
}
function R(e, t) {
  if (p) return e();
  let n = !1;
  t || (p = []), A ? (n = !0) : (A = []), j++;
  try {
    const r = e();
    return ve(n), r;
  } catch (r) {
    n || (A = null), (p = null), re(r);
  }
}
function ve(e) {
  if ((p && (ie(p), (p = null)), e)) return;
  const t = A;
  (A = null), t.length && R(() => he(t), !1);
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
      i === T
        ? r !== t && (!r.updatedAt || r.updatedAt < j) && ne(r)
        : i === U && W(r, t);
    }
  }
}
function se(e) {
  for (let t = 0; t < e.observers.length; t += 1) {
    const n = e.observers[t];
    n.state || ((n.state = U), n.pure ? p.push(n) : A.push(n), n.observers && se(n));
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
function _e(e, t, n = {}) {
  let r = [],
    i = [],
    s = [],
    l = 0,
    o = t.length > 1 ? [] : null;
  return (
    me(() => Y(s)),
    () => {
      let c = e() || [],
        u = c.length,
        f,
        a;
      return (
        c[fe],
        I(() => {
          let g, $, w, C, E, b, y, S, _;
          if (u === 0)
            l !== 0 && (Y(s), (s = []), (r = []), (i = []), (l = 0), o && (o = [])),
              n.fallback &&
                ((r = [$e]), (i[0] = N((ae) => ((s[0] = ae), n.fallback()))), (l = 1));
          else if (l === 0) {
            for (i = new Array(u), a = 0; a < u; a++) (r[a] = c[a]), (i[a] = N(m));
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
              (w[S] = i[y]), (C[S] = s[y]), o && (E[S] = o[y]);
            for (g = new Map(), $ = new Array(S + 1), a = S; a >= b; a--)
              (_ = c[a]), (f = g.get(_)), ($[a] = f === void 0 ? -1 : f), g.set(_, a);
            for (f = b; f <= y; f++)
              (_ = r[f]),
                (a = g.get(_)),
                a !== void 0 && a !== -1
                  ? ((w[a] = i[f]),
                    (C[a] = s[f]),
                    o && (E[a] = o[f]),
                    (a = $[a]),
                    g.set(_, a))
                  : s[f]();
            for (a = b; a < u; a++)
              a in w
                ? ((i[a] = w[a]), (s[a] = C[a]), o && ((o[a] = E[a]), o[a](a)))
                : (i[a] = N(m));
            (i = i.slice(0, (l = u))), (r = c.slice(0));
          }
          return i;
        })
      );
      function m(g) {
        if (((s[a] = g), o)) {
          const [$, w] = V(a, { name: 'index' });
          return (o[a] = w), t(c[a], $);
        }
        return t(c[a]);
      }
    }
  );
}
function x(e, t) {
  return we(e, t || {});
}
const xe = (e) =>
  `Attempting to access a stale value from <${e}> that could possibly be undefined. This may occur because you are reading the accessor returned from the component at a time where it has already been unmounted. We recommend cleaning up any stale timers or async, or reading from the initial condition.`;
function J(e) {
  const t = 'fallback' in e && { fallback: () => e.fallback };
  return M(
    _e(() => e.each, e.children, t || void 0),
    void 0,
    { name: 'value' },
  );
}
function P(e) {
  const t = e.keyed,
    n = M(() => e.when, void 0, { name: 'condition value' }),
    r = t ? n : M(n, void 0, { equals: (i, s) => !i == !s, name: 'condition' });
  return M(
    () => {
      const i = r();
      if (i) {
        const s = e.children;
        return typeof s == 'function' && s.length > 0
          ? I(() =>
              s(
                t
                  ? i
                  : () => {
                      if (!I(r)) throw xe('Show');
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
const ke = (e) => M(() => e());
function Ae(e, t, n) {
  let r = n.length,
    i = t.length,
    s = r,
    l = 0,
    o = 0,
    c = t[i - 1].nextSibling,
    u = null;
  for (; l < i || o < s; ) {
    if (t[l] === n[o]) {
      l++, o++;
      continue;
    }
    for (; t[i - 1] === n[s - 1]; ) i--, s--;
    if (i === l) {
      const f = s < r ? (o ? n[o - 1].nextSibling : n[s - o]) : c;
      for (; o < s; ) e.insertBefore(n[o++], f);
    } else if (s === o) for (; l < i; ) (!u || !u.has(t[l])) && t[l].remove(), l++;
    else if (t[l] === n[s - 1] && n[o] === t[i - 1]) {
      const f = t[--i].nextSibling;
      e.insertBefore(n[o++], t[l++].nextSibling),
        e.insertBefore(n[--s], f),
        (t[i] = n[s]);
    } else {
      if (!u) {
        u = new Map();
        let a = o;
        for (; a < s; ) u.set(n[a], a++);
      }
      const f = u.get(t[l]);
      if (f != null)
        if (o < f && f < s) {
          let a = l,
            m = 1,
            g;
          for (; ++a < i && a < s && !((g = u.get(t[a])) == null || g !== f + m); ) m++;
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
function Te(e, t, n, r = {}) {
  if (!t)
    throw new Error(
      "The `element` passed to `render(..., element)` doesn't exist. Make sure `element` exists in the document.",
    );
  let i;
  return (
    N((s) => {
      (i = s), t === document ? e() : v(t, e(), t.firstChild ? null : void 0, n);
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
function oe(e, t = window.document) {
  const n = t[Q] || (t[Q] = new Set());
  for (let r = 0, i = e.length; r < i; r++) {
    const s = e[r];
    n.has(s) || (n.add(s), t.addEventListener(s, Ee));
  }
}
function Ce(e, t, n, r) {
  Array.isArray(n) ? ((e[`$$${t}`] = n[0]), (e[`$$${t}Data`] = n[1])) : (e[`$$${t}`] = n);
}
function v(e, t, n, r) {
  if ((n !== void 0 && !r && (r = []), typeof t != 'function')) return F(e, t, r, n);
  q((i) => F(e, t(), i, n), r);
}
function Ee(e) {
  let t = e.target;
  const n = `$$${e.type}`,
    r = e.target,
    i = e.currentTarget,
    s = (c) => Object.defineProperty(e, 'target', { configurable: !0, value: c }),
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
    const c = e.composedPath();
    s(c[0]);
    for (let u = 0; u < c.length - 2 && ((t = c[u]), !!l()); u++) {
      if (t._$host) {
        (t = t._$host), o();
        break;
      }
      if (t.parentNode === i) break;
    }
  } else o();
  s(r);
}
function F(e, t, n, r, i) {
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
        (n = O(e, n, r, o));
    } else
      n !== '' && typeof n == 'string'
        ? (n = e.firstChild.data = t)
        : (n = e.textContent = t);
  } else if (t == null || s === 'boolean') n = O(e, n, r);
  else {
    if (s === 'function')
      return (
        q(() => {
          let o = t();
          for (; typeof o == 'function'; ) o = o();
          n = F(e, o, n, r);
        }),
        () => n
      );
    if (Array.isArray(t)) {
      const o = [],
        c = n && Array.isArray(n);
      if (K(o, t, n, i)) return q(() => (n = F(e, o, n, r, !0))), () => n;
      if (o.length === 0) {
        if (((n = O(e, n, r)), l)) return n;
      } else c ? (n.length === 0 ? Z(e, o, r) : Ae(e, n, o)) : (n && O(e), Z(e, o));
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
  let i = !1;
  for (let s = 0, l = t.length; s < l; s++) {
    let o = t[s],
      c = n && n[e.length],
      u;
    if (!(o == null || o === !0 || o === !1))
      if ((u = typeof o) == 'object' && o.nodeType) e.push(o);
      else if (Array.isArray(o)) i = K(e, o, c) || i;
      else if (u === 'function')
        if (r) {
          for (; typeof o == 'function'; ) o = o();
          i = K(e, Array.isArray(o) ? o : [o], Array.isArray(c) ? c : [c]) || i;
        } else e.push(o), (i = !0);
      else {
        const f = String(o);
        c && c.nodeType === 3 && c.data === f
          ? e.push(c)
          : e.push(document.createTextNode(f));
      }
  }
  return i;
}
function Z(e, t, n = null) {
  for (let r = 0, i = t.length; r < i; r++) e.insertBefore(t[r], n);
}
function O(e, t, n, r) {
  if (n === void 0) return (e.textContent = '');
  const i = r || document.createTextNode('');
  if (t.length) {
    let s = !1;
    for (let l = t.length - 1; l >= 0; l--) {
      const o = t[l];
      if (i !== o) {
        const c = o.parentNode === e;
        !s && !l ? (c ? e.replaceChild(i, o) : e.insertBefore(i, n)) : c && o.remove();
      } else s = !0;
    }
  } else e.insertBefore(i, n);
  return [i];
}
var H = ((e) => (
    (e.START_POMODORO = 'START_POMODORO'), (e.START_FOCUS_MODE = 'START_FOCUS_MODE'), e
  ))(H || {}),
  le = ((e) => ((e.PLUGIN_MESSAGE = 'PLUGIN_MESSAGE'), e))(le || {});
const Oe = [
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
var Ie = k(
  `<div class="page-fade info-content"><div class=intro><h2>Understanding Procrastination</h2><p><strong>Procrastination is an emotion regulation problem, not a time management problem.</strong></p></div><section><h3>The Procrastination Cycle</h3><p>When we face tasks that trigger uncomfortable emotions, we enter a feedback loop:</p><div class=procrastination-graph><div class=graph-item>Fear of failure</div><div class=sync-icon>→</div><div class=graph-item>Avoid the task</div><div class=sync-icon>→</div><div class=graph-item>Temporary relief</div><div class=sync-icon>→</div><div class=graph-item>Increased anxiety</div></div></section><section><h3>Breaking the Cycle</h3><p>The key is to approach procrastination with curiosity and compassion, not judgment. Ask yourself:</p><ul><li>What emotions come up when I think about this task?</li><li>What specific aspect feels most challenging?</li><li>What am I afraid might happen if I start?</li></ul></section><section><h3>Practical Strategies</h3><ul><li><strong>Start small:</strong> What's the tiniest first step you could take?</li><li><strong>Time-box:</strong> Work for just 10-25 minutes, then take a break</li><li><strong>Reframe:</strong> Focus on progress over perfection</li><li><strong>Self-compassion:</strong> Speak to yourself as you would to a good friend</li></ul></section><section><h3>Common Triggers</h3><p>Procrastination is often triggered by perfectionism, fear of failure, feeling overwhelmed, unclear expectations, or finding the task boring. Identifying your specific trigger is the first step to moving forward.</p></section><div class=action-buttons><button class=primary-button>Back to work!`,
);
const Pe = (e) =>
  (() => {
    var t = Ie(),
      n = t.firstChild,
      r = n.nextSibling,
      i = r.nextSibling,
      s = i.nextSibling,
      l = s.nextSibling,
      o = l.nextSibling,
      c = o.firstChild;
    return Ce(c, 'click', e.onBackToWork), t;
  })();
oe(['click']);
var Me = k('<header class="header page-fade"><button class=back-button>← Back'),
  De = k(
    `<div class="intro page-fade"><h2>What's holding you back?</h2><p class=text-muted>Choose what best matches your current feeling:</p><button class=info-button>Learn about procrastination →`,
  ),
  Le = k('<div class="blocker-grid page-fade">'),
  Re = k(
    '<div class="strategy-container page-fade"><div class=selected-type><h2 class=text-primary></h2><p class="emotion text-muted"></p></div><h3>Recommended Strategies:</h3><div class=strategy-list>',
  ),
  Ne = k('<div class=app><main class=main>'),
  Be = k(
    '<button class="blocker-card card card-clickable"><h3 class=text-primary></h3><p class=text-muted>',
  ),
  Ue = k(
    '<button class=strategy-action-btn title="Start a focus session">🎯 Start focus session',
  ),
  We = k(
    '<div class="strategy-item card"><div class=strategy-content><p class=strategy-text>',
  );
const Fe = () => {
  const [e, t] = V('home'),
    [n, r] = V(null),
    i = (o) => {
      r(o), t('strategies');
    },
    s = () => {
      t('home'), r(null);
    },
    l = (o) => {
      window.parent.postMessage(
        {
          type: le.PLUGIN_MESSAGE,
          message: { type: o },
          messageId: Date.now().toString(),
        },
        '*',
      );
    };
  return (() => {
    var o = Ne(),
      c = o.firstChild;
    return (
      v(
        o,
        x(P, {
          get when() {
            return e() !== 'home';
          },
          get children() {
            var u = Me(),
              f = u.firstChild;
            return (f.$$click = s), u;
          },
        }),
        c,
      ),
      v(
        c,
        x(P, {
          get when() {
            return e() === 'home';
          },
          get children() {
            return [
              (() => {
                var u = De(),
                  f = u.firstChild,
                  a = f.nextSibling,
                  m = a.nextSibling;
                return (m.$$click = () => t('info')), u;
              })(),
              (() => {
                var u = Le();
                return (
                  v(
                    u,
                    x(J, {
                      each: Oe,
                      children: (f) =>
                        (() => {
                          var a = Be(),
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
        x(P, {
          get when() {
            return e() === 'info';
          },
          get children() {
            return x(Pe, { onBackToWork: () => l(H.START_FOCUS_MODE) });
          },
        }),
        null,
      ),
      v(
        c,
        x(P, {
          get when() {
            return ke(() => e() === 'strategies')() && n();
          },
          get children() {
            var u = Re(),
              f = u.firstChild,
              a = f.firstChild,
              m = a.nextSibling,
              g = f.nextSibling,
              $ = g.nextSibling;
            return (
              v(a, () => n().title),
              v(m, () => n().emotion),
              v(
                $,
                x(J, {
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
                          x(P, {
                            when: E,
                            get children() {
                              var _ = Ue();
                              return (_.$$click = () => l(H.START_POMODORO)), _;
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
oe(['click']);
const z = document.getElementById('root');
z && Te(() => x(Fe, {}), z);
