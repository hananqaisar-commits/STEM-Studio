/**
 * Reveal an item inside its own scroll pane without moving the page or any
 * other ancestor. Element.scrollIntoView() can scroll the viewport as well,
 * which is disruptive when playback updates on narrow screens.
 */
export function scrollWithinContainer(
  container: HTMLElement | null,
  element: HTMLElement | null,
  behavior: ScrollBehavior = 'smooth',
): void {
  if (!container || !element || !container.contains(element) || container.clientHeight === 0) return;

  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const visibleTop = containerRect.top + container.clientTop;
  const visibleBottom = visibleTop + container.clientHeight;
  const margin = Math.min(12, container.clientHeight / 4);

  let scrollDelta = 0;
  if (elementRect.top < visibleTop + margin) {
    scrollDelta = elementRect.top - visibleTop - margin;
  } else if (elementRect.bottom > visibleBottom - margin) {
    scrollDelta = elementRect.bottom - visibleBottom + margin;
  }

  if (Math.abs(scrollDelta) >= 1) {
    container.scrollBy({ top: scrollDelta, behavior });
  }
}
