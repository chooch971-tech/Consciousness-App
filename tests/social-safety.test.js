'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  moderateUsername,
  moderateDisplayName,
  moderatePublicText,
  moderatePrivateText,
  normalizeSort,
  rankLodgePosts
} = require('../social-safety');

test('username and public moderation catch direct and obfuscated slurs', () => {
  assert.equal(moderateUsername('calm_n1gg3r').ok, false);
  assert.equal(moderatePublicText('n.i.g.g.e.r').ok, false);
  assert.equal(moderatePublicText('A bigger practice goal for tomorrow').ok, true);
  assert.equal(moderateUsername('quiet_practitioner').ok, true);
  assert.equal(moderateUsername('spice_keeper').ok, true);
});

test('display name moderation catches slurs (including spaced-out names) but permits ordinary names', () => {
  assert.equal(moderateDisplayName('f4ggot').ok, false);
  assert.equal(moderateDisplayName('Chi nk Master').ok, false);
  assert.equal(moderateDisplayName('Jordan Rivera').ok, true);
  assert.equal(moderateDisplayName("O'Brien-Chen").ok, true);
  assert.equal(moderateDisplayName('Spice Keeper').ok, true);
});

test('private moderation blocks dangerous messages but permits ordinary support', () => {
  assert.equal(moderatePrivateText('I will hurt you').ok, false);
  assert.equal(moderatePrivateText('I am going to hurt all of you').ok, false);
  assert.equal(moderatePrivateText('You should go die').ok, false);
  assert.equal(moderatePrivateText('send me nudes').ok, false);
  assert.equal(moderatePrivateText('I hope your practice feels easier tomorrow').ok, true);
});

test('feed sorts are normalized and ranked by their stated signals', () => {
  const now = Date.parse('2026-07-12T12:00:00Z');
  const posts = [
    { _id: 'new', createdAt: '2026-07-12T11:00:00Z', likeCount: 1, commentCount: 1 },
    { _id: 'liked', createdAt: '2026-07-10T12:00:00Z', likeCount: 30, commentCount: 2 },
    { _id: 'discussed', createdAt: '2026-07-11T12:00:00Z', likeCount: 2, commentCount: 18 }
  ];
  assert.equal(normalizeSort('unknown'), 'newest');
  assert.equal(rankLodgePosts(posts, 'newest', now)[0]._id, 'new');
  assert.equal(rankLodgePosts(posts, 'liked', now)[0]._id, 'liked');
  assert.equal(rankLodgePosts(posts, 'commented', now)[0]._id, 'discussed');
  assert.equal(rankLodgePosts(posts, 'controversial', now)[0]._id, 'discussed');
  assert.equal(rankLodgePosts(posts, 'hot', now)[0]._id, 'new');
});
