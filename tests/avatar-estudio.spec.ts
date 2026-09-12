import { expect, test, type Page } from "@playwright/test";

const email = process.env.GX_TEST_EMAIL ?? "";
const password = process.env.GX_TEST_PASSWORD ?? "";

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: /Entrar no escrit/i }).click();
  await expect(page.locator(".map-person.is-me")).toBeVisible();
}

async function openStudio(page: Page) {
  await page.getByRole("button", { name: /Personalizar avatar/i }).first().click();
  // "Estúdio" tem sete letras: Est + ú + dio. O padrão antigo (/Est.di …)
  // casava apenas "Estúdi" e nunca encontrava o diálogo.
  await expect(page.getByRole("dialog", { name: /Est.dio do avatar/i })).toBeVisible();
}

test.describe("Estúdio do avatar", () => {
  test.skip(!email || !password, "defina GX_TEST_EMAIL e GX_TEST_PASSWORD (e GX_TEST_BASE_URL fora de localhost:3000)");

  test("o sprite aparece no mapa e no diretório com as camadas do gerador", async ({ page }) => {
    await signIn(page);
    expect(await page.locator(".map-person.is-me svg.pixel-avatar-svg rect").count()).toBeGreaterThan(20);
    await page.getByRole("button", { name: /^Equipe/ }).first().click();
    // Quem tem foto de perfil (ex.: conta administradora) mostra a foto no cartão;
    // o sprite pixel aparece para quem não tem foto — ambos são avatares válidos.
    await expect(page.locator(".team-card .avatar").first()).toBeVisible();
    await expect(page.locator(".team-card .avatar svg.pixel-avatar-svg, .team-card .avatar img").first()).toBeVisible();
  });

  test("escolhas novas sobrevivem a um reload (persistido em avatar_look)", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
    await signIn(page);
    await openStudio(page);

    await page.getByRole("tab", { name: "Cabelo" }).click();
    await page.getByRole("button", { name: "Moicano", exact: true }).click();
    await page.getByRole("button", { name: "Ruivo", exact: true }).click();
    await page.getByRole("tab", { name: "Roupa" }).click();
    await page.getByRole("button", { name: "Moletom", exact: true }).click();
    await page.getByRole("tab", { name: "Detalhes" }).click();
    await page.getByRole("button", { name: "Óculos de sol", exact: true }).click();
    await page.getByRole("button", { name: "Fone de trabalho", exact: true }).click();
    // Lê o estado atual da aura e alterna: o teste precisa passar mesmo se a
    // conta já tiver aura ativada (ex.: execução repetida contra a mesma base).
    const auraBefore = await page.getByRole("button", { name: /Aura dourada/i }).getAttribute("aria-pressed");
    await page.getByRole("button", { name: /Aura dourada/i }).click();

    await page.getByRole("button", { name: /Salvar meu avatar/i }).click();
    await expect(page.getByText(/Seu avatar foi atualizado/i)).toBeVisible();

    await page.reload();
    await expect(page.locator(".map-person.is-me")).toBeVisible();
    await openStudio(page);
    await page.getByRole("tab", { name: "Cabelo" }).click();
    await expect(page.getByRole("button", { name: "Moicano", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Ruivo", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("tab", { name: "Detalhes" }).click();
    await expect(page.getByRole("button", { name: /Aura dourada/i })).toHaveAttribute("aria-pressed", auraBefore === "true" ? "false" : "true");
    await expect(page.getByRole("button", { name: "Fone de trabalho", exact: true })).toHaveAttribute("aria-pressed", "true");

    // Ruído esperado: favicon/DevTools, a checagem de sessão pré-login (401 por
    // design) e falhas de rede em imagens externas (foto de perfil de cada
    // pessoa, ex.: Unsplash bloqueado em redes restritas). Qualquer outro erro
    // de console — inclusive React — derruba o teste.
    const ruido = /favicon|DevTools|net::ERR_CONNECTION_CLOSED|status of 401 \(Unauthorized\)/i;
    expect(errors.filter(line => !ruido.test(line))).toEqual([]);
  });

  test("predefinições trocam a prévia sem quebrar o sprite", async ({ page }) => {
    await signIn(page);
    await openStudio(page);
    // O palco mostra frente e costas: dois SVGs. Comparar sempre o primeiro.
    const before = await page.locator(".avatar-stage svg").first().innerHTML();
    await page.getByRole("button", { name: "Tech & atendimento", exact: true }).click();
    await expect.poll(async () => (await page.locator(".avatar-stage svg").first().innerHTML()) !== before).toBe(true);
  });
});
