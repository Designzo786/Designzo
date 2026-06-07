import {
  Package,
  FileJson,
  ImagePlay,
  Film,
  Box,
  FileText,
  type LucideIcon,
} from "lucide-react";

interface Props {
  fileType: string;
  hasLottieGif?: boolean;
  hasLottieMp4?: boolean;
  hasModelFbx?: boolean;
  hasModelObj?: boolean;
  hasModelUsdz?: boolean;
}

interface Format {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

/**
 * "What's included" card — lists every file the buyer receives when
 * they purchase or claim the asset. Surfaces BEFORE the buy click so
 * buyers see the full bundle (3D primary + alternate engine formats,
 * or Lottie source + GIF + MP4 + LICENSE) without having to dig.
 *
 * Only renders for asset types that actually ship more than one file.
 * Single-file assets (SVG icons, materials, etc.) get no card — they
 * already have one obvious thing to download.
 */
export function IncludedFormats({
  fileType,
  hasLottieGif = false,
  hasLottieMp4 = false,
  hasModelFbx = false,
  hasModelObj = false,
  hasModelUsdz = false,
}: Props) {
  const formats = buildList({
    fileType,
    hasLottieGif,
    hasLottieMp4,
    hasModelFbx,
    hasModelObj,
    hasModelUsdz,
  });

  // Single-file asset types render nothing — the price card + Download
  // button already make it obvious there's one file to grab.
  if (formats.length <= 1) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h3 className="text-sm font-semibold mb-3 inline-flex items-center gap-2 text-primary">
        <Package className="w-4 h-4" />
        What&apos;s included
      </h3>
      <ul className="space-y-2.5">
        {formats.map((f) => {
          const Icon = f.icon;
          return (
            <li key={f.title} className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-elevated border border-border text-accent-light flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-primary">
                  {f.title}
                </span>
                <span className="block text-xs text-muted leading-snug">
                  {f.subtitle}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function buildList(props: Props): Format[] {
  const out: Format[] = [];

  if (props.fileType === "LOTTIE") {
    out.push({
      icon: FileJson,
      title: "Lottie source (.json / .lottie)",
      subtitle: "Drops into lottie-web, dotLottie, React, After Effects",
    });
    if (props.hasLottieGif) {
      out.push({
        icon: ImagePlay,
        title: "GIF preview (.gif)",
        subtitle: "Fallback for email, slides, and chat clients",
      });
    }
    if (props.hasLottieMp4) {
      out.push({
        icon: Film,
        title: "MP4 render (.mp4)",
        subtitle: "For social, ads, and short-form video tools",
      });
    }
    out.push({
      icon: FileText,
      title: "LICENSE.txt",
      subtitle: "Per-buyer license with your purchase details",
    });
  } else if (props.fileType === "MODEL_3D") {
    out.push({
      icon: Box,
      title: "glTF Binary (.glb)",
      subtitle: "Web preview, Three.js, Babylon, Google Model Viewer",
    });
    if (props.hasModelFbx) {
      out.push({
        icon: Box,
        title: "FBX export (.fbx)",
        subtitle: "Unity, Unreal, Autodesk pipelines",
      });
    }
    if (props.hasModelObj) {
      out.push({
        icon: Box,
        title: "OBJ export (.obj)",
        subtitle: "Universal text format, no rig or animation",
      });
    }
    if (props.hasModelUsdz) {
      out.push({
        icon: Box,
        title: "USDZ export (.usdz)",
        subtitle: "Apple AR Quick Look, Vision Pro, iOS / iPadOS",
      });
    }
  }

  return out;
}
