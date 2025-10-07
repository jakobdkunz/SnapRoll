// View Transitions circle theme toggle and helpers
(function(){
  function applyTheme(pref){
    var isDark = pref === 'dark' || (pref === 'device' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    if (isDark) { root.classList.add('dark'); root.style.colorScheme = 'dark'; }
    else { root.classList.remove('dark'); root.style.colorScheme = 'light'; }
  }

  function setTheme(pref){
    try { localStorage.setItem('theme', pref); } catch(_) {}
    if (!document.startViewTransition) { applyTheme(pref); return; }
    document.startViewTransition(() => applyTheme(pref));
  }

  // Expose globally for UI controls
  window.__theme = {
    set: setTheme,
    get: function(){
      var uaMobile = (navigator.userAgentData && navigator.userAgentData.mobile) || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      var deviceDefault = uaMobile ? 'device' : 'light';
      try {
        return localStorage.getItem('theme') || deviceDefault;
      } catch(_) { return deviceDefault; }
    }
  };

  // React to system changes if user selected device
  try {
    var mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', function(){ if (window.__theme.get() === 'device') applyTheme('device'); });
  } catch(_) {}
})();


