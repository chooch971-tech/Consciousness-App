'use strict';

// Social resource routes use Mongo ObjectIds, apart from the explicit `me`
// convenience alias supported by the current user's summary and list routes.
function isValidSocialResourceId(id, path) {
  if (/^[a-f\d]{24}$/i.test(id)) return true;
  if (id !== 'me') return false;
  return ['/summary', '/followers', '/following'].some(suffix => path.endsWith(suffix));
}

module.exports = { isValidSocialResourceId };
