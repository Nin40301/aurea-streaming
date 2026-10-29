import { _electron } from "@playwright/test";
const app = await _electron.launch({
  args: ["."],
  env: {
    ...process.env,
    AUREA_DATA_DIR: process.cwd() + "/../../work/v12-final",
  },
});
const p = await app.firstWindow();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
for (const [w, h] of [
  [1440, 900],
  [1920, 1080],
]) {
  await app.evaluate(
    ({ BrowserWindow }, s) =>
      BrowserWindow.getAllWindows()[0].setContentSize(...s),
    [w, h],
  );
  await p.screenshot({
    path: `screenshots/v12-profiles-${w}.png`,
    animations: "disabled",
  });
}
await p.getByRole("button", { name: /Meu cinema/ }).click();
await p.getByRole("button", { name: "Assistir agora", exact: true }).waitFor();
for (const [w, h] of [
  [1440, 900],
  [1920, 1080],
]) {
  await app.evaluate(
    ({ BrowserWindow }, s) =>
      BrowserWindow.getAllWindows()[0].setContentSize(...s),
    [w, h],
  );
  await p.screenshot({
    path: `screenshots/v12-final-${w}.png`,
    animations: "disabled",
  });
}
for (const [name, label] of [
  ["addons", "Add-ons"],
  ["settings", "Configurações"],
  ["library", "Minha Lista"],
  ["series", "Séries"],
]) {
  await p
    .getByRole("navigation", { name: "Explorar" })
    .getByRole("button", { name: label, exact: true })
    .click();
  await p.screenshot({
    path: `screenshots/v12-${name}.png`,
    animations: "disabled",
  });
}
await p
  .getByRole("button", { name: "Detalhes de Mundos da Blender", exact: true })
  .click();
await p.getByLabel("Temporada").waitFor();
await p.screenshot({
  path: "screenshots/v12-details.png",
  animations: "disabled",
});
console.log("RENDERER_ERRORS", errors);
await app.close();
