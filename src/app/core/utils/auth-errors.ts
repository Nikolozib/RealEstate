// Maps Firebase OAuth popup failures to user-facing copy, shared by the
// login and register pages so both explain the same failure the same way.
//
// Returns an empty string for the two "the user simply changed their mind"
// codes: closing the popup or opening a second one is a normal action, not
// an error, and showing a red banner for it is noise.
export function googleAuthErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window. Allow popups for this site and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'This email is already registered with a password. Sign in with your password instead.';
    case 'auth/network-request-failed':
      return 'Network problem reaching Google. Check your connection and try again.';
    // Both are configuration problems rather than anything the visitor did:
    // the provider is switched off in the Firebase console, or the site's
    // domain is missing from Authentication → Settings → Authorized domains.
    case 'auth/operation-not-allowed':
    case 'auth/unauthorized-domain':
      return 'Google sign-in is not available right now. Please use your email and password.';
    default:
      return 'Could not sign in with Google. Please try again.';
  }
}
