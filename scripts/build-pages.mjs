import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const site = new URL(process.env.PAGES_URL || 'https://kolokolchi.github.io/lesa-vyshki/');
if (site.protocol !== 'https:') throw new Error('PAGES_URL must use HTTPS');
site.search = '';
site.hash = '';
site.pathname = site.pathname.replace(/\/?$/, '/');
const output = path.resolve('_site');
if (path.relative(process.cwd(), output) !== '_site') throw new Error('Invalid build directory');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp('dist', output, { recursive: true });

let html = await readFile(path.join(output, 'index.html'), 'utf8');
// Relative resources work on both a custom domain and a GitHub project path.
html = html.replace(/(src|href)="\/(assets\/|ui\.css|app\.js)/g, '$1="./$2');
html = html.replace('<meta name="robots" content="noindex, nofollow">', '<meta name="robots" content="index, follow">');
html = html.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${new URL('assets/scaffolding-hero.webp', site)}">`);
html = html.replace('</head>', `  <link rel="canonical" href="${site}">\n  <meta property="og:url" content="${site}">\n</head>`);
html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/, (_, start, json, end) => {
  const data = JSON.parse(json);
  data.url = site.href;
  return start + JSON.stringify(data) + end;
});
await writeFile(path.join(output, 'index.html'), html);
const css = await readFile(path.join(output, 'ui.css'), 'utf8');
await writeFile(path.join(output, 'ui.css'), css.replaceAll("url('/assets/", "url('./assets/"));
await writeFile(path.join(output, '.nojekyll'), '');
await writeFile(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml', site)}\n`);
await writeFile(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${site}</loc></url></urlset>\n`);
console.log(`Built ${output} for ${site}`);
