'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { enforceOmniaReportPolicy } = require('../omnia-report-policy');

test('removes a Clock recommendation while preserving earned Clock recognition', () => {
  const input = 'You held Clock for 82 seconds, a clear gain. Add Clock again tomorrow. Keep building on that attention.';
  const output = enforceOmniaReportPolicy(input, { avoid_clock_recommendation: true });
  assert.match(output, /held Clock for 82 seconds/);
  assert.doesNotMatch(output, /Add Clock/);
  assert.match(output, /Keep building/);
});

test('provides an encouraging fallback when the whole response violates policy', () => {
  const output = enforceOmniaReportPolicy('Try the Clock exercise next.', { avoid_clock_recommendation: true });
  assert.doesNotMatch(output, /Clock/i);
  assert.match(output, /Thought Control/);
});

test('leaves reports unchanged when Clock is allowed', () => {
  const input = 'Try Clock again tomorrow.';
  assert.equal(enforceOmniaReportPolicy(input, { avoid_clock_recommendation: false }), input);
});

test('preserves encouraging recognition that happens to mention Clock', () => {
  const input = 'You should be proud of your 82-second Clock result. Keep developing the two Thought Control exercises already in your regimen.';
  assert.equal(enforceOmniaReportPolicy(input, { avoid_clock_recommendation: true }), input);
});
