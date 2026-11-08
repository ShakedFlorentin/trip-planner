// Chip rows cut at the screen edge fade where they continue (10): a row gets "more-start" / "more-end" while there is
// more to scroll that way, and the CSS fades that edge. One listener for every row, kept up to date as screens change.
const ROWS = '.chips.scroll, .tabs-bar'

function update(el: Element) {
  const r = el as HTMLElement
  const max = r.scrollWidth - r.clientWidth
  // right to left, scrollLeft runs from 0 down to -max
  const pos = Math.abs(r.scrollLeft)
  r.classList.toggle('more-start', max > 2 && pos > 2)
  r.classList.toggle('more-end', max > 2 && pos < max - 2)
}

let raf = 0
const all = () => {
  raf = 0
  document.querySelectorAll(ROWS).forEach(update)
}
const soon = () => {
  if (!raf) raf = requestAnimationFrame(all)
}

export function watchFades() {
  document.addEventListener(
    'scroll',
    (e) => {
      const el = e.target as Element
      if (el instanceof Element && el.matches(ROWS)) update(el)
    },
    true,
  )
  window.addEventListener('resize', soon)
  new MutationObserver(soon).observe(document.body, { childList: true, subtree: true })
  soon()
}
