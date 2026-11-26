/* Northeast Damp Proofers: lead tracking + WhatsApp photo button */
(function () {
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  function track(name) {
    try { window.va('pageview', { route: '/lead/' + name, path: '/lead/' + name + location.pathname.replace(/\.html$/, '') }); } catch (e) {}
    try { if (window.gtag) window.gtag('event', name === 'call' ? 'phone_call_click' : name === 'whatsapp' ? 'whatsapp_click' : name === 'form' ? 'generate_lead' : 'email_click', { page_path: location.pathname }); } catch (e) {}
  }
  var WA = 'https://wa.me/447366312425?text=' + encodeURIComponent("Hi, I've got a damp problem and I'd like a free damp check. Here's a photo:");

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (h.indexOf('tel:') === 0) track('call');
    else if (h.indexOf('wa.me') > -1) track('whatsapp');
    else if (h.indexOf('mailto:') === 0) track('email');
  }, true);
  document.addEventListener('submit', function () { track('form'); }, true);

  function addButton() {
    if (document.getElementById('wa-float')) return;
    var s = document.createElement('style');
    s.textContent = '#wa-float{position:fixed;right:14px;bottom:14px;z-index:9999;display:flex;align-items:center;gap:8px;background:#25D366;color:#fff;font:700 15px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:12px 16px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.25);text-decoration:none}#wa-float:hover{background:#1ebe5b}#wa-float svg{width:22px;height:22px;flex:none}@media print{#wa-float{display:none}}';
    document.head.appendChild(s);
    var a = document.createElement('a');
    a.id = 'wa-float';
    a.href = WA;
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', 'WhatsApp us a photo of your damp for a free check');
    a.innerHTML = '<svg viewBox="0 0 32 32" fill="#fff" aria-hidden="true"><path d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.2.6 4.4 1.7 6.3L3 29l7.3-1.9c1.8 1 3.8 1.5 5.8 1.5 7 0 12.7-5.6 12.7-12.6S23 3 16 3zm0 23.1c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-4.3 1.1 1.2-4.2-.3-.4c-1-1.6-1.6-3.5-1.6-5.4C5.3 9.8 10.1 5.1 16 5.1s10.7 4.7 10.7 10.5S21.9 26.1 16 26.1zm5.9-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.5.1-.2.1-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg><span>Send us a photo</span>';
    document.body.appendChild(a);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton); else addButton();
})();
