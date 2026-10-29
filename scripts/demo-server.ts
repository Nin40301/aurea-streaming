import { startDemo } from "../src/main/demo.ts";
import { fileURLToPath } from "node:url";
const demo = await startDemo(
  fileURLToPath(new URL("../assets", import.meta.url)),
  17461,
);
console.log("Add-on demonstrativo: " + demo.manifestUrl);
