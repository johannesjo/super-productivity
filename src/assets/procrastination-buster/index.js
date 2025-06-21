(function () {
  const t = document.createElement('link').relList;
  if (t && t.supports && t.supports('modulepreload')) return;
  for (const s of document.querySelectorAll('link[rel="modulepreload"]')) i(s);
  new MutationObserver((s) => {
    for (const r of s)
      if (r.type === 'childList')
        for (const l of r.addedNodes)
          l.tagName === 'LINK' && l.rel === 'modulepreload' && i(l);
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
const le = !0,
  ce = (e, t) => e === t,
  ae = Symbol('solid-track'),
  ue = Symbol('solid-dev-component'),
  R = { equals: ce };
let fe = ne;
const E = 1,
  U = 2,
  de = {};
var d = null;
let G = null,
  he = null,
  h = null,
  p = null,
  T = null,
  V = 0;
function M(e, t) {
  const n = h,
    i = d,
    s = e.length === 0,
    r = t === void 0 ? i : t,
    l = s
      ? { owned: null, cleanups: null, context: null, owner: null }
      : { owned: null, cleanups: null, context: r ? r.context : null, owner: r },
    o = s
      ? () =>
          e(() => {
            throw new Error(
              'Dispose method must be an explicit argument to createRoot function',
            );
          })
      : () => e(() => C(() => P(l)));
  (d = l), (h = null);
  try {
    return L(o, !0);
  } finally {
    (h = n), (d = i);
  }
}
function W(e, t) {
  t = t ? Object.assign({}, R, t) : R;
  const n = {
    value: e,
    observers: null,
    observerSlots: null,
    comparator: t.equals || void 0,
  };
  t.name && (n.name = t.name), t.internal ? (n.internal = !0) : me(n);
  const i = (s) => (typeof s == 'function' && (s = s(n.value)), ee(n, s));
  return [z.bind(n), i];
}
function F(e, t, n) {
  const i = Y(e, t, !1, E, n);
  O(i);
}
function I(e, t, n) {
  n = n ? Object.assign({}, R, n) : R;
  const i = Y(e, t, !0, 0, n);
  return (
    (i.observers = null),
    (i.observerSlots = null),
    (i.comparator = n.equals || void 0),
    O(i),
    z.bind(i)
  );
}
function C(e) {
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
function ge(e, t) {
  const n = Y(() => C(() => (Object.assign(e, { [ue]: !0 }), e(t))), void 0, !0, 0);
  return (
    (n.props = t),
    (n.observers = null),
    (n.observerSlots = null),
    (n.name = e.name),
    (n.component = e),
    O(n),
    n.tValue !== void 0 ? n.tValue : n.value
  );
}
function me(e) {
  d && (d.sourceMap ? d.sourceMap.push(e) : (d.sourceMap = [e]), (e.graph = d));
}
function z() {
  if (this.sources && this.state)
    if (this.state === E) O(this);
    else {
      const e = p;
      (p = null), L(() => j(this), !1), (p = e);
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
  let i = e.value;
  return (
    (!e.comparator || !e.comparator(i, t)) &&
      ((e.value = t),
      e.observers &&
        e.observers.length &&
        L(() => {
          for (let s = 0; s < e.observers.length; s += 1) {
            const r = e.observers[s],
              l = G && G.running;
            l && G.disposed.has(r),
              (l ? !r.tState : !r.state) &&
                (r.pure ? p.push(r) : T.push(r), r.observers && se(r)),
              l || (r.state = E);
          }
          if (p.length > 1e6)
            throw (
              ((p = []),
              le ? new Error('Potential Infinite Loop Detected.') : new Error())
            );
        }, !1)),
    t
  );
}
function O(e) {
  if (!e.fn) return;
  P(e);
  const t = V;
  we(e, e.value, t);
}
function we(e, t, n) {
  let i;
  const s = d,
    r = h;
  h = d = e;
  try {
    i = e.fn(t);
  } catch (l) {
    return (
      e.pure && ((e.state = E), e.owned && e.owned.forEach(P), (e.owned = null)),
      (e.updatedAt = n + 1),
      ie(l)
    );
  } finally {
    (h = r), (d = s);
  }
  (!e.updatedAt || e.updatedAt <= n) &&
    (e.updatedAt != null && 'observers' in e ? ee(e, i) : (e.value = i),
    (e.updatedAt = n));
}
function Y(e, t, n, i = E, s) {
  const r = {
    fn: e,
    state: i,
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
      : d !== de && (d.owned ? d.owned.push(r) : (d.owned = [r])),
    s && s.name && (r.name = s.name),
    r
  );
}
function te(e) {
  if (e.state === 0) return;
  if (e.state === U) return j(e);
  if (e.suspense && C(e.suspense.inFallback)) return e.suspense.effects.push(e);
  const t = [e];
  for (; (e = e.owner) && (!e.updatedAt || e.updatedAt < V); ) e.state && t.push(e);
  for (let n = t.length - 1; n >= 0; n--)
    if (((e = t[n]), e.state === E)) O(e);
    else if (e.state === U) {
      const i = p;
      (p = null), L(() => j(e, t[0]), !1), (p = i);
    }
}
function L(e, t) {
  if (p) return e();
  let n = !1;
  t || (p = []), T ? (n = !0) : (T = []), V++;
  try {
    const i = e();
    return ye(n), i;
  } catch (i) {
    n || (T = null), (p = null), ie(i);
  }
}
function ye(e) {
  if ((p && (ne(p), (p = null)), e)) return;
  const t = T;
  (T = null), t.length && L(() => fe(t), !1);
}
function ne(e) {
  for (let t = 0; t < e.length; t++) te(e[t]);
}
function j(e, t) {
  e.state = 0;
  for (let n = 0; n < e.sources.length; n += 1) {
    const i = e.sources[n];
    if (i.sources) {
      const s = i.state;
      s === E
        ? i !== t && (!i.updatedAt || i.updatedAt < V) && te(i)
        : s === U && j(i, t);
    }
  }
}
function se(e) {
  for (let t = 0; t < e.observers.length; t += 1) {
    const n = e.observers[t];
    n.state || ((n.state = U), n.pure ? p.push(n) : T.push(n), n.observers && se(n));
  }
}
function P(e) {
  let t;
  if (e.sources)
    for (; e.sources.length; ) {
      const n = e.sources.pop(),
        i = e.sourceSlots.pop(),
        s = n.observers;
      if (s && s.length) {
        const r = s.pop(),
          l = n.observerSlots.pop();
        i < s.length && ((r.sourceSlots[l] = i), (s[i] = r), (n.observerSlots[i] = l));
      }
    }
  if (e.tOwned) {
    for (t = e.tOwned.length - 1; t >= 0; t--) P(e.tOwned[t]);
    delete e.tOwned;
  }
  if (e.owned) {
    for (t = e.owned.length - 1; t >= 0; t--) P(e.owned[t]);
    e.owned = null;
  }
  if (e.cleanups) {
    for (t = e.cleanups.length - 1; t >= 0; t--) e.cleanups[t]();
    e.cleanups = null;
  }
  (e.state = 0), delete e.sourceMap;
}
function be(e) {
  return e instanceof Error
    ? e
    : new Error(typeof e == 'string' ? e : 'Unknown error', { cause: e });
}
function ie(e, t = d) {
  throw be(e);
}
const Se = Symbol('fallback');
function X(e) {
  for (let t = 0; t < e.length; t++) e[t]();
}
function $e(e, t, n = {}) {
  let i = [],
    s = [],
    r = [],
    l = 0,
    o = t.length > 1 ? [] : null;
  return (
    pe(() => X(r)),
    () => {
      let a = e() || [],
        u = a.length,
        f,
        c;
      return (
        a[ae],
        C(() => {
          let g, A, k, B, N, w, y, b, _;
          if (u === 0)
            l !== 0 && (X(r), (r = []), (i = []), (s = []), (l = 0), o && (o = [])),
              n.fallback &&
                ((i = [Se]), (s[0] = M((oe) => ((r[0] = oe), n.fallback()))), (l = 1));
          else if (l === 0) {
            for (s = new Array(u), c = 0; c < u; c++) (i[c] = a[c]), (s[c] = M($));
            l = u;
          } else {
            for (
              k = new Array(u),
                B = new Array(u),
                o && (N = new Array(u)),
                w = 0,
                y = Math.min(l, u);
              w < y && i[w] === a[w];
              w++
            );
            for (y = l - 1, b = u - 1; y >= w && b >= w && i[y] === a[b]; y--, b--)
              (k[b] = s[y]), (B[b] = r[y]), o && (N[b] = o[y]);
            for (g = new Map(), A = new Array(b + 1), c = b; c >= w; c--)
              (_ = a[c]), (f = g.get(_)), (A[c] = f === void 0 ? -1 : f), g.set(_, c);
            for (f = w; f <= y; f++)
              (_ = i[f]),
                (c = g.get(_)),
                c !== void 0 && c !== -1
                  ? ((k[c] = s[f]),
                    (B[c] = r[f]),
                    o && (N[c] = o[f]),
                    (c = A[c]),
                    g.set(_, c))
                  : r[f]();
            for (c = w; c < u; c++)
              c in k
                ? ((s[c] = k[c]), (r[c] = B[c]), o && ((o[c] = N[c]), o[c](c)))
                : (s[c] = M($));
            (s = s.slice(0, (l = u))), (i = a.slice(0));
          }
          return s;
        })
      );
      function $(g) {
        if (((r[c] = g), o)) {
          const [A, k] = W(c, { name: 'index' });
          return (o[c] = k), t(a[c], A);
        }
        return t(a[c]);
      }
    }
  );
}
function S(e, t) {
  return ge(e, t || {});
}
const ve = (e) =>
  `Attempting to access a stale value from <${e}> that could possibly be undefined. This may occur because you are reading the accessor returned from the component at a time where it has already been unmounted. We recommend cleaning up any stale timers or async, or reading from the initial condition.`;
function re(e) {
  const t = 'fallback' in e && { fallback: () => e.fallback };
  return I(
    $e(() => e.each, e.children, t || void 0),
    void 0,
    { name: 'value' },
  );
}
function D(e) {
  const t = e.keyed,
    n = I(() => e.when, void 0, { name: 'condition value' }),
    i = t ? n : I(n, void 0, { equals: (s, r) => !s == !r, name: 'condition' });
  return I(
    () => {
      const s = i();
      if (s) {
        const r = e.children;
        return typeof r == 'function' && r.length > 0
          ? C(() =>
              r(
                t
                  ? s
                  : () => {
                      if (!C(i)) throw ve('Show');
                      return n();
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
const Ae = (e) => I(() => e());
function ke(e, t, n) {
  let i = n.length,
    s = t.length,
    r = i,
    l = 0,
    o = 0,
    a = t[s - 1].nextSibling,
    u = null;
  for (; l < s || o < r; ) {
    if (t[l] === n[o]) {
      l++, o++;
      continue;
    }
    for (; t[s - 1] === n[r - 1]; ) s--, r--;
    if (s === l) {
      const f = r < i ? (o ? n[o - 1].nextSibling : n[r - o]) : a;
      for (; o < r; ) e.insertBefore(n[o++], f);
    } else if (r === o) for (; l < s; ) (!u || !u.has(t[l])) && t[l].remove(), l++;
    else if (t[l] === n[r - 1] && n[o] === t[s - 1]) {
      const f = t[--s].nextSibling;
      e.insertBefore(n[o++], t[l++].nextSibling),
        e.insertBefore(n[--r], f),
        (t[s] = n[r]);
    } else {
      if (!u) {
        u = new Map();
        let c = o;
        for (; c < r; ) u.set(n[c], c++);
      }
      const f = u.get(t[l]);
      if (f != null)
        if (o < f && f < r) {
          let c = l,
            $ = 1,
            g;
          for (; ++c < s && c < r && !((g = u.get(t[c])) == null || g !== f + $); ) $++;
          if ($ > f - o) {
            const A = t[l];
            for (; o < f; ) e.insertBefore(n[o++], A);
          } else e.replaceChild(n[o++], t[l++]);
        } else l++;
      else t[l++].remove();
    }
  }
}
const J = '_$DX_DELEGATE';
function Te(e, t, n, i = {}) {
  if (!t)
    throw new Error(
      "The `element` passed to `render(..., element)` doesn't exist. Make sure `element` exists in the document.",
    );
  let s;
  return (
    M((r) => {
      (s = r), t === document ? e() : m(t, e(), t.firstChild ? null : void 0, n);
    }, i.owner),
    () => {
      s(), (t.textContent = '');
    }
  );
}
function v(e, t, n, i) {
  let s;
  const r = () => {
      const o = document.createElement('template');
      return (o.innerHTML = e), o.content.firstChild;
    },
    l = () => (s || (s = r())).cloneNode(!0);
  return (l.cloneNode = l), l;
}
function H(e, t = window.document) {
  const n = t[J] || (t[J] = new Set());
  for (let i = 0, s = e.length; i < s; i++) {
    const r = e[i];
    n.has(r) || (n.add(r), t.addEventListener(r, Ee));
  }
}
function m(e, t, n, i) {
  if ((n !== void 0 && !i && (i = []), typeof t != 'function')) return q(e, t, i, n);
  F((s) => q(e, t(), s, n), i);
}
function Ee(e) {
  let t = e.target;
  const n = `$$${e.type}`,
    i = e.target,
    s = e.currentTarget,
    r = (a) => Object.defineProperty(e, 'target', { configurable: !0, value: a }),
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
          r(t.host),
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
    r(a[0]);
    for (let u = 0; u < a.length - 2 && ((t = a[u]), !!l()); u++) {
      if (t._$host) {
        (t = t._$host), o();
        break;
      }
      if (t.parentNode === s) break;
    }
  } else o();
  r(i);
}
function q(e, t, n, i, s) {
  for (; typeof n == 'function'; ) n = n();
  if (t === n) return n;
  const r = typeof t,
    l = i !== void 0;
  if (((e = (l && n[0] && n[0].parentNode) || e), r === 'string' || r === 'number')) {
    if (r === 'number' && ((t = t.toString()), t === n)) return n;
    if (l) {
      let o = n[0];
      o && o.nodeType === 3
        ? o.data !== t && (o.data = t)
        : (o = document.createTextNode(t)),
        (n = x(e, n, i, o));
    } else
      n !== '' && typeof n == 'string'
        ? (n = e.firstChild.data = t)
        : (n = e.textContent = t);
  } else if (t == null || r === 'boolean') n = x(e, n, i);
  else {
    if (r === 'function')
      return (
        F(() => {
          let o = t();
          for (; typeof o == 'function'; ) o = o();
          n = q(e, o, n, i);
        }),
        () => n
      );
    if (Array.isArray(t)) {
      const o = [],
        a = n && Array.isArray(n);
      if (K(o, t, n, s)) return F(() => (n = q(e, o, n, i, !0))), () => n;
      if (o.length === 0) {
        if (((n = x(e, n, i)), l)) return n;
      } else a ? (n.length === 0 ? Q(e, o, i) : ke(e, n, o)) : (n && x(e), Q(e, o));
      n = o;
    } else if (t.nodeType) {
      if (Array.isArray(n)) {
        if (l) return (n = x(e, n, i, t));
        x(e, n, null, t);
      } else
        n == null || n === '' || !e.firstChild
          ? e.appendChild(t)
          : e.replaceChild(t, e.firstChild);
      n = t;
    } else console.warn('Unrecognized value. Skipped inserting', t);
  }
  return n;
}
function K(e, t, n, i) {
  let s = !1;
  for (let r = 0, l = t.length; r < l; r++) {
    let o = t[r],
      a = n && n[e.length],
      u;
    if (!(o == null || o === !0 || o === !1))
      if ((u = typeof o) == 'object' && o.nodeType) e.push(o);
      else if (Array.isArray(o)) s = K(e, o, a) || s;
      else if (u === 'function')
        if (i) {
          for (; typeof o == 'function'; ) o = o();
          s = K(e, Array.isArray(o) ? o : [o], Array.isArray(a) ? a : [a]) || s;
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
function Q(e, t, n = null) {
  for (let i = 0, s = t.length; i < s; i++) e.insertBefore(t[i], n);
}
function x(e, t, n, i) {
  if (n === void 0) return (e.textContent = '');
  const s = i || document.createTextNode('');
  if (t.length) {
    let r = !1;
    for (let l = t.length - 1; l >= 0; l--) {
      const o = t[l];
      if (s !== o) {
        const a = o.parentNode === e;
        !r && !l ? (a ? e.replaceChild(s, o) : e.insertBefore(s, n)) : a && o.remove();
      } else r = !0;
    }
  } else e.insertBefore(s, n);
  return [s];
}
const _e = [
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
var xe = v('<div class=blocker-grid>'),
  Ce = v('<button class=blocker-card><h3></h3><p>');
const Ie = (e) =>
  (() => {
    var t = xe();
    return (
      m(
        t,
        S(re, {
          get each() {
            return e.types;
          },
          children: (n) =>
            (() => {
              var i = Ce(),
                s = i.firstChild,
                r = s.nextSibling;
              return (
                (i.$$click = () => e.onSelect(n)),
                m(s, () => n.title),
                m(r, () => n.emotion),
                i
              );
            })(),
        }),
      ),
      t
    );
  })();
H(['click']);
var Pe = v(
    '<div class=strategy-container><div class=selected-type><h2></h2><p class=emotion></p></div><h3>Recommended Strategies:</h3><div class=strategy-list>',
  ),
  Oe = v(
    '<div class=strategy-item><p class=strategy-text></p><div class=strategy-actions><button class="action-button task"title="Add as task">+ Task',
  ),
  Le = v('<button class="action-button pomodoro"title="Start Pomodoro">⏱️ Start');
const Be = (e) =>
  (() => {
    var t = Pe(),
      n = t.firstChild,
      i = n.firstChild,
      s = i.nextSibling,
      r = n.nextSibling,
      l = r.nextSibling;
    return (
      m(i, () => e.type.title),
      m(s, () => e.type.emotion),
      m(
        l,
        S(re, {
          get each() {
            return e.type.strategies;
          },
          children: (o) =>
            (() => {
              var a = Oe(),
                u = a.firstChild,
                f = u.nextSibling,
                c = f.firstChild;
              return (
                m(u, o),
                (c.$$click = () => e.onStrategyAction(o, 'task')),
                m(
                  f,
                  (() => {
                    var $ = Ae(() => !!o.toLowerCase().includes('pomodoro'));
                    return () =>
                      $() &&
                      (() => {
                        var g = Le();
                        return (g.$$click = () => e.onStrategyAction(o, 'pomodoro')), g;
                      })();
                  })(),
                  null,
                ),
                a
              );
            })(),
        }),
      ),
      t
    );
  })();
H(['click']);
var Ne = v('<button class=back-button>← Back'),
  De = v(
    "<div class=intro><h2>What's holding you back?</h2><p>Choose what best matches your current feeling:",
  ),
  Me = v(
    '<div class=app><header class=header><h1>Procrastination Buster</h1></header><main class=main></main><footer class=footer><p>💡 Tip: Use <kbd>Ctrl+Shift+P</kbd> for quick access',
  );
const Re = () => {
  const [e, t] = W(null),
    [n, i] = W(!0),
    s = (o) => {
      t(o), i(!1);
    },
    r = () => {
      t(null), i(!0);
    },
    l = async (o, a) => {
      const u = e();
      if (u)
        try {
          const f =
            a === 'task'
              ? { type: 'ADD_STRATEGY_TASK', strategy: o, blockerType: u.title }
              : { type: 'START_POMODORO' };
          window.parent !== window &&
            window.parent.postMessage(
              { type: 'PLUGIN_MESSAGE', pluginId: 'procrastination-buster', data: f },
              '*',
            );
        } catch (f) {
          console.error('Failed to send message:', f);
        }
    };
  return (() => {
    var o = Me(),
      a = o.firstChild;
    a.firstChild;
    var u = a.nextSibling;
    return (
      m(
        a,
        S(D, {
          get when() {
            return !n();
          },
          get children() {
            var f = Ne();
            return (f.$$click = r), f;
          },
        }),
        null,
      ),
      m(
        u,
        S(D, {
          get when() {
            return n();
          },
          get children() {
            return De();
          },
        }),
        null,
      ),
      m(
        u,
        S(D, {
          get when() {
            return !e();
          },
          get children() {
            return S(Ie, { types: _e, onSelect: s });
          },
        }),
        null,
      ),
      m(
        u,
        S(D, {
          get when() {
            return e();
          },
          get children() {
            return S(Be, {
              get type() {
                return e();
              },
              onStrategyAction: l,
            });
          },
        }),
        null,
      ),
      o
    );
  })();
};
H(['click']);
const Z = document.getElementById('root');
Z && Te(() => S(Re, {}), Z);
