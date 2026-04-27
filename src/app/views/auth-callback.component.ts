import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    <div class="min-h-screen flex items-center justify-center bg-black text-white font-mono text-sm">
      <p>Authentication successful. Closing window...</p>
    </div>
  `
})
export class AuthCallbackComponent implements OnInit {
  ngOnInit() {
    // Small timeout to allow Supabase to parse hash and save to localStorage
    setTimeout(() => {
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
        window.close();
      } else {
        window.location.href = '/';
      }
    }, 1000);
  }
}
