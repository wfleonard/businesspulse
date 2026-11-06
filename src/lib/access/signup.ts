/**
 * Whether self-serve sign-up is open. Off unless BP_ALLOW_SIGNUP=true, so a
 * deploy can't open registration by accident. Sign-up makes customers only;
 * roles keep them out of the dashboard.
 */
export function signupOpen(): boolean {
  return process.env.BP_ALLOW_SIGNUP === 'true'
}

/** Where the emailed verification link lands once better-auth has checked it. */
export const EMAIL_VERIFIED_PATH = '/email-verified'

/** How long a verification link works. */
export const VERIFY_LINK_HOURS = 24
