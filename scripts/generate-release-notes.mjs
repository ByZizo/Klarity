#!/usr/bin/env node

/**
 * Generates an easy-to-use GitHub Release download page (Markdown) by inspecting
 * the actual built artifacts in a directory and linking directly to each asset.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Parse CLI arguments in `--key value` or `--key=value` form.
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const eqIndex = token.indexOf('=');
    if (eqIndex !== -1) {
      args[token.slice(2, eqIndex)] = token.slice(eqIndex + 1);
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      args[token.slice(2)] = argv[i + 1];
      i += 1;
    } else {
      args[token.slice(2)] = 'true';
    }
  }
  return args;
}

/**
 * Format a byte count into a human-readable MB/KB/B string.
 * @param {number} bytes
 * @returns {string}
 */
function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

/**
 * Build the direct GitHub Release asset download URL.
 * @param {string} repo
 * @param {string} tag
 * @param {string} filename
 * @returns {string}
 */
function buildDownloadUrl(repo, tag, filename) {
  return `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(filename)}`;
}

/**
 * List regular files (non-recursive) in `dir` with name, size, and URL.
 * @param {string} dir
 * @param {string} repo
 * @param {string} tag
 */
function collectAssets(dir, repo, tag) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Assets directory does not exist: ${dir}`);
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const fullPath = path.join(dir, entry.name);
      const stats = fs.statSync(fullPath);
      return {
        name: entry.name,
        size: stats.size,
        sizeLabel: formatSize(stats.size),
        url: buildDownloadUrl(repo, tag, entry.name),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const tag = args.tag;
  const dir = args.dir;
  const repo = args.repo || 'ByZizo/Krystal';
  const out = args.out || 'RELEASE_NOTES.md';

  if (!tag || !dir) {
    console.error('Usage: node scripts/generate-release-notes.mjs --tag <tag> --dir <assetsDir> [--repo <owner/repo>] [--out <file>]');
    process.exit(1);
  }

  const version = tag.replace(/^v/i, '');
  const assets = collectAssets(dir, repo, tag);

  // Match primary user installers and portable binaries dynamically from built files.
  const winSetup = assets.find((a) => /^Krystal-Setup-.*\.exe$/i.test(a.name))
    || assets.find((a) => /Setup.*\.exe$/i.test(a.name));
  const winPortable = assets.find((a) => /^Krystal-Portable-.*\.exe$/i.test(a.name))
    || assets.find((a) => /\.exe$/i.test(a.name) && a !== winSetup);
  const linuxDeb = assets.find((a) => /\.deb$/i.test(a.name));
  const linuxAppImage = assets.find((a) => /\.AppImage$/i.test(a.name));

  const primarySpecs = [
    {
      asset: winSetup,
      platform: '🪟 **Windows Installer (Recommended)**',
      badge: 'https://img.shields.io/badge/Download-Windows%20Installer%20(.exe)-18457c?logo=windows&style=for-the-badge',
      badgeAlt: 'Download Windows Installer (.exe)',
      bestFor: 'Standard Windows setup. Double-click to install **Krystal** with Desktop & Start Menu shortcuts.',
    },
    {
      asset: winPortable,
      platform: '🪟 **Windows Portable (No Install)**',
      badge: 'https://img.shields.io/badge/Download-Windows%20Portable%20(.exe)-475569?logo=windows&style=for-the-badge',
      badgeAlt: 'Download Windows Portable (.exe)',
      bestFor: 'Standalone `.exe`. Run **Krystal** immediately from any folder or USB drive.',
    },
    {
      asset: linuxDeb,
      platform: '💻 **Chrome OS / Chromebook & Debian/Ubuntu**',
      badge: 'https://img.shields.io/badge/Download-Chrome%20OS%20%2F%20Debian%20(.deb)-16a34a?logo=linux&style=for-the-badge',
      badgeAlt: 'Download Chrome OS & Debian/Ubuntu (.deb)',
      bestFor: 'Right-click → **Install with Linux** on Chromebook, or `sudo dpkg -i` on Ubuntu/Debian.',
    },
    {
      asset: linuxAppImage,
      platform: '🐧 **Linux (Any Distro)**',
      badge: 'https://img.shields.io/badge/Download-Linux%20(.AppImage)-7c3aed?logo=linux&style=for-the-badge',
      badgeAlt: 'Download Linux (.AppImage)',
      bestFor: 'Make executable (`chmod +x`) and double-click to run.',
    },
  ].filter((item) => Boolean(item.asset));

  const metaFiles = assets.filter((a) => /\.blockmap$/i.test(a.name) || /^latest.*\.ya?ml$/i.test(a.name));

  const lines = [];
  lines.push(`# 💎 Download Krystal (v${version})`);
  lines.push('');
  lines.push('100% local, private personal & family finance suite.');
  lines.push('');

  if (primarySpecs.length > 0) {
    lines.push(
      primarySpecs
        .map((s) => `[![${s.badgeAlt}](${s.badge})](${s.asset.url})`)
        .join(' ')
    );
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Choose Your Download');
    lines.push('');
    lines.push('| Platform | File (Click to Download) | Size | Best For |');
    lines.push('| :--- | :--- | :---: | :--- |');
    for (const s of primarySpecs) {
      lines.push(`| ${s.platform} | [**\`${s.asset.name}\`**](${s.asset.url}) | ${s.asset.sizeLabel} | ${s.bestFor} |`);
    }
    lines.push('');
  }

  const setupName = winSetup ? winSetup.name : `Krystal-Setup-${version}.exe`;
  const debName = linuxDeb ? linuxDeb.name : `krystal_${version}_amd64.deb`;
  const appImageName = linuxAppImage ? linuxAppImage.name : `Krystal-${version}-x86_64.AppImage`;

  lines.push('---');
  lines.push('');
  lines.push('## Quick Install Guide');
  lines.push('');
  lines.push('### 🪟 Windows (`.exe`)');
  lines.push(`1. Download **\`${setupName}\`** from the table above (do **not** open \`.blockmap\` files).`);
  lines.push('2. Double-click the `.exe` file to install **Krystal** and create Desktop & Start Menu shortcuts.');
  lines.push('3. If Windows Defender SmartScreen shows *"Windows protected your PC"* (normal for open-source apps without a paid certificate), click **More info → Run anyway**.');
  lines.push('');
  lines.push('### 💻 Chrome OS / Chromebook (`.deb`)');
  lines.push('1. Ensure **Linux development environment** is enabled in Chromebook **Settings → Developers**.');
  lines.push(`2. Download **\`${debName}\`** from the table above.`);
  lines.push('3. Open the **Files** app, right-click the `.deb` file, and choose **Install with Linux**.');
  lines.push('4. Open **Krystal** from your Chromebook App Launcher.');
  lines.push('');
  lines.push('### 🐧 Linux (`.deb` / `.AppImage`)');
  lines.push(`- **Debian / Ubuntu / Mint:** \`sudo dpkg -i ${debName}\``);
  lines.push(`- **AppImage (Any Distro):** \`chmod +x ${appImageName} && ./${appImageName}\``);
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## Auto-Update & Developer Files (`.blockmap`, `.yml`)');
  lines.push('');
  lines.push('*Windows & Linux users do **not** need to manually open `.blockmap` or `.yml` files — use the `.exe`, `.deb`, or `.AppImage` downloads above instead.*');
  lines.push('');
  if (metaFiles.length > 0) {
    for (const file of metaFiles) {
      lines.push(`- [\`${file.name}\`](${file.url}) (${file.sizeLabel})`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push("## What's Included");
  lines.push('');
  lines.push('- **Krystal Finance Branding & Desktop App:** Renamed across UI, installers, shortcuts, and local vaults as **Krystal**.');
  lines.push('- **Integrated PDF Editor:** Annotate, sign, highlight, draw, and fill bank statements and forms right inside your encrypted vault.');
  lines.push('- **Refactored Notes Workspace:** Auto-saving notes with custom sections, icon-only toolbar, and smoothly resizable floating window.');
  lines.push('- **Support & About Page:** Added Buy Me a Coffee support link in **Settings → About**.');
  lines.push('- **100% Local & Private:** Your financial data stays strictly on your own device with zero external account tracking.');
  lines.push('');

  fs.writeFileSync(out, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Generated release notes -> ${out} (${assets.length} asset(s) indexed)`);
}

main();
