(() => {
  if (CSS.supports('opacity', 'calc(100svh / 1px)')) return;

  // Keep vertical spacing responsive on browsers without typed CSS arithmetic.
  function updateSpacing() {
    const ratio = Math.min(1, Math.max(0, (window.innerWidth - 390) / (1280 - 390)));
    const referenceHeight = 844 + (900 - 844) * ratio;
    const scale = Math.min(1.4, Math.max(.65, window.innerHeight / referenceHeight));
    document.documentElement.style.setProperty('--legacy-hero-spacing-scale', scale);
  }

  updateSpacing();
  window.addEventListener('resize', updateSpacing);
})();
