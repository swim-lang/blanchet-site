import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT_DIR = path.resolve(new URL('..', import.meta.url).pathname);
const BASE_URL = 'http://127.0.0.1:4173';
const OUT_DIR = path.join(ROOT_DIR, 'docs', 'mobile-qa');
const SCREENSHOT_DIR = path.join(OUT_DIR, 'screenshots');

const pages = [
  ['home', 'index.html'],
  ['firm', 'firm.html'],
  ['practices', 'practices.html'],
  ['litigation', 'litigation.html'],
  ['commercial-litigation', 'commercial-litigation.html'],
  ['environmental-disputes', 'environmental-disputes.html'],
  ['product-liability', 'product-liability.html'],
  ['white-collar', 'white-collar.html'],
  ['ip-trade-secrets', 'ip-trade-secrets.html'],
  ['team', 'team.html'],
  ['bio-hannah-amundsen', 'bio-hannah-amundsen.html'],
  ['bio-myles-bartley', 'bio-myles-bartley.html'],
  ['bio-joel', 'bio-joel.html'],
  ['bio-caroline-creagan', 'bio-caroline-creagan.html'],
  ['bio-timothy-cronin', 'bio-timothy-cronin.html'],
  ['bio-andrew-devine', 'bio-andrew-devine.html'],
  ['bio-frank-dylewski', 'bio-frank-dylewski.html'],
  ['bio-stefan-engelhardt', 'bio-stefan-engelhardt.html'],
  ['bio-jaran-moten', 'bio-jaran-moten.html'],
  ['bio-craig-nolan', 'bio-craig-nolan.html'],
  ['bio-robert-reagan', 'bio-robert-reagan.html'],
  ['bio-bridget-ruschak', 'bio-bridget-ruschak.html'],
  ['bio-john-worth', 'bio-john-worth.html'],
  ['insights', 'insights.html'],
  ['insights-article', 'insights-article.html'],
  ['contact', 'contact.html'],
  ['email-signatures', 'email-signatures.html']
];

const viewports = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-modern', width: 390, height: 844 },
  { name: 'large-phone', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 }
];

mkdirSync(SCREENSHOT_DIR, { recursive: true });

function urlFor(pagePath) {
  return `${BASE_URL.replace(/\/$/, '')}/${pagePath}`;
}

function screenshotPath(slug, viewportName) {
  return path.join(SCREENSHOT_DIR, `${viewportName}-${slug}.jpg`);
}

function publicPath(filePath) {
  return path.relative(OUT_DIR, filePath).split(path.sep).join('/');
}

const browser = await chromium.launch({ channel: 'chrome' });
const rows = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      isMobile: viewport.width < 768,
      hasTouch: viewport.width < 768
    });

    await context.addInitScript(() => {
      sessionStorage.setItem('blanchet-preview-auth', 'true');
      sessionStorage.setItem('blanchet-review-mode', 'view');
    });

    for (const [slug, pagePath] of pages) {
      const page = await context.newPage();
      const consoleMessages = [];
      page.on('console', message => {
        if (['error', 'warning'].includes(message.type())) {
          consoleMessages.push(`${message.type()}: ${message.text()}`);
        }
      });

      const url = urlFor(pagePath);
      const result = {
        viewport: viewport.name,
        size: `${viewport.width}x${viewport.height}`,
        slug,
        page: pagePath,
        url,
        screenshot: screenshotPath(slug, viewport.name),
        status: 'ok',
        issues: []
      };

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(450);

        const metrics = await page.evaluate(() => {
          const viewportWidth = document.documentElement.clientWidth;
          const viewportHeight = window.innerHeight;
          const scrollWidth = document.documentElement.scrollWidth;
          const offenders = [];
          document.querySelectorAll('body *').forEach(el => {
            const styles = getComputedStyle(el);
            if (
              styles.display === 'none' ||
              styles.visibility === 'hidden' ||
              Number(styles.opacity) === 0 ||
              el.closest('.password-gate, .review-mode-choice, .review-toolbar, .review-panel, .review-popover')
            ) {
              return;
            }
            const rect = el.getBoundingClientRect();
            if (rect.width < 1 || rect.height < 1) return;
            const overflowsRight = rect.right > viewportWidth + 2;
            const overflowsLeft = rect.left < -2;
            if (overflowsRight || overflowsLeft) {
              offenders.push({
                tag: el.tagName.toLowerCase(),
                className: String(el.className || '').slice(0, 80),
                text: (el.innerText || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 80),
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                width: Math.round(rect.width)
              });
            }
          });

          const fixedElements = Array.from(document.querySelectorAll('body *'))
            .filter(el => getComputedStyle(el).position === 'fixed')
            .map(el => {
              const rect = el.getBoundingClientRect();
              return {
                tag: el.tagName.toLowerCase(),
                className: String(el.className || '').slice(0, 80),
                top: Math.round(rect.top),
                bottom: Math.round(rect.bottom),
                height: Math.round(rect.height),
                width: Math.round(rect.width)
              };
            });

          return {
            title: document.title,
            viewportWidth,
            viewportHeight,
            scrollWidth,
            overflowAmount: Math.max(0, scrollWidth - viewportWidth),
            offenders: offenders.slice(0, 12),
            fixedElements
          };
        });

        if (metrics.overflowAmount > 2) {
          result.issues.push({
            type: 'horizontal-overflow',
            detail: `scrollWidth exceeds viewport by ${metrics.overflowAmount}px`,
            offenders: metrics.offenders
          });
        }

        if (consoleMessages.length) {
          result.issues.push({
            type: 'console',
            detail: consoleMessages.slice(0, 8)
          });
        }

        await page.screenshot({
          path: result.screenshot,
          type: 'jpeg',
          quality: 82,
          fullPage: true,
          animations: 'disabled'
        });
      } catch (error) {
        result.status = 'error';
        result.issues.push({ type: 'load-error', detail: error.message });
      } finally {
        await page.close();
      }

      rows.push(result);
    }

    await context.close();
  }
} finally {
  await browser.close();
}

const reportLines = [
  '# Blanchet Mobile QA Audit',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Base URL: ${BASE_URL}`,
  '',
  '## Summary',
  '',
  `- Pages checked: ${pages.length}`,
  `- Viewports checked: ${viewports.map(v => `${v.name} (${v.width}x${v.height})`).join(', ')}`,
  `- Screenshots: ${rows.length}`,
  `- Results with issues: ${rows.filter(row => row.issues.length).length}`,
  '',
  '## Issues',
  ''
];

const issueRows = rows.filter(row => row.issues.length);
if (!issueRows.length) {
  reportLines.push('No automated mobile issues detected.');
} else {
  for (const row of issueRows) {
    reportLines.push(`### ${row.page} - ${row.viewport} (${row.size})`);
    reportLines.push('');
    reportLines.push(`Screenshot: [${path.basename(row.screenshot)}](${publicPath(row.screenshot)})`);
    reportLines.push('');
    for (const issue of row.issues) {
      reportLines.push(`- **${issue.type}:** ${Array.isArray(issue.detail) ? issue.detail.join('; ') : issue.detail}`);
      if (issue.offenders?.length) {
        for (const offender of issue.offenders.slice(0, 4)) {
          reportLines.push(`  - ${offender.tag}.${offender.className || '(no-class)'} ${offender.left}-${offender.right}px "${offender.text}"`);
        }
      }
    }
    reportLines.push('');
  }
}

reportLines.push('## Screenshot Index', '');
for (const viewport of viewports) {
  reportLines.push(`### ${viewport.name} (${viewport.width}x${viewport.height})`, '');
  for (const [slug, pagePath] of pages) {
    const shot = screenshotPath(slug, viewport.name);
    reportLines.push(`- ${pagePath}: [${path.basename(shot)}](${publicPath(shot)})`);
  }
  reportLines.push('');
}

writeFileSync(path.join(OUT_DIR, 'mobile-audit-results.json'), `${JSON.stringify(rows, null, 2)}\n`);
writeFileSync(path.join(OUT_DIR, 'mobile-audit.md'), `${reportLines.join('\n')}\n`);

const issueSummary = rows
  .filter(row => row.issues.length)
  .map(row => `${row.page}@${row.viewport}:${row.issues.map(issue => issue.type).join(',')}`);

console.log(JSON.stringify({
  screenshots: rows.length,
  issueCount: issueRows.length,
  report: path.join(OUT_DIR, 'mobile-audit.md'),
  issues: issueSummary.slice(0, 20)
}, null, 2));
