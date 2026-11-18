(() => {
  const scope = number => document.querySelector(`.generic-autopager-page[data-page="${number}"]`);
  window.__autoPagerFixture = {
    scroll(number) {
      const firstSource = scope(number).querySelector('[data-observed-source="1"]');
      scrollBy(0, firstSource.getBoundingClientRect().top - 36);
    },
    snapshot(number) {
      const section = scope(number);
      const box = section.getBoundingClientRect();
      const results = [1, 2, 3, 4, 5].map(index => {
        const observed = part => section.querySelector(`[data-observed-${part}="${index}"]`);
        return {
          sourceTop: observed('source').getBoundingClientRect().top,
          bodyBottom: observed('body').getBoundingClientRect().bottom,
          title: observed('title').textContent.trim(),
        };
      });
      return { page: number, results, left: box.left, right: box.right,
        dpr: devicePixelRatio, scale: visualViewport.scale, documentWidth: document.documentElement.scrollWidth,
        viewport: innerWidth };
    },
  };
})();
