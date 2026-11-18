(() => {
  const menu = document.querySelector('.section-nav');
  if (!menu) return;
  const links = [...menu.querySelectorAll('a')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  const nav = menu.closest('nav');

  function update() {
    const line = nav.getBoundingClientRect().bottom + 2;
    let active = 0;
    sections.forEach((section, index) => {
      if (!section) return;
      const bounds = section.getBoundingClientRect();
      if (bounds.height && bounds.top <= line) active = index;
    });
    const last = sections.at(-1)?.getBoundingClientRect();
    const atBottom = window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    if (atBottom && last?.height && last.top < window.innerHeight) active = links.length - 1;

    links.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  window.addEventListener('pageshow', update);
  const observer = new ResizeObserver(update);
  sections.forEach(section => { if (section) observer.observe(section); });
  update();
})();
