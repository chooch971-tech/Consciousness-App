'use strict';

(function exposePresenceCalendar(root, factory) {
  var calendar = factory();
  if (typeof module === 'object' && module.exports) module.exports = calendar;
  if (root) {
    root.PresenceCalendar = calendar;
    root.presenceDayKey = calendar.dayKey;
    root.presenceMonthKey = calendar.monthKey;
    root.presenceWeekKey = calendar.weekKey;
    root.presenceAddDays = calendar.addDays;
    root.presenceDateFromDayKey = calendar.dateFromDayKey;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createPresenceCalendar() {
  var DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

  function pad(value) { return String(value).padStart(2, '0'); }

  function asDate(value) {
    if (value instanceof Date) return new Date(value.getTime());
    return value == null ? new Date() : new Date(value);
  }

  function dayKey(value) {
    if (typeof value === 'string' && DAY_KEY.test(value)) return value;
    var date = asDate(value);
    if (isNaN(date.getTime())) return '';
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function monthKey(value) {
    if (typeof value === 'string' && DAY_KEY.test(value)) return value.slice(0, 7);
    var date = asDate(value);
    if (isNaN(date.getTime())) return '';
    return date.getFullYear() + '-' + pad(date.getMonth() + 1);
  }

  function dateFromDayKey(key) {
    if (!DAY_KEY.test(String(key || ''))) return null;
    var parts = key.split('-').map(Number);
    // Midday avoids a DST transition changing the represented calendar day.
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  }

  function addDays(key, amount) {
    var date = dateFromDayKey(key);
    if (!date) return '';
    date.setDate(date.getDate() + (Number(amount) || 0));
    return dayKey(date);
  }

  function weekKey(value) {
    var date = asDate(value);
    if (isNaN(date.getTime())) return '';
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - date.getDay());
    return 'w-' + dayKey(date);
  }

  function shiftedUtcDate(value, offsetMinutes) {
    var date = asDate(value);
    if (isNaN(date.getTime())) return null;
    var offset = Math.max(-840, Math.min(840, Number(offsetMinutes) || 0));
    return new Date(date.getTime() + offset * 60000);
  }

  function dayKeyAtOffset(value, offsetMinutes) {
    var date = shiftedUtcDate(value, offsetMinutes);
    if (!date) return '';
    return date.getUTCFullYear() + '-' + pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate());
  }

  function monthKeyAtOffset(value, offsetMinutes) {
    return dayKeyAtOffset(value, offsetMinutes).slice(0, 7);
  }

  function weekKeyAtOffset(value, offsetMinutes) {
    var date = shiftedUtcDate(value, offsetMinutes);
    if (!date) return '';
    date.setUTCDate(date.getUTCDate() - date.getUTCDay());
    return 'w-' + date.getUTCFullYear() + '-' + pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate());
  }

  return Object.freeze({
    dayKey: dayKey,
    monthKey: monthKey,
    weekKey: weekKey,
    addDays: addDays,
    dateFromDayKey: dateFromDayKey,
    dayKeyAtOffset: dayKeyAtOffset,
    monthKeyAtOffset: monthKeyAtOffset,
    weekKeyAtOffset: weekKeyAtOffset
  });
});
