import {
  readBgFastPath,
  usePreferencesStore,
} from "@/modules/settings/preferences";
import { BG_OPACITY_RENDER_FACTOR } from "@/modules/settings/store";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const OVERLAY_Z = 2147483646;
const RESIZE_IDLE_MS = 280;
const FADE_IN_MS = 200;

export function SurfaceLayer() {
  const [fastPath] = useState(readBgFastPath);
  const storeActive = usePreferencesStore(
    (s) =>
      (s.backgroundKind === "image" && !!s.backgroundImageId) ||
      (s.backgroundKind === "url" && !!s.backgroundImageUrl),
  );
  const hydrated = usePreferencesStore((s) => s.hydrated);
  const active = hydrated ? storeActive : fastPath.active;
  if (!active) return null;

  return hydrated ? <HydratedBackground /> : <FastPathBackground fastPath={fastPath} />;
}

function FastPathBackground({
  fastPath,
}: {
  fastPath: ReturnType<typeof readBgFastPath>;
}) {
  const opacity = usePreferencesStore((s) => s.backgroundOpacity);
  const blur = usePreferencesStore((s) => s.backgroundBlur);

  if (fastPath.url) {
    return (
      <UrlBackgroundDiv
        url={fastPath.url}
        opacity={opacity}
        blur={blur}
        animated={false}
      />
    );
  }
  if (fastPath.imageId) {
    return (
      <LocalImageBackground
        imageId={fastPath.imageId}
        opacity={opacity}
        blur={blur}
      />
    );
  }
  return null;
}

function HydratedBackground() {
  const backgroundKind = usePreferencesStore((s) => s.backgroundKind);
  const imageId = usePreferencesStore((s) => s.backgroundImageId);
  const imageUrl = usePreferencesStore((s) => s.backgroundImageUrl);
  const opacity = usePreferencesStore((s) => s.backgroundOpacity);
  const blur = usePreferencesStore((s) => s.backgroundBlur);

  if (backgroundKind === "url" && imageUrl) {
    return <UrlBackgroundDiv url={imageUrl} opacity={opacity} blur={blur} animated={false} />;
  }
  if (backgroundKind === "image" && imageId) {
    return <LocalImageBackground imageId={imageId} opacity={opacity} blur={blur} />;
  }
  return null;
}

function LocalImageBackground({
  imageId,
  opacity,
  blur,
}: {
  imageId: string;
  opacity: number;
  blur: number;
}) {
  const [state, setState] = useState<{ url: string; animated: boolean } | null>(
    null,
  );
  const lastUrlRef = useRef<string | null>(null);
  const resizing = useWindowResizing(RESIZE_IDLE_MS);
  const docHidden = useDocumentHidden();

  useEffect(() => {
    if (!imageId) return;
    let alive = true;
    let rafId: number | null = null;
    void (async () => {
      const { getBgImage } = await import("./bgImageStore");
      const blob = await getBgImage(imageId).catch(() => null);
      if (!alive || !blob) return;
      const url = URL.createObjectURL(blob);
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
      lastUrlRef.current = url;
      const t = blob.type.toLowerCase();
      const animated =
        t === "image/gif" || t === "image/apng" || t === "image/webp";
      setState({ url, animated });
      rafId = requestAnimationFrame(() => {
        rafId = null;
      });
    })();
    return () => {
      alive = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [imageId]);

  useEffect(() => {
    return () => {
      if (lastUrlRef.current) {
        URL.revokeObjectURL(lastUrlRef.current);
        lastUrlRef.current = null;
      }
    };
  }, []);

  if (!state) return null;
  return (
    <UrlBackgroundDiv
      url={state.url}
      opacity={opacity}
      blur={blur}
      animated={state.animated}
      resizing={resizing}
      docHidden={docHidden}
    />
  );
}

function UrlBackgroundDiv({
  url,
  opacity,
  blur,
  animated,
  resizing,
  docHidden,
}: {
  url: string;
  opacity: number;
  blur: number;
  animated: boolean;
  resizing?: boolean;
  docHidden?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const resizingActive = useWindowResizing(RESIZE_IDLE_MS);
  const docHiddenActive = useDocumentHidden();
  const isResizing = resizing ?? resizingActive;
  const isDocHidden = docHidden ?? docHiddenActive;

  useEffect(() => {
    setVisible(false);
    const rafId = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(rafId);
  }, [url]);

  const suspendAnimated = animated && (isResizing || isDocHidden);
  const blurActive = !animated && blur > 0 && !isResizing;
  const renderedOpacity =
    visible && !suspendAnimated ? opacity * BG_OPACITY_RENDER_FACTOR : 0;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-hidden
      className="terax-bg-surface"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: OVERLAY_Z,
        pointerEvents: "none",
        backgroundImage: suspendAnimated ? "none" : `url(${url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: renderedOpacity,
        filter: blurActive ? `blur(${blur}px)` : undefined,
        transform: "translateZ(0)",
        transition: `opacity ${FADE_IN_MS}ms ease-out`,
      }}
    />,
    document.body,
  );
}

function useWindowResizing(idleMs: number): boolean {
  const [resizing, setResizing] = useState(false);
  useEffect(() => {
    let timer: number | null = null;
    let active = false;
    const onResize = () => {
      if (!active) {
        active = true;
        setResizing(true);
      }
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        active = false;
        setResizing(false);
        timer = null;
      }, idleMs);
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [idleMs]);
  return resizing;
}

function useDocumentHidden(): boolean {
  const [hidden, setHidden] = useState(
    () => typeof document !== "undefined" && document.hidden,
  );
  useEffect(() => {
    const onChange = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return hidden;
}
