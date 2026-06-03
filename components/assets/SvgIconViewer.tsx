interface Props {
  src: string;
  title?: string;
}

/**
 * Renders an SVG icon at large preview size with a checkerboard backdrop
 * (the convention from design tools for "this area is transparent — what
 * you see is what the artwork covers").
 *
 * Why <img src> not inline <svg>:
 *   • inline rendering means injecting unsanitised user-uploaded SVG
 *     into our DOM, which is a hard XSS surface even after the
 *     script/event-handler validator catches the obvious cases
 *   • the upload validator already rejects script-bearing SVGs before
 *     storage, but the <img> route adds defence-in-depth — browsers
 *     don't execute scripts inside SVGs loaded via <img>
 */
export function SvgIconViewer({ src, title }: Props) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-10">
      {/* Subtle checkerboard pattern so the user knows where transparent
          pixels are — same convention Sketch/Figma/Inkscape use.
          Pattern lives in globals.css as .checkerboard. */}
      <div
        aria-hidden
        className="checkerboard absolute inset-4 rounded-2xl opacity-30"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={title ?? "SVG icon"}
        className="relative max-w-[60%] max-h-[60%] object-contain"
      />
    </div>
  );
}
