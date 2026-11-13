// 组件代码运行在嵌套的 sandbox iframe 里（不同源、无法访问主页和扩展 API）。
// 这里注入 window.lp，并把存取请求转交给主页，由主页按组件 id 限定命名空间后读写。
const PRELUDE = '(' + function () {
  var pending = {};
  var seq = 0;
  var listeners = [];
  function call(op, key, value) {
    return new Promise(function (resolve, reject) {
      var id = ++seq;
      pending[id] = { resolve: resolve, reject: reject };
      parent.postMessage({ lp: 1, id: id, op: op, key: key, value: value }, '*');
      setTimeout(function () {
        if (pending[id]) { delete pending[id]; reject(new Error('lp timeout')); }
      }, 5000);
    });
  }
  function appearance(glass, theme) {
    document.documentElement.classList.toggle('lp-glass', glass === true);
    document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
    function updateRules(rules) {
      Array.from(rules).forEach(function (rule) {
        if (rule.media) {
          if (!rule.lpOriginalMedia) rule.lpOriginalMedia = rule.media.mediaText;
          rule.media.mediaText = rule.lpOriginalMedia.replace(/\(prefers-color-scheme:\s*(dark|light)\)/g, function (_, mode) { return mode === theme ? '(min-width: 0px)' : '(max-width: -1px)'; });
        }
        if (rule.cssRules) updateRules(rule.cssRules);
      });
    }
    Array.from(document.styleSheets).forEach(function (sheet) { try { updateRules(sheet.cssRules); } catch (_) {} });
  }
  window.lp = {
    get: function (key) { return call('get', key); },
    set: function (key, value) { return call('set', key, value); },
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };
  parent.postMessage({ lp: 1, type: 'ready' }, '*');
  addEventListener('message', function (event) {
    if (event.source !== parent) return;
    var data = event.data;
    if (!data || data.lp !== 1) return;
    if (data.type === 'appearance') { appearance(data.glass, data.theme); return; }
    if (data.id && pending[data.id]) {
      var p = pending[data.id];
      delete pending[data.id];
      data.error ? p.reject(new Error(data.error)) : p.resolve(data.value);
    } else if (data.type === 'change') {
      listeners.forEach(function (fn) { try { fn(data.key, data.value); } catch (e) { console.error(e); } });
    }
  });
}.toString() + ')();';

let inner = null;

window.addEventListener('message', event => {
  const data = event.data;
  if (event.source === parent && data?.type === 'widget-render' && typeof data.code === 'string') {
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.srcdoc = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;min-height:100%;font:14px system-ui;box-sizing:border-box}*{box-sizing:border-box}</style><script>' + PRELUDE + '<\/script>' + data.code;
    frame.srcdoc += '<style>html.lp-glass,html.lp-glass body,html.lp-glass body > .app{background:transparent!important;background-image:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}html.lp-glass{scrollbar-width:none}</style>';
    frame.addEventListener('load', () => frame.contentWindow.postMessage({lp:1,type:'appearance',glass:data.glass === true,theme:data.theme}, '*'));
    inner = frame;
    document.body.replaceChildren(frame);
    return;
  }
  if (data?.lp !== 1) return;
  if (inner && event.source === inner.contentWindow) parent.postMessage(data, '*');
  else if (event.source === parent && inner?.contentWindow) inner.contentWindow.postMessage(data, '*');
});
