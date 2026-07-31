'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'streak-client.js'), 'utf8');
const swipeStart = source.indexOf('function wireStreakSwipeDismiss');
const swipeEnd = source.indexOf('\nfunction showStreakScreen', swipeStart);
const swipeSource = source.slice(swipeStart, swipeEnd);

function makeClassList(initial) {
  const values = new Set(initial || []);
  return {
    add: value => values.add(value),
    remove: value => values.delete(value),
    contains: value => values.has(value)
  };
}

function makeTouchEvent(x, y, ended) {
  let prevented = false;
  const point = { clientX:x, clientY:y };
  return {
    touches: ended ? [] : [point],
    changedTouches: [point],
    cancelable: true,
    preventDefault() { prevented = true; },
    wasPrevented() { return prevented; }
  };
}

function loadSwipeHarness() {
  const listeners = {};
  const options = {};
  const el = {
    classList: makeClassList(['so-show', 'so-vis']),
    style: {},
    addEventListener(type, handler, listenerOptions) {
      listeners[type] = handler;
      options[type] = listenerOptions;
    }
  };
  const society = { classList: makeClassList() };
  const context = vm.createContext({
    document: { getElementById: id => id === 'societyOverlay' ? society : null },
    window: { innerWidth:390 },
    setTimeout,
    clearTimeout
  });
  vm.runInContext(swipeSource, context);
  let closes = 0;
  context.wireStreakSwipeDismiss(el, immediate => {
    assert.equal(immediate, true);
    closes += 1;
    el.classList.remove('so-show');
    el.classList.remove('so-vis');
  });
  return { el, society, listeners, options, closes:() => closes };
}

test('Streak edge swipe preserves vertical scrolling and can cancel or dismiss cleanly', async () => {
  const h = loadSwipeHarness();
  assert.equal(h.options.touchmove.passive, false, 'horizontal swipe must be able to suppress browser navigation');

  h.listeners.touchstart(makeTouchEvent(8, 320, false));
  const vertical = makeTouchEvent(11, 240, false);
  h.listeners.touchmove(vertical);
  h.listeners.touchend(makeTouchEvent(11, 240, true));
  assert.equal(vertical.wasPrevented(), false, 'vertical calendar movement remains native scrolling');
  assert.equal(h.el.style.transform || '', '');
  assert.equal(h.closes(), 0);

  h.listeners.touchstart(makeTouchEvent(8, 320, false));
  const shortMove = makeTouchEvent(70, 322, false);
  h.listeners.touchmove(shortMove);
  assert.equal(shortMove.wasPrevented(), true);
  assert.equal(h.el.style.transform, 'translate3d(62px,0,0)');
  h.listeners.touchend(makeTouchEvent(80, 322, true));
  await new Promise(resolve => setTimeout(resolve, 240));
  assert.equal(h.el.classList.contains('so-show'), true, 'a short swipe returns to Streak');
  assert.equal(h.el.style.transform, '');
  assert.equal(h.el.style.transition, '');

  h.listeners.touchstart(makeTouchEvent(8, 320, false));
  h.listeners.touchmove(makeTouchEvent(160, 322, false));
  h.listeners.touchend(makeTouchEvent(170, 322, true));
  await new Promise(resolve => setTimeout(resolve, 280));
  assert.equal(h.closes(), 1, 'a swipe past 30% dismisses Streak once');
  assert.equal(h.el.classList.contains('so-show'), false);
  assert.equal(h.el.style.transform, '');
  assert.equal(h.el.style.transition, '');
});

test('Streak swipe waits at the edge and does not dismiss behind Society', () => {
  const h = loadSwipeHarness();
  h.listeners.touchstart(makeTouchEvent(60, 300, false));
  h.listeners.touchmove(makeTouchEvent(220, 302, false));
  h.listeners.touchend(makeTouchEvent(230, 302, true));
  assert.equal(h.closes(), 0);

  h.society.classList.add('soc-show');
  h.listeners.touchstart(makeTouchEvent(8, 300, false));
  h.listeners.touchmove(makeTouchEvent(220, 302, false));
  h.listeners.touchend(makeTouchEvent(230, 302, true));
  assert.equal(h.closes(), 0);
  assert.equal(h.el.style.transform || '', '');
});
