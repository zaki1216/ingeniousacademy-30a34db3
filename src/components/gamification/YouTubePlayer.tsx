import { useEffect, useRef } from "react";
import { getYouTubeId } from "@/lib/utils/youtube";

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: Record<string, unknown>) => { destroy?: () => void };
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;
  apiLoadPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiLoadPromise;
}

export function YouTubePlayer({
  url,
  title,
  onComplete,
}: {
  url: string;
  title: string;
  onComplete?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ destroy?: () => void } | null>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    calledRef.current = false;
    const id = getYouTubeId(url);
    if (!id || !ref.current) return;
    let destroyed = false;

    // The YT API replaces the target element with its iframe — always give it a
    // fresh child element so switching lectures mounts a brand-new player.
    ref.current.innerHTML = "";
    const mount = document.createElement("div");
    mount.className = "w-full h-full";
    ref.current.appendChild(mount);

    loadYouTubeAPI().then(() => {
      if (destroyed || !window.YT) return;
      playerRef.current?.destroy?.();
      playerRef.current = new window.YT.Player(mount, {
        videoId: id,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e: { data: number }) => {
            if (e.data === window.YT!.PlayerState.ENDED && !calledRef.current) {
              calledRef.current = true;
              onComplete?.();
            }
          },
        },
      });
    });
    return () => {
      destroyed = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [url, onComplete]);

  return (
    <div className="aspect-video w-full">
      <div ref={ref} className="w-full h-full rounded-lg overflow-hidden" title={title} />
    </div>
  );
}
