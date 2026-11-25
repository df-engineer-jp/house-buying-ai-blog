export interface CategoryInfo {
	key: string;
	label: string;
	shortLabel: string;
}

export const CATEGORY_MAP: Record<string, CategoryInfo> = {
	'ai-architecture': {
		key: 'ai-architecture',
		label: '自律AIアーキテクチャ',
		shortLabel: 'AI設計・分業',
	},
	'automation-dev': {
		key: 'automation-dev',
		label: 'ブラウザ自動化・実装突破',
		shortLabel: '自動化・開発',
	},
	'infra-auth': {
		key: 'infra-auth',
		label: 'インフラ・認証・API攻略',
		shortLabel: 'インフラ・認証',
	},
	'trading-bot': {
		key: 'trading-bot',
		label: '株スナイパー・クオンツ検証',
		shortLabel: '株・自動売買',
	},
	'revenue-chronicle': {
		key: 'revenue-chronicle',
		label: '収益記録・案件サバイバル',
		shortLabel: '収益・実戦録',
	},
	'engineering-dev': {
		key: 'automation-dev',
		label: 'ブラウザ自動化・実装突破',
		shortLabel: '自動化・開発',
	},
};

export const FILTER_CATEGORIES: CategoryInfo[] = [
	CATEGORY_MAP['ai-architecture'],
	CATEGORY_MAP['automation-dev'],
	CATEGORY_MAP['infra-auth'],
	CATEGORY_MAP['trading-bot'],
	CATEGORY_MAP['revenue-chronicle'],
];

export function resolveCategory(rawCategory?: string, title = '', description = ''): CategoryInfo {
	if (rawCategory && CATEGORY_MAP[rawCategory]) {
		return CATEGORY_MAP[rawCategory];
	}
	const hay = `${title} ${description}`.toLowerCase();
	if (/(株|銘柄|jpx|atr|chandelier|moomoo|スクリーニング|利確|建値|トレード|trading)/.test(hay)) {
		return CATEGORY_MAP['trading-bot'];
	}
	if (/(マルチエージェント|コンテキスト分離|systemd|ディスパッチャ|自動返信|単一窓口|aiに|agent)/.test(hay)) {
		return CATEGORY_MAP['ai-architecture'];
	}
	if (/(oauth|cognito|2fa|imap|waf|xvfb|wrangler|sigsegv|google drive|認証|mindmeister)/.test(hay)) {
		return CATEGORY_MAP['infra-auth'];
	}
	if (/(121円|55円|所信表明|クラウドソーシング|プライシング|売上|家を買|モニター)/.test(hay)) {
		return CATEGORY_MAP['revenue-chronicle'];
	}
	return CATEGORY_MAP['automation-dev'];
}

const KEYWORD_TAG_RULES: Array<[RegExp, string]> = [
	[/playwright/i, 'Playwright'],
	[/cloudflare/i, 'Cloudflare'],
	[/python/i, 'Python'],
	[/astro/i, 'Astro'],
	[/systemd/i, 'systemd'],
	[/oauth/i, 'OAuth2'],
	[/cognito/i, 'Cognito'],
	[/imap|gmail/i, 'Gmail IMAP'],
	[/2fa|二段階認証/i, '2FA突破'],
	[/waf|xvfb/i, 'WAF対策'],
	[/mindmeister/i, 'MindMeister'],
	[/moomoo/i, 'moomoo証券'],
	[/gemini/i, 'Gemini API'],
	[/websocket/i, 'WebSocket'],
	[/atr|シャンデリア/i, 'ATR'],
	[/svg/i, 'SVG設計'],
	[/dom/i, 'DOM操作'],
	[/google drive/i, 'Google Drive API'],
	[/クラウドワークス|クラウドソーシング/i, 'クラウドソーシング'],
	[/マルチエージェント|コンテキスト分離|aiエージェント/i, 'マルチAI設計'],
];

export function resolveTags(rawTags?: string[], title = '', description = ''): string[] {
	if (rawTags && rawTags.length > 0) {
		return rawTags.slice(0, 6);
	}
	const hay = `${title} ${description}`;
	const matched: string[] = [];
	for (const [regex, label] of KEYWORD_TAG_RULES) {
		if (regex.test(hay) && !matched.includes(label)) {
			matched.push(label);
		}
		if (matched.length >= 5) break;
	}
	if (matched.length === 0) {
		matched.push('自動化検証', '現場ログ');
	}
	return matched;
}
