import { useState } from "react";

export function FriendLinkIcon({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?";

  return (
    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-accent-soft font-display text-base font-semibold text-accent" aria-hidden="true">
      {failed ? initial : <img src={src} alt="" className="size-7 object-contain" loading="lazy" onError={() => setFailed(true)} />}
    </span>
  );
}
