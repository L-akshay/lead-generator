/**
 * Best-effort image fetch for embedding in @react-pdf/renderer.
 * Returns the original URL if reachable, or null if not.
 * react-pdf will then handle the fetch itself; if we return null, callers
 * skip rendering the <Image> entirely.
 */
export async function probeImage(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!/^image\//i.test(ct)) return null;
    return url;
  } catch {
    return null;
  }
}
