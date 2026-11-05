/** Editor commands must leave typing, IME and open modal interactions alone. */
export function editorKeyboardBlocked(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.isComposing) return true;
  if (typeof document === 'undefined') return false;
  const target = event.target as Element | null;
  const element = target?.nodeType === 1 ? target : document.activeElement;
  if (element?.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) return true;
  if (['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) &&
      element?.closest('button, a[href], [role="button"]')) return true;
  return Boolean(document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [aria-modal="true"]'));
}
