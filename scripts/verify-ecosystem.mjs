import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const base = process.env.GX_TEST_BASE_URL || process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const email = process.env.GX_TEST_EMAIL ?? '';
const password = process.env.GX_TEST_PASSWORD ?? '';
if (!email || !password) {
  console.error('Defina GX_TEST_EMAIL e GX_TEST_PASSWORD (use .env.example como modelo).');
  process.exit(1);
}
mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const errors = [];

try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(base, { waitUntil: 'networkidle' });
  // Login como Henrique com email e senha
  await page.getByRole('heading', { name: 'Seu escritório, sem fronteiras.' }).waitFor({ timeout: 15000 });
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar no escritório', exact: true }).click();
  await page.getByText('Conexão estável', { exact: true }).waitFor({ timeout: 15000 });

  // 3 cards do ecossistema
  const cards = page.locator('.ecosystem-card');
  assert.equal(await cards.count(), 3, '3 cards no ecossistema');

  const expected = [
    { name: 'Senna Cell X', href: 'https://sennacellxuy.lovable.app', instagram: 'https://www.instagram.com/sennacellx.uy/', desc: 'Tecnologia, assistência técnica e soluções para dispositivos.' },
    { name: 'Grupo Reis X', href: 'https://www.instagram.com/gruporeisx/', instagram: null, desc: 'Negócios, oportunidades e soluções.' },
    { name: 'Primeiro Passo X', href: 'https://www.instagram.com/primeiropassox/', instagram: null, desc: 'Conexões, oportunidades e orientação profissional.' },
  ];
  for (let i = 0; i < 3; i++) {
    const card = cards.nth(i);
    const main = card.locator('.ecosystem-card-main');
    const official = card.locator('.ecosystem-tab-link');
    assert.equal(await main.getAttribute('aria-label'), `Abrir detalhes de ${expected[i].name}`, `card ${i} aba`);
    assert.equal(await official.getAttribute('href'), expected[i].href, `card ${i} link oficial`);
    assert.equal(await official.getAttribute('target'), '_blank', `card ${i} target`);
    assert.equal(await official.getAttribute('rel'), 'noopener noreferrer', `card ${i} rel`);
    assert.ok((await main.innerText()).includes(expected[i].name), `card ${i} nome`);
    assert.ok(!(await card.innerText()).includes('http'), `card ${i} sem URL visivel`);
    assert.equal(await card.locator('.ecosystem-logo').count(), 1, `card ${i} logo box`);
    const box = await main.boundingBox();
    assert.ok(box.height >= 34, `card ${i} altura compacta confortável (${box.height}px)`);
  }
  console.log('PASS: sidebar — 3 abas compactas, links oficiais, nomes e logos');

  // Hover: elevação + sombra dourada
  const first = cards.nth(0);
  const before = await first.evaluate((el) => getComputedStyle(el).boxShadow);
  await first.hover();
  await page.waitForTimeout(350);
  const after = await first.evaluate((el) => getComputedStyle(el).boxShadow);
  assert.notEqual(before, after, 'hover altera sombra do card');
  assert.ok(after.includes('199, 166, 110'), `brilho dourado no hover (${after.slice(0, 80)}…)`);
  console.log('PASS: hover com elevação e sombra dourada discreta');

  // Modal "Explorar ecossistema" com logos + botões Website/Instagram
  await page.getByRole('button', { name: /Explorar ecossistema/ }).click();
  const modal = page.getByRole('dialog');
  await modal.getByText('Empresas diferentes. Uma só visão.').waitFor();
  const sennaWeb = modal.getByRole('link', { name: 'Abrir site da Senna Cell X em nova aba' });
  assert.equal(await sennaWeb.getAttribute('href'), 'https://sennacellxuy.lovable.app');
  assert.equal(await modal.getByRole('link', { name: 'Abrir canal oficial de Grupo Reis X em nova aba' }).getAttribute('href'), 'https://www.instagram.com/gruporeisx/');
  assert.equal(await modal.getByRole('link', { name: 'Abrir canal oficial de Primeiro Passo X em nova aba' }).getAttribute('href'), 'https://www.instagram.com/primeiropassox/');
  assert.equal(await modal.locator('.ecosystem-logo').count(), 3, 'logos no modal');
  await modal.screenshot({ path: 'artifacts/gx-ecosystem-modal.png' });
  await page.getByRole('button', { name: 'Fechar janela', exact: true }).click();
  console.log('PASS: modal ecossistema — logos + links Website/Instagram');

  await page.locator('.ecosystem-nav').screenshot({ path: 'artifacts/gx-ecosystem-sidebar.png' });

  // Mobile: sem overflow, cards legíveis e tocáveis
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await page.locator('.ecosystem-card').first().waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, 'sem overflow mobile');
  const mBox = await page.locator('.ecosystem-card-main').first().boundingBox();
  const mCard = await page.locator('.ecosystem-card').first().boundingBox();
  assert.ok(mBox.height >= 38 && mCard.width > 170, `toque confortável mobile (${mCard.width}x${mBox.height})`);
  await page.locator('.sidebar').screenshot({ path: 'artifacts/gx-ecosystem-mobile.png' });
  console.log('PASS: mobile — sem overflow, área de toque confortável');

  assert.deepEqual(errors, [], 'sem erros de runtime');
  console.log('ALL ECOSYSTEM CHECKS PASSED');
} catch (error) {
  console.error('ECOSYSTEM VALIDATION FAILED:', error);
  console.error('Runtime errors:', errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
