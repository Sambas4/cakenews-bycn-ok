import { Component, OnInit } from '@angular/core';

/**
 * OAuth pop-up landing page. Posts a strict same-origin message back to the
 * opener so the parent window can flip into the authenticated state, then
 * closes itself. Fallback: if there is no opener (single-tab redirect), we
 * navigate the current tab to the app root.
 */
@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    <div class="min-h-screen flex items-center justify-center bg-black text-white text-sm">
      <p class="opacity-80">Authentification réussie. Vous pouvez fermer cette fenêtre.</p>
    </div>
  `
})
export class AuthCallbackComponent implements OnInit {
  ngOnInit() {
    // Give Supabase a tick to consume the URL hash and persist the session.
    setTimeout(() => {
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, window.location.origin);
          window.close();
          return;
        }
      } catch { /* opener cross-origin */ }
      window.location.replace('/');
    }, 600);
  }
}
