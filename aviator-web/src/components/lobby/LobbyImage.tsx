import Image, { type ImageProps } from "next/image";

import { encodePublicPath } from "@/data/lobby-catalog";

type LobbyImageProps = Omit<ImageProps, "src"> & {
  src: string;
  /** Above-the-fold / LCP — sets Next.js `priority` and eager load */
  priority?: boolean;
};

/** Encoded public asset with safe lazy-load defaults; use `priority` only above the fold. */
export function LobbyImage({ src, priority, alt = "", quality = 90, ...rest }: LobbyImageProps) {
  return (
    <Image
      src={encodePublicPath(src)}
      alt={alt}
      quality={quality}
      unoptimized
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      {...rest}
    />
  );
}
