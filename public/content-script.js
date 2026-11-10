// 只在最外层页面放一个全屏壳，里面嵌扩展自己的浮层页面。
function gsIsTopFrame() {
  try { return window === window.top; } catch { return false; }
}
if (!gsIsTopFrame() || window.__gsExtInit) {
  /* embedded frame or already initialized */
} else {
window.__gsExtInit = true;

const overlayUrl = chrome.runtime.getURL('overlay.html');
const overlayOrigin = new URL(overlayUrl).origin;

const SHELL_STYLE = {
  position: 'fixed',
  top: '0',
  right: 'auto',
  bottom: 'auto',
  left: '0',
  margin: '0',
  padding: '0',
  border: '0',
  'border-radius': '0',
  'box-shadow': 'none',
  opacity: '1',
  'z-index': '2147483647',
  transform: 'none',
  filter: 'none',
  zoom: '1',
  'clip-path': 'none',
  overflow: 'hidden',
  'max-width': 'none',
  'max-height': 'none',
  float: 'none',
  clear: 'none',
  transition: 'background 0.28s cubic-bezier(0.22, 1, 0.36, 1), backdrop-filter 0.28s cubic-bezier(0.22, 1, 0.36, 1), -webkit-backdrop-filter 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
};

function paintBox(el, props) {
  for (const key of Object.keys(props)) el.style.setProperty(key, props[key], 'important');
}

function frameScrim(open) {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const bg = open
    ? (dark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(15, 15, 18, 0.42)')
    : 'rgba(15, 15, 18, 0)';
  const blur = open ? 'blur(10px) saturate(140%)' : 'blur(0px) saturate(100%)';
    return {
    background: bg,
    'backdrop-filter': blur,
    '-webkit-backdrop-filter': blur,
  };
}

function paintShell(shell, interactive, scrim) {
  const w = window.innerWidth + 'px';
  const h = window.innerHeight + 'px';
  paintBox(shell, Object.assign({}, SHELL_STYLE, frameScrim(scrim), {
    width: w,
    height: h,
    'min-width': w,
    'min-height': h,
    visibility: interactive ? 'visible' : 'hidden',
    'pointer-events': interactive ? 'auto' : 'none',
  }));
}

function openShell(shell) {
  if (typeof shell.showPopover !== 'function') return;
  if (shell.matches(':popover-open')) return;
  try { shell.showPopover(); } catch { /* already open */ }
}

function closeShell(shell) {
  if (typeof shell.hidePopover !== 'function') return;
  if (!shell.matches(':popover-open')) return;
  try { shell.hidePopover(); } catch { /* already closed */ }
}

function fillFrame(frame, shell) {
  const w = Math.max(shell?.clientWidth || 0, window.innerWidth) + 'px';
  const h = Math.max(shell?.clientHeight || 0, window.innerHeight) + 'px';
  paintBox(frame, {
    display: 'block',
    position: 'absolute',
    top: '0',
    left: '0',
    width: w,
    height: h,
    'min-width': w,
    'min-height': h,
    'max-width': 'none',
    'max-height': 'none',
    margin: '0',
    padding: '0',
    border: '0',
    background: 'transparent',
    opacity: '1',
    transform: 'none',
    filter: 'none',
    zoom: '1',
    'pointer-events': 'auto',
  });
}

let shell = null;
let frame = null;
let shellOpen = false;
let frameReady = false;
let pending = null;
let straySUntil = 0;
let hideTimer = 0;
let closing = false;
let lastToggleAt = 0;

function armStrayS() {
  straySUntil = performance.now() + 320;
}

function isStrayS(e) {
  if (!e || e.altKey || e.ctrlKey || e.metaKey || e.repeat) return false;
  if (performance.now() > straySUntil) return false;
  return e.key === 's' || e.key === 'S' || e.code === 'KeyS';
}

function isToggleHotkey(e) {
  return !!(e.altKey && (e.key === 's' || e.key === 'S' || e.code === 'KeyS') && !e.repeat);
}

function postToOverlay(message) {
  if (!frameReady || !frame?.contentWindow) {
    pending = message;
    return;
  }
  frame.contentWindow.postMessage({ source: 'lp-host', ...message }, overlayOrigin);
}

function ensureHost() {
  if (shell?.isConnected && frame) return;
  shell = document.createElement('div');
  shell.id = 'init-gs-host';
  shell.setAttribute('data-init-gs', '1');
  shell.setAttribute('popover', 'manual');
  paintShell(shell, false, false);
  (document.documentElement || document.body).appendChild(shell);

  frame = document.createElement('iframe');
  frame.title = 'LaunchPad';
  frame.setAttribute('data-init-gs', '1');
  frame.setAttribute('aria-hidden', 'true');
  frame.src = overlayUrl;
  shell.appendChild(frame);
  void shell.offsetWidth;
  fillFrame(frame, shell);
}

function showHost() {
  ensureHost();
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = 0;
  }
  shellOpen = true;
  closing = false;
  openShell(shell);
  paintShell(shell, true, false);
  fillFrame(frame, shell);
  frame.setAttribute('aria-hidden', 'false');
  void shell.offsetHeight;
  paintShell(shell, true, true);
  fillFrame(frame, shell);
  try { frame.contentWindow.focus(); } catch { /* not ready */ }
}

function hideHost() {
  if (!shell || closing) return;
  shellOpen = false;
  closing = true;
  paintShell(shell, true, false);
  frame.setAttribute('aria-hidden', 'true');
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    hideTimer = 0;
    closing = false;
    if (shellOpen || !shell) return;
    paintShell(shell, false, false);
    closeShell(shell);
  }, 280);
}

function toggleHost() {
  const now = performance.now();
  if (now - lastToggleAt < 280) return;
  lastToggleAt = now;
  armStrayS();
  if (shellOpen) {
    postToOverlay({ type: 'hide' });
    hideHost();
    } else {
    showHost();
    postToOverlay({ type: 'show', armStray: true });
  }
}

window.addEventListener('message', (e) => {
  if (e.origin !== overlayOrigin) return;
  if (!frame || e.source !== frame.contentWindow) return;
  const data = e.data;
  if (!data || data.source !== 'lp-overlay') return;
  if (data.type === 'ready') {
    frameReady = true;
    if (pending) {
      const message = pending;
      pending = null;
      postToOverlay(message);
    }
      return;
    }
  if (data.type === 'show') {
    if (!shellOpen) showHost();
      return;
    }
  if (data.type === 'hide') hideHost();
});

window.addEventListener('keydown', (e) => {
  if (isToggleHotkey(e)) {
      e.preventDefault();
    e.stopImmediatePropagation();
    toggleHost();
    return;
  }
  if (!shellOpen) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopImmediatePropagation();
    postToOverlay({ type: 'hide' });
    hideHost();
      return;
    }
  if (isStrayS(e)) {
        e.preventDefault();
    e.stopImmediatePropagation();
        return;
      }
        e.preventDefault();
  e.stopImmediatePropagation();
  try { frame.contentWindow.focus(); } catch { /* ignore */ }
}, true);

window.addEventListener('keyup', (e) => {
  if (e.key === 'Alt' && straySUntil > performance.now()) straySUntil = performance.now() + 280;
  if (!shellOpen && !isStrayS(e)) return;
  if (isStrayS(e) || shellOpen) {
      e.preventDefault();
      e.stopImmediatePropagation();
  }
}, true);

window.addEventListener('resize', () => {
  if (!shell || !frame || !shellOpen) return;
  paintShell(shell, true, true);
  fillFrame(frame, shell);
});

if (chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((request) => {
    if (request?.action === 'SHOW_SEARCH') toggleHost();
  });
}

ensureHost();

} // end top-frame guard
