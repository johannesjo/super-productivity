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
const fe = !0,
  de = (e, t) => e === t,
  he = Symbol('solid-track'),
  pe = Symbol('solid-dev-component'),
  M = { equals: de };
let ge = se;
const T = 1,
  G = 2,
  me = {};
var d = null;
let j = null,
  we = null,
  h = null,
  p = null,
  x = null,
  K = 0;
function L(e, t) {
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
      : () => e(() => k(() => R(l)));
  (d = l), (h = null);
  try {
    return N(o, !0);
  } finally {
    (h = n), (d = r);
  }
}
function V(e, t) {
  t = t ? Object.assign({}, M, t) : M;
  const n = {
    value: e,
    observers: null,
    observerSlots: null,
    comparator: t.equals || void 0,
  };
  t.name && (n.name = t.name), t.internal ? (n.internal = !0) : be(n);
  const r = (s) => (typeof s == 'function' && (s = s(n.value)), te(n, s));
  return [ee.bind(n), r];
}
function q(e, t, n) {
  const r = Y(e, t, !1, T, n);
  D(r);
}
function U(e, t, n) {
  n = n ? Object.assign({}, M, n) : M;
  const r = Y(e, t, !0, 0, n);
  return (
    (r.observers = null),
    (r.observerSlots = null),
    (r.comparator = n.equals || void 0),
    D(r),
    ee.bind(r)
  );
}
function k(e) {
  if (h === null) return e();
  const t = h;
  h = null;
  try {
    return e();
  } finally {
    h = t;
  }
}
function Se(e) {
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
function ye(e, t) {
  const n = Y(() => k(() => (Object.assign(e, { [pe]: !0 }), e(t))), void 0, !0, 0);
  return (
    (n.props = t),
    (n.observers = null),
    (n.observerSlots = null),
    (n.name = e.name),
    (n.component = e),
    D(n),
    n.tValue !== void 0 ? n.tValue : n.value
  );
}
function be(e) {
  d && (d.sourceMap ? d.sourceMap.push(e) : (d.sourceMap = [e]), (e.graph = d));
}
function ee() {
  if (this.sources && this.state)
    if (this.state === T) D(this);
    else {
      const e = p;
      (p = null), N(() => B(this), !1), (p = e);
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
        N(() => {
          for (let s = 0; s < e.observers.length; s += 1) {
            const i = e.observers[s],
              l = j && j.running;
            l && j.disposed.has(i),
              (l ? !i.tState : !i.state) &&
                (i.pure ? p.push(i) : x.push(i), i.observers && re(i)),
              l || (i.state = T);
          }
          if (p.length > 1e6)
            throw (
              ((p = []),
              fe ? new Error('Potential Infinite Loop Detected.') : new Error())
            );
        }, !1)),
    t
  );
}
function D(e) {
  if (!e.fn) return;
  R(e);
  const t = K;
  Ae(e, e.value, t);
}
function Ae(e, t, n) {
  let r;
  const s = d,
    i = h;
  h = d = e;
  try {
    r = e.fn(t);
  } catch (l) {
    return (
      e.pure && ((e.state = T), e.owned && e.owned.forEach(R), (e.owned = null)),
      (e.updatedAt = n + 1),
      ie(l)
    );
  } finally {
    (h = i), (d = s);
  }
  (!e.updatedAt || e.updatedAt <= n) &&
    (e.updatedAt != null && 'observers' in e ? te(e, r) : (e.value = r),
    (e.updatedAt = n));
}
function Y(e, t, n, r = T, s) {
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
      : d !== me && (d.owned ? d.owned.push(i) : (d.owned = [i])),
    s && s.name && (i.name = s.name),
    i
  );
}
function ne(e) {
  if (e.state === 0) return;
  if (e.state === G) return B(e);
  if (e.suspense && k(e.suspense.inFallback)) return e.suspense.effects.push(e);
  const t = [e];
  for (; (e = e.owner) && (!e.updatedAt || e.updatedAt < K); ) e.state && t.push(e);
  for (let n = t.length - 1; n >= 0; n--)
    if (((e = t[n]), e.state === T)) D(e);
    else if (e.state === G) {
      const r = p;
      (p = null), N(() => B(e, t[0]), !1), (p = r);
    }
}
function N(e, t) {
  if (p) return e();
  let n = !1;
  t || (p = []), x ? (n = !0) : (x = []), K++;
  try {
    const r = e();
    return _e(n), r;
  } catch (r) {
    n || (x = null), (p = null), ie(r);
  }
}
function _e(e) {
  if ((p && (se(p), (p = null)), e)) return;
  const t = x;
  (x = null), t.length && N(() => ge(t), !1);
}
function se(e) {
  for (let t = 0; t < e.length; t++) ne(e[t]);
}
function B(e, t) {
  e.state = 0;
  for (let n = 0; n < e.sources.length; n += 1) {
    const r = e.sources[n];
    if (r.sources) {
      const s = r.state;
      s === T
        ? r !== t && (!r.updatedAt || r.updatedAt < K) && ne(r)
        : s === G && B(r, t);
    }
  }
}
function re(e) {
  for (let t = 0; t < e.observers.length; t += 1) {
    const n = e.observers[t];
    n.state || ((n.state = G), n.pure ? p.push(n) : x.push(n), n.observers && re(n));
  }
}
function R(e) {
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
    for (t = e.tOwned.length - 1; t >= 0; t--) R(e.tOwned[t]);
    delete e.tOwned;
  }
  if (e.owned) {
    for (t = e.owned.length - 1; t >= 0; t--) R(e.owned[t]);
    e.owned = null;
  }
  if (e.cleanups) {
    for (t = e.cleanups.length - 1; t >= 0; t--) e.cleanups[t]();
    e.cleanups = null;
  }
  (e.state = 0), delete e.sourceMap;
}
function Ee(e) {
  return e instanceof Error
    ? e
    : new Error(typeof e == 'string' ? e : 'Unknown error', { cause: e });
}
function ie(e, t = d) {
  throw Ee(e);
}
const ve = Symbol('fallback');
function H(e) {
  for (let t = 0; t < e.length; t++) e[t]();
}
function $e(e, t, n = {}) {
  let r = [],
    s = [],
    i = [],
    l = 0,
    o = t.length > 1 ? [] : null;
  return (
    Se(() => H(i)),
    () => {
      let a = e() || [],
        u = a.length,
        f,
        c;
      return (
        a[he],
        k(() => {
          let m, w, _, $, P, S, y, E, O;
          if (u === 0)
            l !== 0 && (H(i), (i = []), (r = []), (s = []), (l = 0), o && (o = [])),
              n.fallback &&
                ((r = [ve]), (s[0] = L((ue) => ((i[0] = ue), n.fallback()))), (l = 1));
          else if (l === 0) {
            for (s = new Array(u), c = 0; c < u; c++) (r[c] = a[c]), (s[c] = L(A));
            l = u;
          } else {
            for (
              _ = new Array(u),
                $ = new Array(u),
                o && (P = new Array(u)),
                S = 0,
                y = Math.min(l, u);
              S < y && r[S] === a[S];
              S++
            );
            for (y = l - 1, E = u - 1; y >= S && E >= S && r[y] === a[E]; y--, E--)
              (_[E] = s[y]), ($[E] = i[y]), o && (P[E] = o[y]);
            for (m = new Map(), w = new Array(E + 1), c = E; c >= S; c--)
              (O = a[c]), (f = m.get(O)), (w[c] = f === void 0 ? -1 : f), m.set(O, c);
            for (f = S; f <= y; f++)
              (O = r[f]),
                (c = m.get(O)),
                c !== void 0 && c !== -1
                  ? ((_[c] = s[f]),
                    ($[c] = i[f]),
                    o && (P[c] = o[f]),
                    (c = w[c]),
                    m.set(O, c))
                  : i[f]();
            for (c = S; c < u; c++)
              c in _
                ? ((s[c] = _[c]), (i[c] = $[c]), o && ((o[c] = P[c]), o[c](c)))
                : (s[c] = L(A));
            (s = s.slice(0, (l = u))), (r = a.slice(0));
          }
          return s;
        })
      );
      function A(m) {
        if (((i[c] = m), o)) {
          const [w, _] = V(c, { name: 'index' });
          return (o[c] = _), t(a[c], w);
        }
        return t(a[c]);
      }
    }
  );
}
function b(e, t) {
  return ye(e, t || {});
}
const xe = (e) =>
  `Attempting to access a stale value from <${e}> that could possibly be undefined. This may occur because you are reading the accessor returned from the component at a time where it has already been unmounted. We recommend cleaning up any stale timers or async, or reading from the initial condition.`;
function oe(e) {
  const t = 'fallback' in e && { fallback: () => e.fallback };
  return U(
    $e(() => e.each, e.children, t || void 0),
    void 0,
    { name: 'value' },
  );
}
function I(e) {
  const t = e.keyed,
    n = U(() => e.when, void 0, { name: 'condition value' }),
    r = t ? n : U(n, void 0, { equals: (s, i) => !s == !i, name: 'condition' });
  return U(
    () => {
      const s = r();
      if (s) {
        const i = e.children;
        return typeof i == 'function' && i.length > 0
          ? k(() =>
              i(
                t
                  ? s
                  : () => {
                      if (!k(r)) throw xe('Show');
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
function Te(e, t, n) {
  let r = n.length,
    s = t.length,
    i = r,
    l = 0,
    o = 0,
    a = t[s - 1].nextSibling,
    u = null;
  for (; l < s || o < i; ) {
    if (t[l] === n[o]) {
      l++, o++;
      continue;
    }
    for (; t[s - 1] === n[i - 1]; ) s--, i--;
    if (s === l) {
      const f = i < r ? (o ? n[o - 1].nextSibling : n[i - o]) : a;
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
        let c = o;
        for (; c < i; ) u.set(n[c], c++);
      }
      const f = u.get(t[l]);
      if (f != null)
        if (o < f && f < i) {
          let c = l,
            A = 1,
            m;
          for (; ++c < s && c < i && !((m = u.get(t[c])) == null || m !== f + A); ) A++;
          if (A > f - o) {
            const w = t[l];
            for (; o < f; ) e.insertBefore(n[o++], w);
          } else e.replaceChild(n[o++], t[l++]);
        } else l++;
      else t[l++].remove();
    }
  }
}
const X = '_$DX_DELEGATE';
function Oe(e, t, n, r = {}) {
  if (!t)
    throw new Error(
      "The `element` passed to `render(..., element)` doesn't exist. Make sure `element` exists in the document.",
    );
  let s;
  return (
    L((i) => {
      (s = i), t === document ? e() : g(t, e(), t.firstChild ? null : void 0, n);
    }, r.owner),
    () => {
      s(), (t.textContent = '');
    }
  );
}
function v(e, t, n, r) {
  let s;
  const i = () => {
      const o = document.createElement('template');
      return (o.innerHTML = e), o.content.firstChild;
    },
    l = () => (s || (s = i())).cloneNode(!0);
  return (l.cloneNode = l), l;
}
function Q(e, t = window.document) {
  const n = t[X] || (t[X] = new Set());
  for (let r = 0, s = e.length; r < s; r++) {
    const i = e[r];
    n.has(i) || (n.add(i), t.addEventListener(i, Ce));
  }
}
function g(e, t, n, r) {
  if ((n !== void 0 && !r && (r = []), typeof t != 'function')) return F(e, t, r, n);
  q((s) => F(e, t(), s, n), r);
}
function Ce(e) {
  let t = e.target;
  const n = `$$${e.type}`,
    r = e.target,
    s = e.currentTarget,
    i = (a) => Object.defineProperty(e, 'target', { configurable: !0, value: a }),
    l = () => {
      const a = t[n];
      if (a && !t.disabled) {
        const u = t[`${n}Data`];
        if ((u !== void 0 ? a.call(t, u, e) : a.call(t, e), e.cancelBubble)) return;
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
    const a = e.composedPath();
    i(a[0]);
    for (let u = 0; u < a.length - 2 && ((t = a[u]), !!l()); u++) {
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
        (n = C(e, n, r, o));
    } else
      n !== '' && typeof n == 'string'
        ? (n = e.firstChild.data = t)
        : (n = e.textContent = t);
  } else if (t == null || i === 'boolean') n = C(e, n, r);
  else {
    if (i === 'function')
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
        a = n && Array.isArray(n);
      if (W(o, t, n, s)) return q(() => (n = F(e, o, n, r, !0))), () => n;
      if (o.length === 0) {
        if (((n = C(e, n, r)), l)) return n;
      } else a ? (n.length === 0 ? J(e, o, r) : Te(e, n, o)) : (n && C(e), J(e, o));
      n = o;
    } else if (t.nodeType) {
      if (Array.isArray(n)) {
        if (l) return (n = C(e, n, r, t));
        C(e, n, null, t);
      } else
        n == null || n === '' || !e.firstChild
          ? e.appendChild(t)
          : e.replaceChild(t, e.firstChild);
      n = t;
    } else console.warn('Unrecognized value. Skipped inserting', t);
  }
  return n;
}
function W(e, t, n, r) {
  let s = !1;
  for (let i = 0, l = t.length; i < l; i++) {
    let o = t[i],
      a = n && n[e.length],
      u;
    if (!(o == null || o === !0 || o === !1))
      if ((u = typeof o) == 'object' && o.nodeType) e.push(o);
      else if (Array.isArray(o)) s = W(e, o, a) || s;
      else if (u === 'function')
        if (r) {
          for (; typeof o == 'function'; ) o = o();
          s = W(e, Array.isArray(o) ? o : [o], Array.isArray(a) ? a : [a]) || s;
        } else e.push(o), (s = !0);
      else {
        const f = String(o);
        a && a.nodeType === 3 && a.data === f
          ? e.push(a)
          : e.push(document.createTextNode(f));
      }
  }
  return s;
}
function J(e, t, n = null) {
  for (let r = 0, s = t.length; r < s; r++) e.insertBefore(t[r], n);
}
function C(e, t, n, r) {
  if (n === void 0) return (e.textContent = '');
  const s = r || document.createTextNode('');
  if (t.length) {
    let i = !1;
    for (let l = t.length - 1; l >= 0; l--) {
      const o = t[l];
      if (s !== o) {
        const a = o.parentNode === e;
        !i && !l ? (a ? e.replaceChild(s, o) : e.insertBefore(s, n)) : a && o.remove();
      } else i = !0;
    }
  } else e.insertBefore(s, n);
  return [s];
}
var le = ((e) => (
    (e.ADD_STRATEGY_TASK = 'ADD_STRATEGY_TASK'),
    (e.START_POMODORO = 'START_POMODORO'),
    (e.START_FOCUS_MODE = 'START_FOCUS_MODE'),
    (e.QUICK_ADD_TASK = 'QUICK_ADD_TASK'),
    e
  ))(le || {}),
  ce = ((e) => (
    (e.PLUGIN_MESSAGE = 'PLUGIN_MESSAGE'),
    (e.PLUGIN_MESSAGE_RESPONSE = 'PLUGIN_MESSAGE_RESPONSE'),
    (e.PLUGIN_MESSAGE_ERROR = 'PLUGIN_MESSAGE_ERROR'),
    e
  ))(ce || {}),
  ae = ((e) => ((e.FOCUS_SESSION = 'focusSession'), e))(ae || {});
const ke = [
  {
    id: 'overwhelm',
    title: 'Overwhelm',
    emotion: 'Too much at once',
    strategies: [
      'Create micro-tasks (5 min steps)',
      'Implementation Intentions (If X, then Y)',
      'Pick just one thing',
      { text: 'Start Focus Session', action: 'focusSession' },
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
      { text: 'Schedule deep work block', action: 'focusSession' },
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
var Ie = v('<div class=blocker-grid>'),
  Re = v(
    '<button class="blocker-card card card-clickable"><h3 class=text-primary></h3><p class=text-muted>',
  );
const De = (e) =>
  (() => {
    var t = Ie();
    return (
      g(
        t,
        b(oe, {
          get each() {
            return e.types;
          },
          children: (n, r) =>
            (() => {
              var s = Re(),
                i = s.firstChild,
                l = i.nextSibling;
              return (
                (s.$$click = () => e.onSelect(n)),
                g(i, () => n.title),
                g(l, () => n.emotion),
                s
              );
            })(),
        }),
      ),
      t
    );
  })();
Q(['click']);
var Ne = v(
    '<div class=strategy-container><div class=selected-type><h2 class=text-primary></h2><p class="emotion text-muted"></p></div><h3>Recommended Strategies:</h3><div class=strategy-list>',
  ),
  Pe = v(
    '<button class=strategy-action-btn title="Start a focus session">🎯 Start focus session',
  ),
  Le = v(
    '<div class="strategy-item card"><div class=strategy-content><p class=strategy-text>',
  );
const Ue = (e) => {
  const t = (r) => (typeof r == 'string' ? r : r.text),
    n = (r) => (typeof r == 'string' ? void 0 : r.action);
  return (() => {
    var r = Ne(),
      s = r.firstChild,
      i = s.firstChild,
      l = i.nextSibling,
      o = s.nextSibling,
      a = o.nextSibling;
    return (
      g(i, () => e.type.title),
      g(l, () => e.type.emotion),
      g(
        a,
        b(oe, {
          get each() {
            return e.type.strategies;
          },
          children: (u, f) => {
            const c = t(u),
              A = n(u);
            return (() => {
              var m = Le(),
                w = m.firstChild,
                _ = w.firstChild;
              return (
                g(_, c),
                g(
                  w,
                  b(I, {
                    when: A,
                    get children() {
                      var $ = Pe();
                      return ($.$$click = () => e.onStrategyAction(c, A)), $;
                    },
                  }),
                  null,
                ),
                m
              );
            })();
          },
        }),
      ),
      r
    );
  })();
};
Q(['click']);
var Me = v('<header class="header page-fade"><button class=back-button>← Back'),
  Ge = v(
    `<div class="intro page-fade"><h2>What's holding you back?</h2><p class=text-muted>Choose what best matches your current feeling:`,
  ),
  Z = v('<div class=page-fade>'),
  Be = v('<div class=app><main class=main>');
const Fe = () => {
  const [e, t] = V(null),
    [n, r] = V(!0),
    s = (o) => {
      t(o), r(!1);
    },
    i = () => {
      t(null), r(!0);
    },
    l = async (o, a) => {
      if (e())
        try {
          let f;
          switch (a) {
            case ae.FOCUS_SESSION:
              f = { type: le.START_POMODORO };
              break;
            default:
              console.warn('Unknown action type:', a);
              return;
          }
          window.parent.postMessage(
            { type: ce.PLUGIN_MESSAGE, message: f, messageId: Date.now().toString() },
            '*',
          );
        } catch (f) {
          console.error('Failed to send message:', f);
        }
    };
  return (() => {
    var o = Be(),
      a = o.firstChild;
    return (
      g(
        o,
        b(I, {
          get when() {
            return !n();
          },
          get children() {
            var u = Me(),
              f = u.firstChild;
            return (f.$$click = i), u;
          },
        }),
        a,
      ),
      g(
        a,
        b(I, {
          get when() {
            return n();
          },
          get children() {
            return Ge();
          },
        }),
        null,
      ),
      g(
        a,
        b(I, {
          get when() {
            return !e();
          },
          get children() {
            var u = Z();
            return g(u, b(De, { types: ke, onSelect: s })), u;
          },
        }),
        null,
      ),
      g(
        a,
        b(I, {
          get when() {
            return e();
          },
          get children() {
            var u = Z();
            return (
              g(
                u,
                b(Ue, {
                  get type() {
                    return e();
                  },
                  onStrategyAction: l,
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
Q(['click']);
const z = document.getElementById('root');
z && Oe(() => b(Fe, {}), z);
