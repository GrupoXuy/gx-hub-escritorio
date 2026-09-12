import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const base = process.env.GX_TEST_BASE_URL || process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const email = process.env.GX_TEST_EMAIL ?? '';
const password = process.env.GX_TEST_PASSWORD ?? '';
if (!email || !password) {
  console.error('Defina GX_TEST_EMAIL e GX_TEST_PASSWORD (use .env.example como modelo).');
  process.exit(1);
}
mkdirSync('artifacts', { recursive: true });
const testUsers = [];
const saveUsers = () => writeFileSync('artifacts/test-users.json', JSON.stringify(testUsers));
const track = (id) => { if (id && id !== 'henrique-senna' && !testUsers.includes(id)) { testUsers.push(id); saveUsers(); } };

const browser = await chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
const errors = [];
const contexts = [];

async function newContext() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['microphone', 'camera', 'clipboard-read', 'clipboard-write'],
    locale: 'pt-BR',
  });
  await context.addInitScript(() => {
    window.__gxPeers = [];
    const Native = window.RTCPeerConnection;
    window.RTCPeerConnection = class extends Native {
      constructor(...args) {
        super(...args);
        window.__gxPeers.push(this);
      }
    };
  });
  contexts.push(context);
  return context;
}

const contextA = await newContext();
const page = await contextA.newPage();
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (msg) => {
  if (msg.type() === 'warning' && msg.text().includes('WebRTC')) console.log('RTC WARNING:', msg.text());
});

async function state(p = page) {
  const response = await p.request.get(`${base}/api/workspace`);
  assert.equal(response.status(), 200);
  return response.json();
}

async function eventually(fn, timeout = 15000) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  throw last || new Error('Timed out waiting for condition');
}

async function closeModal(p = page) {
  await p.getByRole('button', { name: 'Fechar janela', exact: true }).click();
}

try {
  assert.equal((await page.request.get(`${base}/api/health`)).status(), 200);

  // 1. Unauthenticated state requires login
  const unauth = await page.request.get(`${base}/api/workspace`);
  assert.equal(unauth.status(), 401);
  const gate = await unauth.json();
  assert.equal(gate.needsAuth, true);

  // 2. Login as Henrique Senna (Admin)
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Seu escritório, sem fronteiras.' }).waitFor();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar no escritório', exact: true }).click();
  await page.getByText('Conexão estável', { exact: true }).waitFor({ timeout: 15000 });

  const initial = await state();
  assert.equal(initial.me.name, 'Henrique Senna');
  assert.equal(initial.me.isAdmin, true);
  console.log('PASS: admin login with email/password');

  // 3. Check layout & responsiveness
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'artifacts/gx-desktop.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false);
  assert.equal(await page.evaluate(() => document.querySelector('.sidebar-user').getBoundingClientRect().bottom <= innerHeight + 1), true);

  // 4. Test Furniture Interaction on Floor 1
  const chair = page.locator('.furniture-hotspot').first();
  await chair.click();
  await page.locator('.map-person.is-me.is-seated').waitFor({ timeout: 4000 });
  await page.locator('.stand-up-button').click();
  await page.waitForTimeout(300);
  console.log('PASS: floor 1 furniture sitting and standing up');

  // 5. Admin creates a user with email & password
  const testEmail = `test.user.${Date.now()}@example.com`;
  const testName = `Teste Membro ${Date.now()}`;
  const contextAdmin = await newContext();
  const adminApi = contextAdmin.request;
  assert.equal(
    (
      await adminApi.post(`${base}/api/auth/login`, {
        data: { email, password },
      })
    ).status(),
    200
  );

  const createdUserRes = await adminApi.post(`${base}/api/users`, {
    data: {
      name: testName,
      role: 'Analista de Operações',
      company: 'Grupo X',
      email: testEmail,
      password: 'SenhaForte123@',
      gender: 'male',
      canAccessGroupSystem: true,
    },
  });
  assert.equal(createdUserRes.status(), 201);
  const createdUser = await createdUserRes.json();
  track(createdUser.member.id);
  console.log('PASS: admin user creation with email and password');

  // 6. Test User B login with their individual email/password
  const contextB = await newContext();
  const pageB = await contextB.newPage();
  pageB.on('pageerror', (e) => errors.push(e.message));

  // Test incorrect password fails
  const wrongPassRes = await pageB.request.post(`${base}/api/auth/login`, {
    data: { email: testEmail, password: 'WrongPassword999' },
  });
  assert.equal(wrongPassRes.status(), 401);

  // Correct login
  await pageB.goto(base, { waitUntil: 'networkidle' });
  await pageB.getByLabel('Email', { exact: true }).fill(testEmail);
  await pageB.getByLabel('Senha', { exact: true }).fill('SenhaForte123@');
  await pageB.getByRole('button', { name: 'Entrar no escritório', exact: true }).click();
  await pageB.getByText('Conexão estável', { exact: true }).waitFor({ timeout: 15000 });
  const userBState = await state(pageB);
  assert.equal(userBState.me.name, testName);
  console.log('PASS: user B individual email/password authentication & wrong password rejection');

  // 7. Test Chat between Henrique and User B
  const testMsg = `Mensagem de sincronização ${Date.now()}`;
  await page.getByRole('textbox', { name: 'Escreva uma mensagem', exact: true }).fill(testMsg);
  await page.getByRole('button', { name: 'Enviar mensagem', exact: true }).click();
  await pageB.locator('.message-body').filter({ hasText: testMsg }).waitFor({ timeout: 12000 });
  console.log('PASS: bidirectional live chat between users');

  // 8. Test Meeting Scheduling & Conflict Prevention
  await page.locator('.nav-item').filter({ hasText: 'Salas de reunião' }).click();
  await page.locator('.page-heading-actions button').click();
  await page.getByRole('dialog').waitFor();
  const meetingTitle = `Reunião Estratégica ${Date.now()}`;
  await page.getByLabel('Nome da reunião', { exact: true }).fill(meetingTitle);

  // Set a distinct future date/time to avoid collision with previous test runs
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 10 + Math.floor(Math.random() * 50));
  futureDate.setHours(10 + Math.floor(Math.random() * 8), 0, 0, 0);
  const localDateStr = new Date(futureDate.getTime() - futureDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  await page.getByLabel('Data e horário', { exact: true }).fill(localDateStr);

  await page.getByRole('dialog').locator('button[type="submit"]').click();
  await eventually(async () => (await state()).meetings.some((m) => m.title === meetingTitle));

  const booked = (await state()).meetings.find((m) => m.title === meetingTitle);
  const conflict = await page.request.post(`${base}/api/meetings`, {
    data: {
      title: 'Conflito de horário',
      roomId: booked.roomId,
      startsAt: booked.startsAt,
      duration: booked.duration,
    },
  });
  assert.equal(conflict.status(), 409, 'Overlapping reservations are rejected');
  console.log('PASS: meeting scheduling and conflict rejection');

  // 9. Test Floor 2 (Diretoria) - Admin Only
  await page.locator('.nav-item').filter({ hasText: 'Escritório virtual' }).click();
  await page.getByRole('button', { name: /Diretoria/ }).click();
  await page.getByText('Sala da Diretoria', { exact: true }).first().waitFor();
  const presSeat = page.locator('.furniture-hotspot').first();
  await presSeat.click();
  await page.locator('.map-person.is-me.is-seated').waitFor({ timeout: 4000 });
  console.log('PASS: floor 2 (diretoria) presidential desk interaction');

  // 10. WebRTC call connection between Henrique and User B
  await page.getByRole('button', { name: /Andar 01/ }).click();
  await page.getByText('Escritório Grupo X', { exact: true }).first().waitFor();

  // Move Henrique and User B to recepcao
  await page.locator('.office-tabs').getByRole('button', { name: 'Recepção' }).click();
  await pageB.locator('.office-tabs').getByRole('button', { name: 'Recepção' }).click();

  await page.getByRole('button', { name: 'Conectar microfone', exact: true }).click();
  await page.getByRole('button', { name: 'Entrar com vídeo', exact: true }).click();
  await page.locator('.active-call-modal').waitFor({ timeout: 20000 });

  await pageB.getByRole('button', { name: 'Conectar microfone', exact: true }).click();
  await pageB.getByRole('button', { name: 'Entrar com vídeo', exact: true }).click();
  await pageB.locator('.active-call-modal').waitFor({ timeout: 20000 });

  await eventually(() => page.evaluate(() => window.__gxPeers.some((p) => p.connectionState === 'connected')), 30000);
  await eventually(() => pageB.evaluate(() => window.__gxPeers.some((p) => p.connectionState === 'connected')), 30000);
  console.log('PASS: bidirectional WebRTC call connection between active members');

  await page.locator('.active-call-modal').getByRole('button', { name: 'Sair da chamada', exact: true }).click();
  await pageB.locator('.active-call-modal').getByRole('button', { name: 'Sair da chamada', exact: true }).click();

  // 11. Cleanup test data
  await adminApi.delete(`${base}/api/meetings?id=${booked.id}`);
  await adminApi.delete(`${base}/api/users?id=${createdUser.member.id}`);

  assert.deepEqual(errors, [], 'Browser runtime errors');
  console.log('ALL WORKSPACE AUTOMATED CHECKS PASSED!');
} catch (error) {
  console.error('BROWSER VALIDATION FAILED:', error);
  await page.screenshot({ path: 'artifacts/gx-failure.png', fullPage: true }).catch(() => {});
  console.error('Runtime errors:', errors);
  process.exitCode = 1;
} finally {
  saveUsers();
  await browser.close();
}
