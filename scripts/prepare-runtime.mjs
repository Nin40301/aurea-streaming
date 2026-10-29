import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const electron = dirname(require.resolve("electron/package.json"));
if (!existsSync(join(electron, "path.txt")))
  execFileSync(process.execPath, [join(electron, "install.js")], {
    stdio: "inherit",
    cwd: electron,
  });
if (process.platform === "win32") {
  const installer = dirname(
    require.resolve("electron-winstaller/package.json"),
  );
  if (!existsSync(join(installer, "vendor", "7z.exe")))
    execFileSync(
      process.execPath,
      [join(installer, "script", "select-7z-arch.js")],
      { stdio: "inherit", cwd: installer },
    );
}
console.log("Runtime Electron e ferramentas de empacotamento preparados.");
