import { _electron } from "@playwright/test";
(async () => {
  const app = await _electron.launch({
    args: ["."],
    env: {
      ...process.env,
      AUREA_DATA_DIR: process.cwd() + "/../../work/redesign-qa",
    },
  });
  const p = await app.firstWindow();
  await p.getByRole("button", { name: /Meu cinema/ }).click();
  await p
    .getByRole("button", { name: "Assistir agora", exact: true })
    .waitFor();
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
      path: `screenshots/redesign-${process.env.CYCLE}-${w}.png`,
      animations: "disabled",
    });
  }
  await app.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
