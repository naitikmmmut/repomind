/**
 * Post-build script: Inlines the CSS into index.html to eliminate render-blocking requests.
 * This removes the <link rel="stylesheet"> tag for main CSS and replaces it with an inline <style> tag.
 */
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const htmlPath = path.join(buildDir, 'index.html');

let html = fs.readFileSync(htmlPath, 'utf8');

// Find the CSS file in the build output
const cssDir = path.join(buildDir, 'static', 'css');
const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css') && !f.endsWith('.map'));

for (const cssFile of cssFiles) {
  const cssPath = path.join(cssDir, cssFile);
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  
  // Replace the <link> tag for this CSS file with an inline <style> tag
  const linkRegex = new RegExp(`<link[^>]*href="/static/css/${cssFile.replace('.', '\\.')}"[^>]*/?>`, 'g');
  html = html.replace(linkRegex, `<style>${cssContent}</style>`);
  
  console.log(`✓ Inlined ${cssFile} (${(cssContent.length / 1024).toFixed(1)} KB)`);
}

fs.writeFileSync(htmlPath, html);
console.log('✓ CSS inlining complete — no more render-blocking stylesheets!');
