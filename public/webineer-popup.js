/*!
 * Webineer popup registration embed.
 * Usage:
 *   <button data-webineer-register="PUBLIC_ID" data-webineer-origin="https://your-webineer-domain">Register</button>
 *   <script src="https://your-webineer-domain/webineer-popup.js" async></script>
 * The script only opens the Webineer-hosted form in an iframe. It contains no
 * credentials and never reads data from the host page.
 */
(function () {
  "use strict";
  if (window.WebineerPopup) return;

  var ID_RE = /^[A-Za-z0-9]{6,40}$/;
  var current = document.currentScript;
  var scriptOrigin = "";
  try {
    if (current && current.src) scriptOrigin = new URL(current.src).origin;
  } catch (e) {}

  var state = null;

  function el(tag, styles, attrs) {
    var node = document.createElement(tag);
    if (styles) node.setAttribute("style", styles);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) node.setAttribute(k, attrs[k]);
    return node;
  }

  function close() {
    if (!state) return;
    window.removeEventListener("message", state.onMessage);
    document.removeEventListener("keydown", state.onKey, true);
    clearTimeout(state.timer);
    document.documentElement.style.overflow = state.prevOverflow;
    if (state.overlay.parentNode) state.overlay.parentNode.removeChild(state.overlay);
    if (state.trigger && state.trigger.focus) state.trigger.focus();
    state = null;
  }

  function open(publicId, origin, trigger) {
    if (!ID_RE.test(publicId)) return;
    origin = (origin || scriptOrigin || "").replace(/\/+$/, "");
    if (!/^https?:\/\//.test(origin)) return;
    close();

    var src = origin + "/embed/" + encodeURIComponent(publicId) + "?source=popup";
    var overlay = el("div", "position:fixed;inset:0;z-index:2147483000;background:rgba(4,27,94,.55);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;", { role: "presentation" });
    var dialog = el("div", "position:relative;width:100%;max-width:520px;max-height:92vh;background:#fff;border-radius:16px;box-shadow:0 24px 60px rgba(4,27,94,.35);overflow:hidden;display:flex;flex-direction:column;", { role: "dialog", "aria-modal": "true", "aria-label": "Webinar registration" });
    var closeBtn = el("button", "position:absolute;top:10px;right:10px;z-index:2;width:34px;height:34px;border-radius:999px;border:0;background:rgba(255,255,255,.95);box-shadow:0 2px 8px rgba(0,0,0,.15);font:600 20px/34px system-ui,sans-serif;color:#041B5E;cursor:pointer;", { type: "button", "aria-label": "Close registration form" });
    closeBtn.textContent = "×";
    var status = el("div", "padding:48px 24px;text-align:center;font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#4D5C8A;", { role: "status" });
    status.textContent = "Loading registration form…";
    var frame = el("iframe", "width:100%;height:600px;max-height:88vh;border:0;display:block;opacity:0;transition:opacity .2s;", { src: src, title: "Webinar registration form", loading: "eager" });

    dialog.appendChild(closeBtn);
    dialog.appendChild(status);
    dialog.appendChild(frame);
    overlay.appendChild(dialog);

    var loaded = false;
    frame.addEventListener("load", function () {
      loaded = true;
      status.style.display = "none";
      frame.style.opacity = "1";
    });

    var timer = setTimeout(function () {
      if (loaded) return;
      status.innerHTML = "";
      var msg = el("p", "margin:0 0 12px;color:#B33A3A;");
      msg.textContent = "We couldn’t load the registration form.";
      var link = el("a", "color:#041B5E;font-weight:600;", { href: src, target: "_blank", rel: "noopener" });
      link.textContent = "Open it in a new tab";
      status.appendChild(msg);
      status.appendChild(link);
    }, 15000);

    function onMessage(event) {
      if (event.origin !== origin || !event.data || event.data.publicId !== publicId) return;
      if (event.data.type === "webineer:resize" && typeof event.data.height === "number") {
        var max = Math.round(window.innerHeight * 0.88);
        frame.style.height = Math.min(Math.max(320, event.data.height), max) + "px";
      }
    }
    function onKey(event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      } else if (event.key === "Tab") {
        // Keep focus inside the dialog (close button <-> iframe).
        var active = document.activeElement;
        if (event.shiftKey && active === closeBtn) {
          event.preventDefault();
          frame.focus();
        } else if (!event.shiftKey && active === frame) {
          event.preventDefault();
          closeBtn.focus();
        }
      }
    }

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) close();
    });
    closeBtn.addEventListener("click", close);
    window.addEventListener("message", onMessage);
    document.addEventListener("keydown", onKey, true);

    state = { overlay: overlay, onMessage: onMessage, onKey: onKey, timer: timer, trigger: trigger, prevOverflow: document.documentElement.style.overflow };
    document.documentElement.style.overflow = "hidden";
    document.body.appendChild(overlay);
    closeBtn.focus();
  }

  function bind(root) {
    var nodes = (root || document).querySelectorAll("[data-webineer-register]");
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.getAttribute("data-webineer-bound") === "1") continue;
      node.setAttribute("data-webineer-bound", "1");
      node.addEventListener("click", function (event) {
        event.preventDefault();
        var t = event.currentTarget;
        open(t.getAttribute("data-webineer-register"), t.getAttribute("data-webineer-origin"), t);
      });
    }
  }

  window.WebineerPopup = { open: open, close: close, bind: bind };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { bind(); });
  else bind();
})();
