// Seed script — creates a default admin account, a "samples" creator user,
// and seeds the MOCK_ASSETS as real, downloadable Asset rows so the
// marketplace UI is clickable end-to-end out of the box.
//
// Run with:  npx prisma db seed
// Override creds with env vars: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { promises as fs } from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const ADMIN_EMAIL =
  process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim() || "admin@local.test";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin12345";

const SAMPLES_EMAIL = "samples@gamechanger.local";

// Kept in sync with lib/mock/assets.ts. If you edit one, edit the other.
const MOCK_ASSETS = [
  { id: "neon-icosahedron", title: "Neon Icosahedron", price: 2400, category: "3d-models", fileType: "MODEL_3D", tags: ["abstract","lowpoly","neon"], downloads: 1240, description: "A high-detail icosahedron with iridescent neon shading. Perfect for sci-fi UI accents, abstract scenes, and motion-design hero moments.", fileSize: 4404019 },
  { id: "twisted-knot", title: "Twisted Knot", price: 3200, category: "3d-models", fileType: "MODEL_3D", tags: ["geometric","abstract"], downloads: 892, description: "A stylized torus knot designed as a hero element for landing pages, intros, and motion design — clean topology and ready to import.", fileSize: 7130316 },
  { id: "soft-orb", title: "Soft Orb Material", price: 0, category: "materials", fileType: "MATERIAL", tags: ["pbr","soft"], downloads: 5340, description: "A soft PBR sphere material with subtle subsurface translucency. Ideal for skin, jelly, wax, and stylized character work.", fileSize: 1468006 },
  { id: "cube-lattice", title: "Cube Lattice Pack", price: 1800, category: "3d-models", fileType: "MODEL_3D", tags: ["architecture","modular"], downloads: 421, description: "A modular cube-lattice pack — snap pieces together to build procedural architecture and abstract environments without modeling.", fileSize: 11848909 },
  { id: "donut-ring", title: "Donut Ring", price: 1200, category: "3d-models", fileType: "MODEL_3D", tags: ["food","stylized"], downloads: 678, description: "A stylized donut model rigged for animation. Includes glaze and sprinkle variants as separate material slots.", fileSize: 3774873 },
  { id: "octahedron-set", title: "Crystal Octahedron Set", price: 2800, category: "3d-models", fileType: "MODEL_3D", tags: ["crystal","gem"], downloads: 1502, description: "A pack of six crystal octahedrons in low-poly and high-poly variants, each with full PBR materials and dispersion.", fileSize: 19084902 },
  { id: "studio-hdri-1", title: "Studio HDRI - Soft Light", price: 1500, category: "hdris", fileType: "HDRI", tags: ["studio","soft"], downloads: 980, description: "Soft three-point studio lighting captured in 8K. Neutral white background — ideal for product renders and clean shots.", fileSize: 91645132 },
  { id: "concrete-pbr", title: "Concrete PBR Pack", price: 0, category: "textures", fileType: "TEXTURE", tags: ["pbr","concrete","free"], downloads: 12400, description: "Eight seamless concrete textures with full PBR maps: albedo, normal, roughness, AO, and displacement at 4K.", fileSize: 148897792 },
  { id: "abstract-pattern", title: "Abstract Pattern Vector", price: 800, category: "2d-graphics", fileType: "IMAGE_2D", tags: ["vector","pattern"], downloads: 234, description: "A library of 100+ abstract pattern vectors. Editable strokes, scalable to any size, royalty-free for commercial use.", fileSize: 25690112 },
  { id: "iridescent-shader", title: "Iridescent Shader", price: 4200, category: "materials", fileType: "MATERIAL", tags: ["shader","iridescent"], downloads: 678, description: "A real-time iridescent shader with full PBR support. Includes GLSL source and a drop-in Three.js example.", fileSize: 419430 },
  { id: "gltf-loader-pro", title: "GLTF Loader Pro", price: 5400, category: "plugins", fileType: "PLUGIN", tags: ["loader","tool"], downloads: 312, description: "A drop-in GLTF loader plugin with progressive loading, KTX2 compression, and Draco support out of the box.", fileSize: 838860 },
  { id: "glass-cylinder", title: "Glass Cylinder Vase", price: 1600, category: "3d-models", fileType: "MODEL_3D", tags: ["glass","minimal"], downloads: 489, description: "A minimalist glass cylinder vase with refraction and dispersion. Ideal for product mockups and editorial shots.", fileSize: 2202009 },
  { id: "low-poly-tree", title: "Low Poly Tree", price: 0, category: "3d-models", fileType: "MODEL_3D", tags: ["nature","lowpoly","free"], downloads: 8934, description: "Five low-poly tree variants with stylized canopies. Free for personal and commercial use, no attribution required.", fileSize: 1782579 },
  { id: "outdoor-hdri", title: "Outdoor Sunset HDRI", price: 2200, category: "hdris", fileType: "HDRI", tags: ["outdoor","sunset"], downloads: 1840, description: "A golden-hour sunset captured at 12K. Strong directional sun with warm ambient skylight for cinematic shots.", fileSize: 130023424 },
  { id: "metal-textures", title: "Metal Textures Vol. 2", price: 1900, category: "textures", fileType: "TEXTURE", tags: ["metal","pbr"], downloads: 1230, description: "Sixteen metal textures with full PBR maps. Includes brushed, polished, oxidized, and worn variants at 4K.", fileSize: 192937984 },
  { id: "geometric-icons", title: "Geometric Icon Set", price: 1400, category: "2d-graphics", fileType: "IMAGE_2D", tags: ["icons","geometric"], downloads: 567, description: "A set of 240 geometric icons in vector format. Outline and filled variants across 24 categories.", fileSize: 12897484 },
  { id: "cloth-material", title: "Cloth Material Bundle", price: 2900, category: "materials", fileType: "MATERIAL", tags: ["cloth","fabric"], downloads: 745, description: "A bundle of eight cloth materials — linen, silk, wool, denim — with PBR and microfiber detail maps.", fileSize: 40475852 },
  { id: "blender-addon", title: "BlendKit Pro Addon", price: 7800, category: "plugins", fileType: "PLUGIN", tags: ["blender","tool"], downloads: 421, description: "A pro Blender addon for streamlined PBR workflows: bulk import, smart materials, and render presets.", fileSize: 2516582 },
];

const PLACEHOLDER_REL = "placeholders/sample.txt";
const PLACEHOLDER_BODY = `GameChanger sample asset
=========================

This is a placeholder file shipped with the seeded marketplace samples.

Each sample asset on the marketplace shares this same placeholder so you can
test the full purchase + download flow end-to-end. Real assets uploaded by
creators get their own files and previews.

To replace this with a real asset of your own, sign in and visit
/dashboard/uploads/new.
`;

async function ensurePlaceholderFile() {
  const dir = path.join(process.cwd(), "private-uploads", "placeholders");
  await fs.mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, "sample.txt");
  await fs.writeFile(fullPath, PLACEHOLDER_BODY, "utf8");
  const stat = await fs.stat(fullPath);
  return { key: PLACEHOLDER_REL, size: stat.size };
}

async function ensureAdmin() {
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true, role: true },
  });

  if (existing) {
    if (existing.role !== "ADMIN") {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "ADMIN" },
      });
      console.log(`✓ Promoted existing user to ADMIN`);
    } else {
      console.log(`✓ Admin already exists`);
    }
    return existing;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const created = await prisma.user.create({
    data: {
      name: "Admin",
      email: ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
    },
    select: { id: true, role: true },
  });

  console.log(`✓ Admin account created`);
  return created;
}

async function ensureSamplesCreator() {
  return prisma.user.upsert({
    where: { email: SAMPLES_EMAIL },
    create: {
      name: "Sample Creators",
      email: SAMPLES_EMAIL,
      role: "CREATOR",
      // No passwordHash — nobody should sign in as this account
    },
    update: {},
    select: { id: true, name: true },
  });
}

async function ensureSampleAssets(uploaderId, placeholder) {
  let created = 0;
  let updated = 0;
  for (const m of MOCK_ASSETS) {
    const result = await prisma.asset.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        title: m.title,
        description: m.description,
        category: m.category,
        tags: m.tags,
        fileType: m.fileType,
        price: m.price,
        previewKey: "", // empty — UI falls back to 3D AssetViewer for sample assets
        fileKey: placeholder.key,
        fileSizeBytes: m.fileSize, // use mock's display size for UI consistency
        downloads: m.downloads,
        status: "APPROVED",
        uploaderId,
      },
      update: {
        // Refresh fields that may have drifted, but DON'T reset downloads
        title: m.title,
        description: m.description,
        category: m.category,
        tags: m.tags,
        fileType: m.fileType,
        price: m.price,
        fileKey: placeholder.key,
        status: "APPROVED",
      },
      select: { id: true, createdAt: true, updatedAt: true },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      updated++;
    }
  }
  return { created, updated };
}

async function main() {
  console.log("");
  const admin = await ensureAdmin();
  const samples = await ensureSamplesCreator();
  const placeholder = await ensurePlaceholderFile();
  const { created, updated } = await ensureSampleAssets(samples.id, placeholder);

  const isNewAdmin = admin.role === "ADMIN";

  console.log("");
  console.log("─────────────────────────────────────────────────────");
  console.log("Sample assets:");
  console.log(
    `  ${created} created · ${updated} updated · placeholder file: ${placeholder.size} bytes`
  );
  console.log("");
  console.log("Admin sign-in:");
  console.log(`  URL:      http://localhost:3000/admin/login`);
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  if (isNewAdmin) {
    console.log(`  Password: ${ADMIN_PASSWORD}  (change after first login)`);
  } else {
    console.log(
      `  Password: (the password you originally registered with — not changed by seed)`
    );
  }
  console.log("─────────────────────────────────────────────────────");
  console.log("");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
