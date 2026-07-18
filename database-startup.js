'use strict';

function safeError(error) {
  return {
    name: error && error.name ? error.name : 'Error',
    message: error && error.message ? error.message : String(error || 'Unknown error')
  };
}

async function ensureIndexes(definitions, logger) {
  if (!Array.isArray(definitions)) throw new TypeError('Index definitions must be an array');
  if (!logger || typeof logger.warn !== 'function') throw new TypeError('Index logger is required');

  const failures = [];
  for (const definition of definitions) {
    try {
      await definition.collection.createIndex(definition.keys, definition.options || {});
    } catch (error) {
      const failure = {
        index: definition.label,
        error: safeError(error)
      };
      failures.push(failure);
      logger.warn('database_index_unavailable', failure);
    }
  }
  return failures;
}

module.exports = { ensureIndexes };
