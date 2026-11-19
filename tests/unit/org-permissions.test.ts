import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { orgRoleHasPermission } from "../../src/server/auth/permissions";

describe("deleting webinars is for the workspace owner only", () => {
  test("only OWNER can delete", () => {
    assert.equal(orgRoleHasPermission("OWNER", "webinar.delete"), true);
    for (const role of ["ADMIN", "EDITOR", "HOST", "ANALYST"] as const) assert.equal(orgRoleHasPermission(role, "webinar.delete"), false, role);
  });
  test("admins keep their other rights", () => {
    assert.equal(orgRoleHasPermission("ADMIN", "webinar.edit"), true);
    assert.equal(orgRoleHasPermission("ADMIN", "org.billing.manage"), false);
  });
});
