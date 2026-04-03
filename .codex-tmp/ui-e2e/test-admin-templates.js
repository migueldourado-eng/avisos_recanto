const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const outDir = path.resolve('out');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3001/admin', { waitUntil: 'domcontentloaded' });
  await page.fill('#login-usuario', process.env.ADMIN_USUARIO || 'gestao_escolar');
  await page.fill('#login-senha', process.env.ADMIN_SENHA || 'Recanto@82463179');
  await page.click('#btn-login');

  await page.waitForSelector('#app', { state: 'visible', timeout: 15000 });
  await page.click('#nav-avisos');

  await page.click('#dest-card-todos');
  await page.click('button[onclick="irParaEtapa2()"]');
  await page.waitForSelector('#aviso-step2', { state: 'visible', timeout: 10000 });
  await page.screenshot({ path: path.join(outDir, '01-templates-step.png'), fullPage: true });

  await page.evaluate(() => {
    if (typeof window.aplicarTemplate !== 'function') throw new Error('Função aplicarTemplate não encontrada');
    window.aplicarTemplate(0);
  });

  await page.waitForSelector('#form-aviso', { state: 'visible', timeout: 10000 });

  const titulo = await page.inputValue('#aviso-titulo');
  const mensagem = await page.inputValue('#aviso-mensagem');
  await page.screenshot({ path: path.join(outDir, '02-review-step.png'), fullPage: true });

  if (!titulo.trim() || !mensagem.trim()) {
    throw new Error('Titulo/mensagem nao foram preenchidos ao aplicar template');
  }

  console.log(JSON.stringify({
    ok: true,
    titulo,
    mensagem_preview: mensagem.slice(0, 140),
    screenshots: [
      path.join(outDir, '01-templates-step.png'),
      path.join(outDir, '02-review-step.png')
    ]
  }, null, 2));

  await browser.close();
})();