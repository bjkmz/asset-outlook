/** Outbound request logging with secret redaction. */
export function redactUrl(url: string): string {
  return url.replace(/([?&]token=)[^&]*/u, '$1[REDACTED]')
}

export function logOutbound(method: string, url: string): void {
  console.log(`${method} ${redactUrl(url)}`)
}
