import { _electron } from "@playwright/test";
const app = await _electron.launch({
  args: ["."],
  env: {
    ...process.env,
    AUREA_DATA_DIR: process.cwd() + "/../../work/v12-proposals",
  },
});
const page = await app.firstWindow();
await page.getByRole("button", { name: /Meu cinema/ }).click();
await page
  .getByRole("button", { name: "Assistir agora", exact: true })
  .waitFor();
for (const v of ["cinema", "editorial", "nextgen"]) {
  await page.evaluate((v) => {
    localStorage.setItem("aurea-preview", v);
  }, v);
  await page.reload();
  await page.getByRole("button", { name: /Meu cinema/ }).click();
  for (const [w, h] of [
    [1440, 900],
    [1920, 1080],
  ]) {
    await app.evaluate(
      ({ BrowserWindow }, s) =>
        BrowserWindow.getAllWindows()[0].setContentSize(...s),
      [w, h],
    );
    await page.screenshot({
      path: `screenshots/v20-proposal-${v}-${w}.png`,
      animations: "disabled",
    });
  }
}
await app.close();
