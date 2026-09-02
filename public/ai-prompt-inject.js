/**
 * 对话页填词：读取 URL 中的 q / p / prompt，写入页面输入框并可选自动发送。
 * 启用规则来自搜索引擎设置里的 injectPrompt（chrome.storage.local jumpData）。
 */
(function () {
  if (window !== window.top) return;
  if (window.__gsAiPromptInject) return;
  window.__gsAiPromptInject = true;

  const params = new URLSearchParams(location.search);
  const PROMPT_PARAM_KEYS = ['_lp_q', 'q', 'p', 'prompt'];
  const prompt = PROMPT_PARAM_KEYS.map((k) => params.get(k)).find((v) => v?.trim())?.trim() || '';
  if (!prompt) return;

  const autoSend = params.get('autosend') !== '0';
  const host = location.hostname.replace(/^www\./, '');

  // Kimi 站点处理 ?q= 可能卡死，尽早从地址栏移除（词已由扩展读取）
  if (prompt && (host === 'kimi.com' || host === 'kimi.moonshot.cn')) {
    try {
      const url = new URL(location.href);
      if (url.searchParams.has('q')) {
        url.searchParams.delete('q');
        history.replaceState(null, '', url.pathname + url.search + url.hash);
      }
    } catch {
      // ignore
    }
  }

  /** 内置选择器（已知站点更准）；其它站点走 GENERIC */
  const BUILTIN = {
    'kimi.com': {
      inputs: [
        'textarea[placeholder*="尽管问"]',
        'textarea[placeholder*="Agent"]',
        'div.chat-input-editor[contenteditable="true"]',
        'div[contenteditable="true"][role="textbox"]',
        'textarea[data-testid="chat-input"]',
      ],
      sends: [
        'div.send-button-container:not(.disabled)',
        'div.send-button-container',
        'div[class*="send-button"]:not([class*="disabled"])',
        'button[aria-label*="发送"]',
        'button[aria-label*="Send"]',
      ],
      delayMs: 300,
      maxAttempts: 30,
      sendMode: 'kimi',
      skipObserverFallback: true,
    },
    'kimi.moonshot.cn': {
      inputs: [
        'textarea[placeholder*="尽管问"]',
        'textarea[placeholder*="Agent"]',
        'div.chat-input-editor[contenteditable="true"]',
        'div[contenteditable="true"][role="textbox"]',
        'textarea[data-testid="chat-input"]',
      ],
      sends: [
        'div.send-button-container:not(.disabled)',
        'div.send-button-container',
        'div[class*="send-button"]:not([class*="disabled"])',
        'button[aria-label*="发送"]',
        'button[aria-label*="Send"]',
      ],
      delayMs: 300,
      maxAttempts: 30,
      sendMode: 'kimi',
      skipObserverFallback: true,
    },
    'chat.deepseek.com': {
      inputs: [
        'textarea#chat-input',
        'textarea[data-testid="chat-input"]',
        'textarea[placeholder*="Message DeepSeek"]',
        'textarea[placeholder*="发送"]',
        'textarea[placeholder*="DeepSeek"]',
        'div[contenteditable="true"][role="textbox"]',
        'textarea',
      ],
      sends: [
        'button[aria-label="Send message"]',
        'button[data-testid="send-button"]',
        'div.ds-icon-button[role="button"]',
        'div[role="button"][aria-label*="Send"]',
        'div[role="button"][aria-label*="发送"]',
        'button[data-testid*="send"]',
        'button[aria-label*="发送"]',
        'button[aria-label*="Send"]',
        'button[class*="send"]',
      ],
      delayMs: 350,
      maxAttempts: 80,
      sendMode: 'deepseek',
    },
    'deepseek.com': {
      inputs: [
        'textarea#chat-input',
        'textarea[data-testid="chat-input"]',
        'textarea[placeholder*="Message DeepSeek"]',
        'div[contenteditable="true"][role="textbox"]',
        'textarea',
      ],
      sends: [
        'button[aria-label="Send message"]',
        'div.ds-icon-button[role="button"]',
        'button[data-testid*="send"]',
        'button[aria-label*="发送"]',
        'button[aria-label*="Send"]',
      ],
      delayMs: 350,
      maxAttempts: 80,
      sendMode: 'deepseek',
    },
    // ChatGPT：优先 textarea（若有），再 ProseMirror
    'chatgpt.com': {
      inputs: [
        'textarea#prompt-textarea',
        'textarea[data-testid="prompt-textarea"]',
        'textarea[class*="fallbackTextarea"]',
        'div#prompt-textarea[contenteditable="true"]',
        '#prompt-textarea',
        'div[contenteditable="true"].ProseMirror',
        'div[contenteditable="true"][data-testid*="composer"]',
        'div[contenteditable="true"][role="textbox"]',
      ],
      sends: [
        'button[data-testid="send-button"]',
        'button[data-testid="fruitjuice-send-button"]',
        'button[aria-label="Send prompt"]',
        'button[aria-label*="Send prompt"]',
        'button[aria-label*="Send"]',
        'button[aria-label*="发送"]',
        'form button[type="submit"]',
      ],
      delayMs: 600,
      maxAttempts: 80,
      sendMode: 'chatgpt',
    },
    'chat.openai.com': {
      inputs: [
        'textarea#prompt-textarea',
        'textarea[data-testid="prompt-textarea"]',
        'div#prompt-textarea[contenteditable="true"]',
        '#prompt-textarea',
        'div[contenteditable="true"].ProseMirror',
        'div[contenteditable="true"][role="textbox"]',
      ],
      sends: [
        'button[data-testid="send-button"]',
        'button[aria-label="Send prompt"]',
        'button[aria-label*="Send"]',
        'button[aria-label*="发送"]',
      ],
      delayMs: 600,
      maxAttempts: 80,
      sendMode: 'chatgpt',
    },
    'gemini.google.com': {
      inputs: [
        'div[contenteditable="true"][role="textbox"]',
        'rich-textarea [contenteditable="true"]',
        'div.ql-editor[contenteditable="true"]',
        '[contenteditable="true"]',
      ],
      sends: [
        'button[aria-label*="Send"]',
        'button[aria-label*="发送"]',
        'button[aria-label*="提交"]',
        'button[mattooltip*="Send"]',
        'button[mattooltip*="发送"]',
        'button[data-testid*="send"]',
        'button[type="submit"]',
      ],
      delayMs: 500,
      maxAttempts: 80,
      sendMode: 'gemini',
    },
  };

  const GENERIC = {
    inputs: [
      'textarea:not([aria-hidden="true"])',
      'div[contenteditable="true"][role="textbox"]',
      '[contenteditable="true"]',
      'input[type="text"]:not([type="search"])',
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"])',
    ],
    sends: [
      'button[data-testid*="send"]',
      'button[aria-label*="发送"]',
      'button[aria-label*="Send"]',
      'button[type="submit"]',
      'button[class*="send"]',
    ],
    delayMs: 200,
    maxAttempts: 40,
  };

  function hostMatches(ruleHost, pageHost) {
    if (!ruleHost || !pageHost) return false;
    return pageHost === ruleHost || pageHost.endsWith('.' + ruleHost);
  }

  function parseJumpData(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  function engineHost(jumpUrl) {
    try {
      return new URL(jumpUrl).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  function resolvePlatform(enabledHosts) {
    const matched = enabledHosts.some((h) => hostMatches(h, host));
    if (!matched) return null;
    return BUILTIN[host] || GENERIC;
  }

  async function loadEnabledHosts() {
    const hosts = new Set();
    const LEGACY_DEFAULT = new Set([
      'kimi.com',
      'kimi.moonshot.cn',
      'chat.deepseek.com',
      'deepseek.com',
      'chatgpt.com',
      'chat.openai.com',
      'gemini.google.com',
      'claude.ai',
      'doubao.com',
      'tongyi.com',
    ]);

    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const result = await chrome.storage.local.get('jumpData');
        const list = parseJumpData(result.jumpData);
        if (list.length) {
          for (const engine of list) {
            const h = engineHost(engine.jumpUrl);
            if (!h) continue;
            if (engine.injectPrompt === true) {
              hosts.add(h);
            } else if (engine.injectPrompt === false) {
              // 明确关闭
            } else if (LEGACY_DEFAULT.has(h)) {
              hosts.add(h);
            }
          }
          return [...hosts];
        }
      }
    } catch {
      // ignore
    }

    LEGACY_DEFAULT.forEach((h) => hosts.add(h));
    return [...hosts];
  }

  const isVisible = (el) => {
    if (!el || !(el instanceof Element)) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const findInput = (platform) => {
    for (const sel of platform.inputs) {
      const nodes = document.querySelectorAll(sel);
      for (const el of nodes) {
        if (isVisible(el)) return el;
      }
    }
    return null;
  };

  const isSendEnabled = (btn) => {
    if (!btn || !isVisible(btn)) return false;
    if (btn.disabled) return false;
    if (btn.getAttribute('aria-disabled') === 'true') return false;
    if (btn.hasAttribute('disabled')) return false;
    const cls = String(btn.className || '');
    if (/\bdisabled\b/i.test(cls) && !/\benabled\b/i.test(cls)) return false;
    return true;
  };

  const findSend = (platform, inputEl) => {
    const scopes = [
      inputEl?.closest('form'),
      inputEl?.closest('[class*="composer"]'),
      inputEl?.closest('[class*="input"]'),
      inputEl?.closest('[class*="chat"]'),
      inputEl?.parentElement,
      document.body,
    ].filter(Boolean);

    for (const scope of scopes) {
      for (const sel of platform.sends) {
        const btn = scope.querySelector(sel);
        if (btn && isVisible(btn)) return btn;
      }
    }

    const buttons = document.querySelectorAll('button, div[role="button"]');
    for (const btn of buttons) {
      if (!isVisible(btn)) continue;
      const label = `${btn.getAttribute('aria-label') || ''} ${btn.textContent || ''}`.toLowerCase();
      if (/(停止|stop|取消)/i.test(label)) continue;
      if (/(发送|send|提交|prompt)/i.test(label)) return btn;
    }
    return null;
  };

  const fillTextarea = (el, text) => {
    el.focus();
    const proto = window.HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : HTMLTextAreaElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc?.set) desc.set.call(el, text);
    else el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  /** ProseMirror / contenteditable（ChatGPT 等） */
  const fillContentEditable = (el, text) => {
    el.focus();

    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('delete', false);
    } catch {
      // ignore
    }

    let inserted = false;
    try {
      inserted = document.execCommand('insertText', false, text);
    } catch {
      inserted = false;
    }

    if (!inserted) {
      try {
        el.textContent = '';
        const p = document.createElement('p');
        p.textContent = text;
        el.appendChild(p);
      } catch {
        el.textContent = text;
      }
    }

    // 尽量触发 React / ProseMirror 内部状态（否则发送按钮会一直 disabled）
    el.dispatchEvent(
      new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        composed: true,
        inputType: 'insertText',
        data: text,
      })
    );
    el.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        composed: true,
        inputType: 'insertText',
        data: text,
      })
    );
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const fill = (el, text) => {
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      fillTextarea(el, text);
    } else {
      fillContentEditable(el, text);
    }
  };

  const clearUrlParams = () => {
    try {
      const url = new URL(location.href);
      ['_lp_q', 'q', 'p', 'prompt', 'autosend'].forEach((k) => url.searchParams.delete(k));
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch {
      // ignore
    }
  };

  const fillSendOk = (resp) => !!(resp?.success && resp?.result?.ok);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const clickLikeUser = (el) => {
    if (!el) return;
    const opts = { bubbles: true, cancelable: true, view: window, composed: true };
    el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerId: 1, pointerType: 'mouse' }));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 1, pointerType: 'mouse' }));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
    if (typeof el.click === 'function') el.click();
  };

  const pressEnter = (el) => {
    if (!el) return;
    el.focus();
    const opts = {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      composed: true,
    };
    el.dispatchEvent(new KeyboardEvent('keydown', opts));
    el.dispatchEvent(new KeyboardEvent('keypress', opts));
    el.dispatchEvent(new KeyboardEvent('keyup', opts));
  };

  const hasStartedReply = () =>
    !!document.querySelector(
      'button[data-testid="stop-button"], button[aria-label*="Stop"], button[aria-label*="停止"]'
    );

  /** ChatGPT：只在按钮真正启用后再点；禁用时点了也不会发 */
  const trySendChatGPT = async (platform, inputEl) => {
    inputEl.focus();
    await sleep(platform.delayMs || 600);

    for (let i = 0; i < 80; i++) {
      let btn = null;
      for (const sel of platform.sends || []) {
        const found = document.querySelector(sel);
        if (found && isVisible(found)) {
          btn = found;
          break;
        }
      }
      if (!btn) btn = findSend(platform, inputEl);

      if (btn && isSendEnabled(btn)) {
        clickLikeUser(btn);
        await sleep(300);
        if (hasStartedReply()) return true;
        // 已启用但仍未开始回复时，再点一次
        clickLikeUser(btn);
        await sleep(300);
        return hasStartedReply();
      }

      await sleep(150);
    }

    return false;
  };

  const trySend = async (platform, inputEl) => {
    if (platform.sendMode === 'chatgpt') {
      return trySendChatGPT(platform, inputEl);
    }

    // 通用：等 React 识别输入后启用发送按钮
    for (let i = 0; i < 25; i++) {
      const btn = findSend(platform, inputEl);
      if (btn && isSendEnabled(btn)) {
        clickLikeUser(btn);
        return true;
      }
      await sleep(80);
    }

    pressEnter(inputEl);
    return false;
  };

  const run = (platform) => {
    if (platform.skipObserverFallback) return;

    let done = false;
    let attempts = 0;
    const maxAttempts = platform.maxAttempts || 40;

    const tryOnce = async () => {
      if (done) return true;
      attempts += 1;
      const input = findInput(platform);
      if (!input) return false;

      fill(input, prompt);
      // 确认写入（ChatGPT 有时会吞掉第一次）
      await sleep(60);
      const current =
        input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement
          ? input.value
          : (input.textContent || '').replace(/\u200b/g, '').trim();
      if (!current || !current.includes(prompt.slice(0, Math.min(12, prompt.length)))) {
        fill(input, prompt);
        await sleep(80);
      }

      done = true;
      clearUrlParams();

      if (autoSend) {
        // ChatGPT 需要多等一会让发送按钮从 disabled 恢复
        await sleep(
          platform.sendMode === 'chatgpt'
            ? Math.max(platform.delayMs || 600, 600)
            : platform.sendMode === 'deepseek' || platform.sendMode === 'kimi'
              ? Math.max(platform.delayMs || 350, 350)
              : (platform.delayMs || 200)
        );
        await trySend(platform, input);
      }
      return true;
    };

    const tick = async () => {
      if (await tryOnce()) return;
      if (attempts < maxAttempts) setTimeout(tick, 250);
    };

    // SPA：输入框晚出现时用 MutationObserver 兜底
    const obs = new MutationObserver(() => {
      if (done) {
        obs.disconnect();
        return;
      }
      tryOnce().then((ok) => {
        if (ok) obs.disconnect();
      });
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), Math.max(15000, maxAttempts * 250));

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(tick, 150));
    } else {
      setTimeout(tick, 150);
    }
  };

  loadEnabledHosts().then(async (hosts) => {
    const platform = resolvePlatform(hosts);
    if (!platform) return;

    // ChatGPT：走 background MAIN 世界注入，才能让 ProseMirror 状态更新并启用发送按钮
    if (platform.sendMode === 'chatgpt' && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        const resp = await chrome.runtime.sendMessage({
          action: 'CHATGPT_FILL_SEND',
          prompt,
          autoSend,
        });
        if (fillSendOk(resp)) {
          clearUrlParams();
          return;
        }
      } catch {
        // fallback to isolated-world path below
      }
    }

    // Gemini：主世界填词（Angular contenteditable）
    if (platform.sendMode === 'gemini' && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        const resp = await chrome.runtime.sendMessage({
          action: 'GEMINI_FILL_SEND',
          prompt,
          autoSend,
        });
        if (fillSendOk(resp)) {
          clearUrlParams();
          return;
        }
      } catch {
        // fallback
      }
    }

    // DeepSeek：主世界填词（React textarea + div[role=button] 发送）
    if (platform.sendMode === 'deepseek' && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        const resp = await chrome.runtime.sendMessage({
          action: 'DEEPSEEK_FILL_SEND',
          prompt,
          autoSend,
        });
        if (fillSendOk(resp)) {
          clearUrlParams();
          return;
        }
      } catch {
        // fallback
      }
    }

    // Kimi：主世界填词；失败也不走 MutationObserver，避免页面卡死
    if (platform.sendMode === 'kimi' && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        const resp = await chrome.runtime.sendMessage({
          action: 'KIMI_FILL_SEND',
          prompt,
          autoSend,
        });
        if (fillSendOk(resp)) {
          clearUrlParams();
          return;
        }
      } catch {
        // ignore
      }
      clearUrlParams();
      return;
    }

    run(platform);
  });
})();
