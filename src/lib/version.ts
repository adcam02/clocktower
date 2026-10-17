import { create } from 'zustand';

/** Whether a newer copy of the site has been published since this page loaded. */
export const useUpdate = create<{ available: boolean }>(() => ({ available: false }));

function loadedScript(): string | null {
  const el = document.querySelector<HTMLScriptElement>('script[type="module"][src*="assets/index-"]');
  return el ? new URL(el.src).pathname.split('/').pop() ?? null : null;
}

/** Every few minutes, look at the published page to see whether it now points at a newer build. */
export function watchForUpdates() {
  const mine = loadedScript();
  if (!mine) return; // the dev server
  const check = async () => {
    try {
      const res = await fetch(`./index.html?check=${Date.now()}`, { cache: 'no-store' });
      const html = await res.text();
      const live = html.match(/assets\/(index-[\w-]+\.js)/)?.[1];
      if (live && live !== mine) useUpdate.setState({ available: true });
    } catch {
      /* offline for a moment; try again next time */
    }
  };
  setInterval(check, 4 * 60 * 1000);
  setTimeout(check, 20 * 1000);
}
