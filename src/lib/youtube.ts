/** Pulls the video (and playlist) out of any YouTube link people are likely to paste. */
export function parseYouTube(input: string): { videoId: string; list?: string } | null {
  const text = input.trim();
  if (/^[\w-]{11}$/.test(text)) return { videoId: text };
  let url: URL;
  try {
    url = new URL(text.startsWith('http') ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  let videoId: string | null = null;
  if (host === 'youtu.be') videoId = url.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    videoId = url.searchParams.get('v');
    const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);
    if (!videoId && m) videoId = m[1];
  }
  if (!videoId || !/^[\w-]{11}$/.test(videoId)) return null;
  const list = url.searchParams.get('list') ?? undefined;
  return { videoId, list: list && /^[\w-]{10,64}$/.test(list) ? list : undefined };
}

export function embedUrl(videoId: string, startSeconds: number, list?: string): string {
  const p = new URLSearchParams({
    autoplay: '1',
    enablejsapi: '1',
    playsinline: '1',
    rel: '0',
    start: String(Math.max(0, Math.floor(startSeconds))),
    origin: location.origin,
  });
  if (list) p.set('list', list);
  return `https://www.youtube-nocookie.com/embed/${videoId}?${p}`;
}

export function thumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

/** Talks to an embedded player through YouTube's iframe API. */
export function command(frame: HTMLIFrameElement | null, func: 'playVideo' | 'pauseVideo' | 'seekTo', args: unknown[] = []) {
  frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
}
