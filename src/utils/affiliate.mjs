/**
 * アフィリエイトリンク一括管理・ビルド時自動付与ユーティリティ
 *
 * 1箇所（AFFILIATE_SETTINGS）を設定・更新するだけで、
 * 過去記事（.md / .mdx）・ストック記事・今後追加される全記事・コンポーネント内の
 * Amazon リンクへ漏れなく自動でトラッキングタグ（またはもしもアフィリエイトリンク）を付与する。
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const AFFILIATE_SETTINGS = {
	// 本家 AmazonアソシエイトのトラッキングID（例: 'dfarchitect-22'）。設定すると全Amazonリンクへ ?tag= を自動付与
	amazonAssociateTag: 'dfa-22',
	// もしもアフィリエイト経由を使う場合の設定（amazonAssociateTag が空の時にフォールバック適用）
	moshimoAmazon: {
		aId: '',
		pId: '',
		pcId: '',
		plId: '',
	},
};

function hasActiveConfig(settings = AFFILIATE_SETTINGS) {
	if ((settings?.amazonAssociateTag || '').trim()) return true;
	const m = settings?.moshimoAmazon;
	return Boolean(m && m.aId && m.pId && m.pcId && m.plId);
}

/**
 * Amazon URL に対して有効なアフィリエイト設定（本家タグ優先 → もしも経由）を自動適用する
 * @param {string} rawUrl
 * @param {typeof AFFILIATE_SETTINGS} [settings]
 * @returns {string}
 */
export function resolveAmazonAffiliateUrl(rawUrl, settings = AFFILIATE_SETTINGS) {
	if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;

	let parsed;
	try {
		parsed = new URL(rawUrl);
	} catch {
		return rawUrl;
	}

	const host = parsed.hostname.toLowerCase();
	const isAmazonHost =
		host === 'www.amazon.co.jp' ||
		host === 'amazon.co.jp' ||
		host === 'www.amazon.jp' ||
		host === 'amazon.jp';

	if (!isAmazonHost) return rawUrl;
	if (parsed.pathname === '/' && !parsed.search) return rawUrl;

	const tag = (settings?.amazonAssociateTag || '').trim();
	if (tag) {
		parsed.searchParams.set('tag', tag);
		return parsed.toString();
	}

	const m = settings?.moshimoAmazon;
	if (m && m.aId && m.pId && m.pcId && m.plId) {
		const params = new URLSearchParams({
			a_id: String(m.aId).trim(),
			p_id: String(m.pId).trim(),
			pc_id: String(m.pcId).trim(),
			pl_id: String(m.plId).trim(),
			url: parsed.toString(),
		});
		return `https://af.moshimo.com/af/c/click?${params.toString()}`;
	}

	return rawUrl;
}

/**
 * 生成済み HTML 文字列内の Amazon href 属性を一括変換する
 * @param {string} html
 * @param {typeof AFFILIATE_SETTINGS} [settings]
 * @returns {{ html: string, replacements: number }}
 */
export function rewriteAmazonLinksInHtml(html, settings = AFFILIATE_SETTINGS) {
	if (!hasActiveConfig(settings)) {
		return { html, replacements: 0 };
	}
	let replacements = 0;
	const updated = html.replace(
		/(href\s*=\s*)(["'])(https?:\/\/(?:www\.)?amazon\.(?:co\.)?jp\/[^"']*)\2/gi,
		(full, prefix, quote, rawHref) => {
			const decoded = rawHref.replace(/&amp;/g, '&');
			const resolved = resolveAmazonAffiliateUrl(decoded, settings);
			if (resolved === decoded) return full;
			replacements += 1;
			const encoded = resolved.replace(/&/g, '&amp;');
			return `${prefix}${quote}${encoded}${quote}`;
		}
	);
	return { html: updated, replacements };
}

async function collectHtmlFiles(dirPath) {
	const entries = await fs.readdir(dirPath, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await collectHtmlFiles(fullPath)));
		} else if (entry.isFile() && entry.name.endsWith('.html')) {
			files.push(fullPath);
		}
	}
	return files;
}

/**
 * Astro ビルド統合: 静的出力の全 HTML を走査し、設定に応じて Amazon リンクへタグを自動付与
 * @param {typeof AFFILIATE_SETTINGS} [customSettings]
 */
export function amazonAffiliateIntegration(customSettings = AFFILIATE_SETTINGS) {
	return {
		name: 'amazon-affiliate-rewriter',
		hooks: {
			'astro:build:done': async ({ dir, logger }) => {
				if (!hasActiveConfig(customSettings)) {
					logger.info('Amazon affiliate tag not configured yet; skipping rewrite.');
					return;
				}
				const distDir = fileURLToPath(dir);
				const htmlFiles = await collectHtmlFiles(distDir);
				let totalReplaced = 0;
				let touchedFiles = 0;
				for (const file of htmlFiles) {
					const original = await fs.readFile(file, 'utf8');
					const { html, replacements } = rewriteAmazonLinksInHtml(original, customSettings);
					if (replacements > 0) {
						await fs.writeFile(file, html, 'utf8');
						totalReplaced += replacements;
						touchedFiles += 1;
					}
				}
				logger.info(`Rewrote ${totalReplaced} Amazon affiliate link(s) across ${touchedFiles} HTML file(s).`);
			},
		},
	};
}
