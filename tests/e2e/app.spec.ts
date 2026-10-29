import {
  test,
  expect,
  _electron,
  type ElectronApplication,
  type Page,
} from "@playwright/test";
import { mkdtempSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
let app: ElectronApplication;
let page: Page;
let data: string;
const errors: string[] = [];
async function launch() {
  app = await _electron.launch({
    ...(process.env.AUREA_EXECUTABLE
      ? { executablePath: process.env.AUREA_EXECUTABLE, args: [] }
      : { args: ["."] }),
    env: { ...process.env, AUREA_DATA_DIR: data },
  });
  page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(page.getByText("Quem vai descobrir")).toBeVisible();
}
async function home() {
  await page.getByRole("button", { name: /Meu cinema/ }).click();
  await expect(
    page.getByRole("button", { name: "Assistir agora", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "Detalhes de Sintel", exact: true })
      .first(),
  ).toBeVisible();
}
async function chooseSource(name = "MP4") {
  await page
    .getByRole("button", { name: "Assistir agora", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Selecionar fonte" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: new RegExp(name + " · local") })
    .click();
  await page.waitForFunction(() => {
    const v = document.querySelector("video");
    return !!v && v.currentTime > 1 && v.videoWidth > 0;
  });
  const initial = await page
    .locator("video")
    .evaluate((v: HTMLVideoElement) => v.currentTime);
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
    )
    .toBeGreaterThan(initial + 0.35);
  expect(
    await page
      .locator("video")
      .evaluate(
        (v: HTMLVideoElement) => v.getVideoPlaybackQuality().totalVideoFrames,
      ),
  ).toBeGreaterThan(0);
}
test.beforeEach(async () => {
  data = mkdtempSync(path.join(process.cwd(), "../../work/e2e-"));
  errors.length = 0;
  mkdirSync("screenshots", { recursive: true });
  await launch();
});
test.afterEach(async () => {
  if (app) await app.close();
  expect(errors).toEqual([]);
});
test("navegação, pesquisa, gêneros, séries/episódios, lista, favoritos e perfis", async () => {
  await page.screenshot({
    animations: "disabled",
    path: "screenshots/profiles.png",
  });
  await home();
  await page.screenshot({
    animations: "disabled",
    path: "screenshots/home.png",
  });
  const prefs = await app.evaluate(({ BrowserWindow }) =>
    (
      BrowserWindow.getAllWindows()[0].webContents as unknown as {
        getLastWebPreferences: () => {
          nodeIntegration: boolean;
          contextIsolation: boolean;
          sandbox: boolean;
        };
      }
    ).getLastWebPreferences(),
  );
  expect(prefs.nodeIntegration).toBe(false);
  expect(prefs.contextIsolation).toBe(true);
  expect(prefs.sandbox).toBe(true);
  expect(
    await page.evaluate(
      () => typeof (window as unknown as { require?: unknown }).require,
    ),
  ).toBe("undefined");
  await page
    .getByRole("button", { name: "Adicionar à lista: Sintel", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Detalhes de Sintel", exact: true })
    .click();
  await page.getByRole("button", { name: "Favoritar título" }).click();
  await page
    .getByRole("button", { name: "Minha Lista", exact: true })
    .first()
    .click();
  await expect(
    page
      .getByRole("button", { name: "Detalhes de Sintel", exact: true })
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: /Favoritos/ }).click();
  await expect(
    page
      .getByRole("button", { name: "Detalhes de Sintel", exact: true })
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Séries", exact: true }).click();
  await page
    .getByRole("button", { name: "Detalhes de Mundos da Blender", exact: true })
    .click();
  await expect(page.getByLabel("Temporada")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /2 Big Buck Bunny/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /2 Big Buck Bunny/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Selecionar fonte" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fechar fontes" }).click();
  await page.getByRole("button", { name: "Filmes", exact: true }).click();
  await page.getByLabel("Filtrar por gênero").selectOption("Fantasia");
  await expect(
    page
      .getByRole("button", { name: "Detalhes de Sintel", exact: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Detalhes de Big Buck Bunny",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Início", exact: true }).click();
  await page.getByLabel("Buscar títulos").fill("nada encontrado 123");
  await expect(
    page.getByText("Nenhuma história encontrada", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Buscar títulos").fill("Sintel");
  await expect(
    page
      .getByRole("button", { name: "Detalhes de Sintel", exact: true })
      .first(),
  ).toBeVisible();
  await page.getByLabel("Buscar títulos").fill("");
  await page.getByRole("button", { name: "Trocar perfil" }).click();
  await page.getByRole("button", { name: "Novo perfil", exact: true }).click();
  await page.getByLabel("Nome do perfil").fill("Visitante");
  await page.getByRole("button", { name: "Criar perfil", exact: true }).click();
  await page.getByRole("button", { name: "Concluir", exact: true }).click();
  await page.getByRole("button", { name: "Visitante", exact: true }).click();
  await page
    .getByRole("button", { name: "Minha Lista", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("Uma boa história ainda vai chegar", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Trocar perfil" }).click();
  await page.getByRole("button", { name: /Meu cinema/ }).click();
  await page
    .getByRole("button", { name: "Minha Lista", exact: true })
    .first()
    .click();
  await expect(
    page
      .getByRole("button", { name: "Detalhes de Sintel", exact: true })
      .first(),
  ).toBeVisible();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(900, 700),
  );
  await page.screenshot({
    animations: "disabled",
    path: "screenshots/library-small.png",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("MP4/HLS reais, pausa, seek, volume, velocidade, legendas, tela cheia e retomada", async () => {
  await home();
  await chooseSource();
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.paused),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Avançar 10 segundos", exact: true })
    .click();
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
    )
    .toBeGreaterThan(10);
  await page.getByLabel("Velocidade", { exact: true }).selectOption("1.5");
  expect(
    await page
      .locator("video")
      .evaluate((v: HTMLVideoElement) => v.playbackRate),
  ).toBe(1.5);
  await page.getByLabel("Volume", { exact: true }).fill("0.3");
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.volume),
  ).toBeCloseTo(0.3);
  await page.getByLabel("Legendas", { exact: true }).selectOption({ index: 1 });
  await page.waitForFunction(() => {
    const v = document.querySelector("video");
    return (
      v?.textTracks[0]?.mode === "showing" && !!v.textTracks[0].cues?.length
    );
  });
  await page.getByRole("button", { name: "Tela cheia", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.getByRole("button", { name: "Tela cheia", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false);
  await page.getByRole("button", { name: "Reproduzir", exact: true }).click();
  await page.screenshot({
    animations: "disabled",
    path: "screenshots/player.png",
  });
  await page
    .getByRole("button", { name: "Fechar player", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Assistir agora", exact: true }),
  ).toBeVisible();
  await chooseSource("HLS");
  expect(
    await page
      .locator("video")
      .evaluate((v: HTMLVideoElement) => v.currentTime),
  ).toBeGreaterThan(10);
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  const before = await page
    .locator("video")
    .evaluate((v: HTMLVideoElement) => v.currentTime);
  await page
    .getByRole("button", { name: "Voltar 10 segundos", exact: true })
    .click();
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
    )
    .toBeLessThan(before - 8);
  await page
    .getByRole("button", { name: "Fechar player", exact: true })
    .click();
  await app.close();
  await launch();
  await home();
  await expect(
    page.getByRole("heading", { name: /A história continua/ }),
  ).toBeVisible();
  await chooseSource("MP4");
  expect(
    await page
      .locator("video")
      .evaluate((v: HTMLVideoElement) => v.currentTime),
  ).toBeGreaterThan(1);
  await page
    .getByRole("button", { name: "Fechar player", exact: true })
    .click();
});
test("gerencia add-on real, erro de URL, estado vazio, cache e preferências persistidas", async () => {
  await home();
  await page.getByRole("button", { name: "Add-ons", exact: true }).click();
  await page
    .getByLabel("Instalar por URL do manifest")
    .fill("file:///manifest.json");
  await page
    .getByRole("button", { name: "Instalar add-on", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("HTTPS");
  await page.getByLabel("Habilitar Cinema aberto · Aurea").uncheck();
  await page.getByRole("button", { name: "Início", exact: true }).click();
  await expect(
    page.getByText("Nenhum título disponível", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add-ons", exact: true }).click();
  await page
    .getByRole("button", { name: "Remover Cinema aberto · Aurea", exact: true })
    .click();
  await expect(
    page.getByText("Seu próximo catálogo está a uma conexão", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Usar URL do add-on incluído/ })
    .click();
  await page
    .getByRole("button", { name: "Instalar add-on", exact: true })
    .click();
  await expect(
    page.getByLabel("Habilitar Cinema aberto · Aurea"),
  ).toBeChecked();
  await page.screenshot({
    animations: "disabled",
    path: "screenshots/addons.png",
  });
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page.getByLabel("Reduzir movimento").check();
  await page.getByLabel("Reprodução automática").uncheck();
  await page
    .getByRole("button", { name: "Limpar cache de consultas", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Cache");
  await app.close();
  await launch();
  await home();
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await expect(page.getByLabel("Reduzir movimento")).toBeChecked();
  await expect(page.getByLabel("Reprodução automática")).not.toBeChecked();
});
test("player por teclado, próximo episódio e retomada independente", async () => {
  await home();
  await page.getByRole("button", { name: "Séries", exact: true }).click();
  await page
    .getByRole("button", { name: "Detalhes de Mundos da Blender", exact: true })
    .click();
  await page.getByRole("button", { name: /1 Sintel/ }).click();
  await page.getByRole("button", { name: /MP4 · local/ }).click();
  await page.waitForFunction(
    () => (document.querySelector("video")?.currentTime ?? 0) > 1,
  );
  const player = page.getByRole("dialog", { name: "Player de vídeo" });
  await player.focus();
  await page.keyboard.press("Space");
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.paused),
    )
    .toBe(true);
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
    )
    .toBeGreaterThan(10);
  await page.keyboard.press("m");
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.muted),
  ).toBe(true);
  await page.keyboard.press("m");
  await page.keyboard.press("Space");
  await page
    .getByRole("button", { name: "Próximo episódio", exact: true })
    .click();
  await expect(page.locator(".player-top")).toContainText(
    "Big Buck Bunny · A floresta",
  );
  await page.waitForFunction(
    () => (document.querySelector("video")?.currentTime ?? 0) > 1,
  );
  await page
    .getByRole("button", { name: "Fechar player", exact: true })
    .click();
  await page.getByRole("button", { name: /1 Sintel/ }).click();
  await page.getByRole("button", { name: /MP4 · local/ }).click();
  await page.waitForFunction(
    () => (document.querySelector("video")?.currentTime ?? 0) > 10,
  );
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  const duration = await page
    .locator("video")
    .evaluate((v: HTMLVideoElement) => v.duration);
  await page
    .getByLabel("Posição", { exact: true })
    .fill((duration - 0.7).toFixed(1));
  await page.getByRole("button", { name: "Reproduzir", exact: true }).click();
  await expect(page.locator(".player-top")).toContainText(
    "Big Buck Bunny · A floresta",
  );
  await page
    .getByRole("button", { name: "Fechar player", exact: true })
    .click();
});
test("agrega segunda fonte HTTP e apresenta falha de reprodução sem perder a navegação", async () => {
  let base = "";
  const fixture = {
    id: "fixture:unavailable",
    type: "movie",
    name: "Teste de indisponibilidade",
    description: "Mídia deliberadamente ausente para validar recuperação.",
    genres: ["Diagnóstico"],
  };
  const server = createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/manifest.json") {
      res.end(
        JSON.stringify({
          id: "org.aurea.test",
          name: "Fonte de teste local",
          description: "Fixture de teste",
          version: "1.0.0",
          types: ["movie"],
          resources: ["catalog", "meta", "stream", "subtitles"],
          catalogs: [{ id: "test", type: "movie", name: "Diagnósticos" }],
        }),
      );
    } else if (req.url?.startsWith("/catalog/"))
      res.end(JSON.stringify({ metas: [fixture] }));
    else if (req.url?.startsWith("/meta/"))
      res.end(JSON.stringify({ meta: fixture }));
    else if (req.url?.startsWith("/stream/"))
      res.end(
        JSON.stringify({
          streams: [{ name: "Falha esperada", url: base + "/missing.mp4" }],
        }),
      );
    else if (req.url?.startsWith("/subtitles/"))
      res.end(JSON.stringify({ subtitles: [] }));
    else res.writeHead(404).end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = "http://127.0.0.1:" + (server.address() as AddressInfo).port;
  try {
    await home();
    await page.getByRole("button", { name: "Add-ons", exact: true }).click();
    await page
      .getByLabel("Instalar por URL do manifest")
      .fill(base + "/manifest.json");
    await page
      .getByRole("button", { name: "Instalar add-on", exact: true })
      .click();
    await expect(
      page.getByText("Fonte de teste local", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Habilitar Cinema aberto · Aurea").uncheck();
    await page.getByRole("button", { name: "Início", exact: true }).click();
    await expect(
      page.getByText("AUREA / CURADORIA ABERTA", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("BLENDER FOUNDATION", { exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Add-ons", exact: true }).click();
    await page.getByLabel("Habilitar Cinema aberto · Aurea").check();
    await page.getByRole("button", { name: "Filmes", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Detalhes de Sintel", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Detalhes de Teste de indisponibilidade",
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: "Assistir", exact: true }).click();
    await page.getByRole("button", { name: /Falha esperada/ }).click();
    await expect(page.getByRole("alert")).toContainText(
      "Esta fonte não está disponível",
    );
    await page.screenshot({
      animations: "disabled",
      path: "screenshots/player-error.png",
    });
    await page
      .getByRole("button", { name: "Voltar aos detalhes", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Teste de indisponibilidade",
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
