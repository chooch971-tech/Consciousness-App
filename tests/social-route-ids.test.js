'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidSocialResourceId } = require('../social-route-ids');

test('social resource IDs accept ObjectIds and the documented self aliases only', () => {
  const objectId = '0123456789abcdef01234567';
  assert.equal(isValidSocialResourceId(objectId, '/api/social/users/' + objectId + '/followers'), true);
  assert.equal(isValidSocialResourceId('me', '/api/social/users/me/summary'), true);
  assert.equal(isValidSocialResourceId('me', '/api/social/users/me/followers'), true);
  assert.equal(isValidSocialResourceId('me', '/api/social/users/me/following'), true);
  assert.equal(isValidSocialResourceId('me', '/api/social/users/me/posts'), true);
  assert.equal(isValidSocialResourceId('me', '/api/social/users/me/comments'), true);
  assert.equal(isValidSocialResourceId('not-an-id', '/api/social/users/not-an-id/followers'), false);
});
