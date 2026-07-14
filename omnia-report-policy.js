'use strict';

const CLOCK_RECOMMENDATION = /(?:\b(?:recommend|suggest|try|add|practice|work\s+on|focus\s+on|return\s+to|consider|prioritize|schedule)\b[^.!?]*\bclock\b|\b(?:should|could)\b[^.!?]{0,40}\b(?:try|add|practice|work\s+on|focus\s+on|return\s+to|prioritize|schedule)\b[^.!?]*\bclock\b|\bclock\b[^.!?]*\b(?:next|should\s+be|could\s+be|recommend(?:ed)?|suggest(?:ed)?|priority)\b)/i;

function enforceOmniaReportPolicy(message, context) {
  const text = String(message || '').trim();
  if (!text || !context || !context.avoid_clock_recommendation) return text;

  const sentences = text.match(/[^.!?]+[.!?]?/g) || [text];
  const allowed = sentences.filter(sentence => !CLOCK_RECOMMENDATION.test(sentence.trim()));
  const result = allowed.join(' ').replace(/\s+/g, ' ').trim();
  if (result) return result;

  return 'Your practice is taking shape. Keep developing the Thought Control work already in your regimen, carry forward today\'s strongest effort, and stay patient with the repetition.';
}

module.exports = { enforceOmniaReportPolicy };
