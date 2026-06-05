import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

async function copyDirRecursive(srcDir, destDir) {
  await fsp.mkdir(destDir, { recursive: true });
  const entries = await fsp.readdir(srcDir, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        await copyDirRecursive(srcPath, destPath);
        return;
      }

      if (entry.isFile()) {
        await fsp.copyFile(srcPath, destPath);
        return;
      }

      // Ignore symlinks/special files.
    }),
  );
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-root-assets",
      apply: "build",
      async closeBundle() {
        // Ensure any direct URL references like /assets/... work in production builds.
        const rootAssetsDir = path.resolve(process.cwd(), "assets");
        const outAssetsDir = path.resolve(process.cwd(), "dist", "assets");

        if (!fs.existsSync(rootAssetsDir)) {
          // Nothing to copy.
          return;
        }

        // Replace dist/assets with fresh copy.
        await fsp.rm(outAssetsDir, { recursive: true, force: true });
        await copyDirRecursive(rootAssetsDir, outAssetsDir);
      },
    },
  ],
  base: "/street-buster/",
});

