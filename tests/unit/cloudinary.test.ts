import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cloudinaryConfig, signParams } from "../../src/server/uploads/cloudinary";

describe("cloudinary uploads", () => {
  test("is off unless all three values are present", () => {
    assert.equal(cloudinaryConfig({}), null);
    assert.equal(cloudinaryConfig({ CLOUDINARY_CLOUD_NAME: "demo", CLOUDINARY_API_KEY: "123" }), null);
    assert.equal(cloudinaryConfig({ CLOUDINARY_CLOUD_NAME: "bad name!", CLOUDINARY_API_KEY: "1", CLOUDINARY_API_SECRET: "s" }), null);
    const config = cloudinaryConfig({ CLOUDINARY_CLOUD_NAME: " demo ", CLOUDINARY_API_KEY: "123", CLOUDINARY_API_SECRET: "shh" });
    assert.deepEqual(config, { cloudName: "demo", apiKey: "123", apiSecret: "shh", apiBase: "https://api.cloudinary.com" });
  });

  test("accepts the single CLOUDINARY_URL form", () => {
    assert.deepEqual(cloudinaryConfig({ CLOUDINARY_URL: "cloudinary://123456:abcDEF_secret@my-cloud" }), {
      cloudName: "my-cloud",
      apiKey: "123456",
      apiSecret: "abcDEF_secret",
      apiBase: "https://api.cloudinary.com",
    });
  });

  test("signs parameters the way Cloudinary verifies them (sorted, joined, secret appended, SHA-1)", () => {
    const params = { timestamp: 1700000000, folder: "webineer/org/images", allowed_formats: "jpg,png" };
    const expected = createHash("sha1").update("allowed_formats=jpg,png&folder=webineer/org/images&timestamp=1700000000" + "shh").digest("hex");
    assert.equal(signParams(params, "shh"), expected);
    assert.notEqual(signParams({ ...params, folder: "webineer/other/images" }, "shh"), expected);
    assert.notEqual(signParams(params, "different"), expected);
  });
});
