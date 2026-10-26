/** Only a path on this site, so a crafted ?next= can't send someone elsewhere after signing in. */
export function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : '/dashboard'
}
