/**
 * Convert a Google Drive share URL to an embeddable preview URL.
 * Handles formats:
 *  - https://drive.google.com/file/d/{ID}/view?usp=sharing
 *  - https://drive.google.com/open?id={ID}
 */
export function toEmbeddablePdfUrl(url: string): string {
  if (!url) return url;
  try {
    const fileMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileMatch?.[1]) {
      return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
    }
    const u = new URL(url);
    const id = u.searchParams.get("id");
    if (id && u.hostname.includes("drive.google.com")) {
      return `https://drive.google.com/file/d/${id}/preview`;
    }
  } catch {
    // ignore
  }
  return url;
}

export function toDownloadPdfUrl(url: string): string {
  if (!url) return url;
  const fileMatch = url.match(/\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) {
    return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;
  }
  try {
    const u = new URL(url);
    const id = u.searchParams.get("id");
    if (id && u.hostname.includes("drive.google.com")) {
      return `https://drive.google.com/uc?export=download&id=${id}`;
    }
  } catch {
    // ignore
  }
  return url;
}
