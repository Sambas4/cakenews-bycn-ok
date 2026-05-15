import { Directive, ElementRef, OnDestroy, OnInit, output, inject } from '@angular/core';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Modal-friendly focus trap with built-in ESC handler.
 *
 * Behaviour:
 *   * On mount, captures the previously-focused element (the trigger
 *     button), focuses the first focusable inside the host. Blurs
 *     don't escape — Tab / Shift+Tab cycle through.
 *   * `Escape` emits {@link escape}. The host decides whether to close.
 *   * On destroy, restores focus to the original trigger so screen
 *     readers and keyboard users land where they started.
 *
 * Selector is `[appFocusTrap]` — apply to any modal root.
 */
@Directive({
  selector: '[appFocusTrap]',
  standalone: true,
})
export class FocusTrapDirective implements OnInit, OnDestroy {
  /** Fired when the user hits Escape inside the trapped surface. */
  escape = output<KeyboardEvent>();

  private hostRef = inject(ElementRef);
  private previouslyFocused: HTMLElement | null = null;
  private boundKeydown = this.onKeydown.bind(this);

  private get root(): HTMLElement {
    return this.hostRef.nativeElement as HTMLElement;
  }

  ngOnInit(): void {
    const root = this.root;
    this.previouslyFocused = (document.activeElement as HTMLElement | null) ?? null;
    queueMicrotask(() => {
      const firstFocusable = root.querySelector(FOCUSABLE_SELECTOR) as HTMLElement | null;
      if (firstFocusable) firstFocusable.focus();
      else { root.setAttribute('tabindex', '-1'); root.focus(); }
    });
    root.addEventListener('keydown', this.boundKeydown);
  }

  ngOnDestroy(): void {
    this.root.removeEventListener('keydown', this.boundKeydown);
    // Restore focus only if the trigger still exists in the DOM.
    if (this.previouslyFocused && document.contains(this.previouslyFocused)) {
      try { this.previouslyFocused.focus(); }
      catch { /* element may have been removed; ignore */ }
    }
  }

  private onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.escape.emit(e);
      return;
    }
    if (e.key !== 'Tab') return;

    const nodeList = this.root.querySelectorAll(FOCUSABLE_SELECTOR);
    const focusables: HTMLElement[] = [];
    nodeList.forEach((node) => {
      const el = node as HTMLElement;
      if (!el.hasAttribute('disabled') && el.offsetParent !== null) focusables.push(el);
    });
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = document.activeElement as HTMLElement | null;

    if (e.shiftKey && (active === first || !this.root.contains(active))) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && active === last) {
      first.focus();
      e.preventDefault();
    }
  }
}
