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
  hasModelBlend?: boolean;
  hasModelPng?: boolean;
}

interface Format {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  /** False when the creator chose not to ship this companion format.
   *  Renders as a dimmed row with a "Not included" badge so the buyer
   *  sees the full catalogue for this asset type and instantly knows
   *  which subset is part of *this* listing. */
  available: boolean;
}

/**
 * "What's included" card — lists every file the buyer receives when
 * they purchase or claim the asset. Surfaces BEFORE the buy click so
 * buyers see the full bundle (3D primary + alternate engine formats,
 * or Lottie source + GIF + MP4 + LICENSE) without having to dig.
 *
 * Multi-format asset types (LOTTIE, MODEL_3D) always render the full
 * format catalogue — companions the creator didn't upload appear with
 * a "Not included" badge so the buyer can compare what's part of this
 * particular listing vs. what the creator chose to leave out.
 *
 * Single-file asset types (SVG icon, etc.) get no card — they already
 * have one obvious thing to download.
 */
export function IncludedFormats({
  fileType,
  hasLottieGif = false,
  hasLottieMp4 = false,
  hasModelFbx = false,
  hasModelObj = false,
  hasModelUsdz = false,
  hasModelBlend = false,
  hasModelPng = false,
}: Props) {
  const formats = buildList({
    fileType,
    hasLottieGif,
    hasLottieMp4,
    hasModelFbx,
    hasModelObj,
    hasModelUsdz,
    hasModelBlend,
    hasModelPng,
  });

  if (formats.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h3 className="text-sm font-semibold mb-3 inline-flex items-center gap-2 text-primary">
        <Package className="w-4 h-4" />
        What&apos;s included
      </h3>
      <ul className="space-y-2.5">
        {formats.map((f) => {
          const Icon = f.icon;
          const dim = !f.available;
          return (
            <li
              key={f.title}
              className="flex items-start gap-3"
            >
              <span
                className={
                  dim
                    ? "w-8 h-8 rounded-lg bg-elevated/40 border border-border/60 text-muted flex items-center justify-center shrink-0 mt-0.5"
                    : "w-8 h-8 rounded-lg bg-elevated border border-border text-accent-light flex items-center justify-center shrink-0 mt-0.5"
                }
              >
                <Icon className="w-4 h-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={
                    dim
                      ? "flex items-center gap-1.5 text-sm font-medium text-secondary"
                      : "flex items-center gap-1.5 text-sm font-medium text-primary"
                  }
                >
                  {f.title}
                  {dim && (
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-muted bg-elevated/60 border border-border rounded px-1 py-0.5">
                      Not included
                    </span>
                  )}
                </span>
                <span
                  className={
                    dim
                      ? "block text-xs text-muted/70 leading-snug"
                      : "block text-xs text-muted leading-snug"
                  }
                >
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
      available: true,
    });
    out.push({
      icon: ImagePlay,
      title: "GIF preview (.gif)",
      subtitle: props.hasLottieGif
        ? "Fallback for email, slides, and chat clients"
        : "The creator didn't ship a GIF render with this asset",
      available: !!props.hasLottieGif,
    });
    out.push({
      icon: Film,
      title: "MP4 render (.mp4)",
      subtitle: props.hasLottieMp4
        ? "For social, ads, and short-form video tools"
        : "The creator didn't ship an MP4 render with this asset",
      available: !!props.hasLottieMp4,
    });
    out.push({
      icon: FileText,
      title: "LICENSE.txt",
      subtitle: "Per-buyer license with your purchase details",
      available: true,
    });
  } else if (props.fileType === "MODEL_3D") {
    out.push({
      icon: Box,
      title: "glTF Binary (.glb)",
      subtitle: "Web preview, Three.js, Babylon, Google Model Viewer",
      available: true,
    });
    out.push({
      icon: Box,
      title: "FBX export (.fbx)",
      subtitle: props.hasModelFbx
        ? "Unity, Unreal, Autodesk pipelines"
        : "The creator didn't ship an FBX export with this asset",
      available: !!props.hasModelFbx,
    });
    out.push({
      icon: Box,
      title: "OBJ export (.obj)",
      subtitle: props.hasModelObj
        ? "Universal text format, no rig or animation"
        : "The creator didn't ship an OBJ export with this asset",
      available: !!props.hasModelObj,
    });
    out.push({
      icon: Box,
      title: "USDZ export (.usdz)",
      subtitle: props.hasModelUsdz
        ? "Apple AR Quick Look, Vision Pro, iOS / iPadOS"
        : "The creator didn't ship a USDZ export with this asset",
      available: !!props.hasModelUsdz,
    });
    out.push({
      icon: Box,
      title: "Blender source (.blend)",
      subtitle: props.hasModelBlend
        ? "Edit, re-light, and re-export from Blender"
        : "The creator didn't ship a Blender source file with this asset",
      available: !!props.hasModelBlend,
    });
    out.push({
      icon: Box,
      title: "PNG render (.png)",
      subtitle: props.hasModelPng
        ? "Flat 2D fallback for slides, docs, and email"
        : "The creator didn't ship a PNG render with this asset",
      available: !!props.hasModelPng,
    });
  }

  return out;
}
