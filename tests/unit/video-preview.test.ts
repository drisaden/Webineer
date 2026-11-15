import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createDefaultWorkflowConfig } from "../../src/lib/webinar-workflow/defaults";
import { clipPreviewSupported, isDirectVideoUrl, resolveVideoPreview, vimeoVideoId, youtubeVideoId } from "../../src/lib/webinar-workflow/preview";
import { evaluateWorkflow } from "../../src/lib/webinar-workflow/validation";

const config = (videoUrl: string, provider = "youtube") => {
  const c = createDefaultWorkflowConfig({ hostName: "Host", hostEmail: "h@example.com", timezone: "Africa/Lagos" });
  c.integrations.video = { ...c.integrations.video, provider: provider as never, url: videoUrl };
  c.registration.showVideoPreview = true;
  return c;
};

describe("registration video preview", () => {
  test("recognises YouTube, Vimeo and direct video links", () => {
    assert.equal(youtubeVideoId("https://www.youtube.com/watch?v=jNQXAC9IVRw"), "jNQXAC9IVRw");
    assert.equal(youtubeVideoId("https://www.youtube.com/watch?feature=share&v=jNQXAC9IVRw&t=3"), "jNQXAC9IVRw");
    assert.equal(youtubeVideoId("https://youtu.be/jNQXAC9IVRw?si=abc"), "jNQXAC9IVRw");
    assert.equal(youtubeVideoId("https://www.youtube.com/embed/jNQXAC9IVRw"), "jNQXAC9IVRw");
    assert.equal(youtubeVideoId("https://www.youtube.com/shorts/jNQXAC9IVRw"), "jNQXAC9IVRw");
    assert.equal(youtubeVideoId("https://example.com/watch?v=jNQXAC9IVRw"), null);
    assert.equal(vimeoVideoId("https://vimeo.com/76979871"), "76979871");
    assert.equal(vimeoVideoId("https://player.vimeo.com/video/76979871?h=1"), "76979871");
    assert.equal(isDirectVideoUrl("https://cdn.example.com/a/clip.mp4"), true);
    assert.equal(isDirectVideoUrl("https://res.cloudinary.com/demo/video/upload/v1/webineer/x"), true);
    assert.equal(isDirectVideoUrl("http://cdn.example.com/clip.mp4"), false);
    assert.equal(isDirectVideoUrl("https://example.com/page"), false);
  });

  test("the preview is off unless enabled", () => {
    const c = config("https://www.youtube.com/watch?v=jNQXAC9IVRw");
    c.registration.showVideoPreview = false;
    assert.equal(resolveVideoPreview(c), null);
  });

  test("a clip preview never exposes the whole webinar video", () => {
    const c = config("https://www.youtube.com/watch?v=jNQXAC9IVRw");
    assert.deepEqual(resolveVideoPreview(c), { kind: "youtube", videoId: "jNQXAC9IVRw", percent: 10 });
    c.registration.videoPreview = { source: "clip", clipPercent: 35, customUrl: "" };
    assert.deepEqual(resolveVideoPreview(c), { kind: "youtube", videoId: "jNQXAC9IVRw", percent: 35 });
    // Out-of-range values are clamped rather than trusted.
    c.registration.videoPreview = { source: "clip", clipPercent: 100, customUrl: "" };
    assert.equal(resolveVideoPreview(c)?.percent, 50);
    c.registration.videoPreview = { source: "clip", clipPercent: 0, customUrl: "" };
    assert.equal(resolveVideoPreview(c)?.percent, 5);
  });

  test("webinars saved before the setting existed default to a 10% clip", () => {
    const c = config("https://vimeo.com/76979871", "vimeo");
    delete c.registration.videoPreview;
    assert.deepEqual(resolveVideoPreview(c), { kind: "vimeo", videoId: "76979871", percent: 10 });
  });

  test("players that can't be limited show no clip instead of the full video", () => {
    assert.equal(clipPreviewSupported("https://fast.wistia.net/embed/iframe/abc123"), false);
    assert.equal(resolveVideoPreview(config("https://fast.wistia.net/embed/iframe/abc123", "custom_iframe")), null);
    const warnings = evaluateWorkflow(config("https://fast.wistia.net/embed/iframe/abc123", "custom_iframe")).sections.registration.issues.filter((i) => i.field === "videoPreview");
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].severity, "warning");
  });

  test("a separate preview video plays in full and must be a playable https link", () => {
    const c = config("https://fast.wistia.net/embed/iframe/abc123", "custom_iframe");
    c.registration.videoPreview = { source: "custom", clipPercent: 10, customUrl: "https://res.cloudinary.com/demo/video/upload/v1/webineer/o/videos/teaser.mp4" };
    assert.deepEqual(resolveVideoPreview(c), { kind: "file", url: "https://res.cloudinary.com/demo/video/upload/v1/webineer/o/videos/teaser.mp4", percent: 100 });
    c.registration.videoPreview.customUrl = "";
    assert.equal(resolveVideoPreview(c), null);
    assert.ok(evaluateWorkflow(c).sections.registration.issues.some((i) => i.field === "videoPreview" && i.severity === "error"));
    c.registration.videoPreview.customUrl = "javascript:alert(1)";
    assert.equal(resolveVideoPreview(c), null);
    c.registration.videoPreview.customUrl = "https://example.com/not-a-video";
    assert.equal(resolveVideoPreview(c), null);
  });
});
