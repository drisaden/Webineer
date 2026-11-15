import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createDefaultWorkflowConfig } from "../../src/lib/webinar-workflow/defaults";
import { evaluateWorkflow } from "../../src/lib/webinar-workflow/validation";

const fresh = () => createDefaultWorkflowConfig({ hostName: "Host", hostEmail: "host@example.com", timezone: "Africa/Lagos" });
const OPTIONAL = ["notifications", "thankYou", "live", "replay"] as const;
const states = (e: ReturnType<typeof evaluateWorkflow>) => Object.fromEntries(Object.entries(e.sections).map(([k, v]) => [k, v.state]));

describe("workflow progress ticks", () => {
  test("a brand-new draft has no completed sections", () => {
    const s = states(evaluateWorkflow(fresh()));
    for (const [key, state] of Object.entries(s)) assert.notEqual(state, "completed", `${key} must not be ticked on a new draft`);
  });

  test("sections with valid defaults are ticked only once reviewed", () => {
    const config = fresh();
    config.reviewedSections = ["notifications"];
    const s = states(evaluateWorkflow(config));
    assert.equal(s.notifications, "completed");
    for (const key of ["thankYou", "live", "replay"]) assert.equal(s[key], "incomplete");
    // Reviewed in the current editing session (not yet saved) also counts.
    assert.equal(states(evaluateWorkflow(fresh(), { reviewedSections: ["live"] })).live, "completed");
  });

  test("a reviewed section with unsaved edits is not ticked until saved", () => {
    const config = fresh();
    config.reviewedSections = ["live"];
    assert.equal(states(evaluateWorkflow(config, { dirtySections: ["live"] })).live, "incomplete");
  });

  test("reviewing does not hide errors: an invalid reviewed section is not completed", () => {
    const config = fresh();
    config.reviewedSections = ["configuration", "integrations"];
    const s = states(evaluateWorkflow(config));
    assert.notEqual(s.configuration, "completed");
    assert.notEqual(s.integrations, "completed");
  });

  test("required sections filled in by the owner are completed without an explicit review", () => {
    const config = fresh();
    config.configuration.title = "My webinar";
    config.configuration.description = "What attendees will learn.";
    config.configuration.mode = "schedule_later";
    const s = states(evaluateWorkflow(config));
    assert.equal(s.configuration, "completed");
  });

  test("publishing confirms every valid section, and unreviewed defaults never block publishing", () => {
    const config = fresh();
    const draft = evaluateWorkflow(config);
    const published = evaluateWorkflow(config, { published: true });
    assert.deepEqual(draft.blockingIssues, published.blockingIssues);
    for (const key of OPTIONAL) {
      assert.equal(draft.sections[key].issues.filter((i) => i.severity === "error").length, 0);
      assert.equal(published.sections[key].state, "completed");
    }
  });
});
