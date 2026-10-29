import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
const packages = [
  "react",
  "react-dom",
  "scheduler",
  "hls.js",
  "zod",
  "lucide-react",
  "electron-squirrel-startup",
  "debug",
  "ms",
];
mkdirSync("assets/licenses", { recursive: true });
for (const pkg of packages) {
  const root = path.join("node_modules", pkg);
  const source = ["LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING"]
    .map((name) => path.join(root, name))
    .find(existsSync);
  if (!source) throw Error("Licença não encontrada: " + pkg);
  writeFileSync(
    path.join("assets/licenses", pkg + ".txt"),
    readFileSync(source),
  );
}
for (const file of ["THIRD_PARTY_NOTICES.md", "LICENSE"])
  writeFileSync(path.join("assets", file), readFileSync(file));
console.log("Licenças dos bundles incluídas.");
