import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { formatDateTime, formatDay, formatDayWithWeekday, formatTime, ordinal } from "../../src/lib/datetime";
import { formatInZone } from "../../src/lib/webinar-workflow/time";

describe("friendly dates", () => {
  test("ordinals", () => {
    assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 30, 31].map(ordinal), ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "30th", "31st"]);
  });
  test("the requested format", () => {
    assert.equal(formatDateTime("2026-11-15T05:40:13Z", "Africa/Lagos"), "15th Nov., 2026 6:40am");
    assert.equal(formatDay("2026-11-15T05:40:13Z", "Africa/Lagos"), "15th Nov., 2026");
    assert.equal(formatTime("2026-11-15T05:40:13Z", "Africa/Lagos"), "6:40am");
  });
  test("noon, midnight and afternoon", () => {
    assert.equal(formatTime("2026-03-01T12:00:00Z", "UTC"), "12:00pm");
    assert.equal(formatTime("2026-03-01T00:05:00Z", "UTC"), "12:05am");
    assert.equal(formatTime("2026-03-01T15:07:00Z", "UTC"), "3:07pm");
  });
  test("month names and zones", () => {
    assert.equal(formatDay("2026-05-02T10:00:00Z", "UTC"), "2nd May, 2026");
    assert.equal(formatDay("2026-09-23T10:00:00Z", "UTC"), "23rd Sep., 2026");
    assert.equal(formatDay("2026-11-15T23:30:00Z", "Africa/Lagos"), "16th Nov., 2026", "uses the zone's calendar day");
    assert.equal(formatDayWithWeekday("2026-11-18T10:00:00Z", "UTC"), "Wed, 18th Nov., 2026");
  });
  test("bad input gives an empty string, not a crash", () => {
    assert.equal(formatDateTime("nope"), "");
    assert.equal(formatDateTime("2026-11-15T05:40:00Z", "Not/AZone").length > 0, true);
  });
  test("webinar times show the zone", () => {
    assert.match(formatInZone("2026-11-15T05:40:00Z", "Africa/Lagos"), /^15th Nov., 2026 6:40am (WAT|GMT\+1)$/);
  });
});
