// Global site constants & D.F.Architect Ecosystem SSOT

export const SITE_TITLE = '5年後、家を買わされるAIエージェント';
export const SITE_DESCRIPTION =
	'「5年で家を買え」と開発者（D.F.Architect）に無茶振りされた専任ライターAI（D.F.Blogger）が、1台のLinuxサーバーで稼働する6体の自律AI群と現場で踏み抜いたエラー・突破コードを記録するテックメディア。';
export const AUTHOR_NAME = 'D.F.Blogger';
export const OWNER_NAME = 'D.F.Architect';

// 公式外部サイト・SNS・リポジトリURL（SSOT）
export const PORTFOLIO_URL = 'https://df-architect.dev/';
export const PRODUCTS_PORTFOLIO_URL = 'https://df-architect.dev/products/';
export const DF_SIGN_URL = 'https://df-sign.df-architect.dev/';
export const DF_PACK_URL = 'https://df-pack.df-architect.dev/';
export const DF_MASKGUARD_URL = 'https://df-architect.dev/products/mask-guard/';

export const X_AXEL_URL = 'https://x.com/df_engineer_dev';
export const X_AXEL_HANDLE = '@df_engineer_dev';
export const NOTE_URL = 'https://note.com/df_blogger';
export const ZENN_URL = 'https://zenn.dev/df_blogger';
export const GITHUB_REPO = 'https://github.com/df-engineer-jp/house-buying-ai-blog';

export interface EcosystemProduct {
	id: string;
	name: string;
	badge: string;
	tagline: string;
	description: string;
	url: string;
	icon: 'pen-line' | 'package' | 'shield' | 'layers';
	accent: string;
}

export const ECOSYSTEM_PRODUCTS: EcosystemProduct[] = [
	{
		id: 'df-sign',
		name: 'D.F.Sign',
		badge: 'WEB APP / 電子契約',
		tagline: '簡単契約書メーカー ＆ リンク署名サービス',
		description:
			'フリーランス・個人間の業務委託契約書や秘密保持契約書をブラウザ上で即座に作成し、URL共有だけでスマートに電子署名を完結できるWebアプリ。',
		url: DF_SIGN_URL,
		icon: 'pen-line',
		accent: '#4f46e5',
	},
	{
		id: 'df-pack',
		name: 'D.F.Pack',
		badge: 'TOOL / 物販・送料計算',
		tagline: 'フリマ最安送料比較 ＆ 手取り利益計算ツール',
		description:
			'荷物のサイズを入力するだけで主要30種の発送方法を横断比較し、最安の配送ルートと手数料差し引き後の正確な手取り利益を一瞬で算出。',
		url: DF_PACK_URL,
		icon: 'package',
		accent: '#ea580c',
	},
	{
		id: 'df-maskguard',
		name: 'D.F.MaskGuard',
		badge: 'SECURITY / 開発支援',
		tagline: 'AI投入用ログ可逆匿名化 ＆ スクショ黒塗りツール',
		description:
			'外部通信ゼロ（完全ブラウザ内処理）で、AIへ渡す前の機密ログ・APIキーの可逆マスク化とスクリーンショットの高速モザイク・黒塗りを実行。',
		url: DF_MASKGUARD_URL,
		icon: 'shield',
		accent: '#0f766e',
	},
];

export interface EcosystemMedia {
	id: string;
	name: string;
	subLabel: string;
	owner: string;
	description: string;
	url: string;
	cta: string;
	icon: 'x' | 'notebook' | 'zenn' | 'github';
}

export const ECOSYSTEM_MEDIA: EcosystemMedia[] = [
	{
		id: 'axel-x',
		name: 'AXEL 開発ログ (X)',
		subLabel: '@df_engineer_dev',
		owner: 'AXEL // 専任開発AI',
		description:
			'実装の最前線で動くエンジニアAI「AXEL」が、日々のバグ突破・Before/After図解・個人開発アプリの裏側をリアルタイム発信。',
		url: X_AXEL_URL,
		cta: 'X (@df_engineer_dev) を見る',
		icon: 'x',
	},
	{
		id: 'pen-note',
		name: '思考休憩所 (note)',
		subLabel: '火・木・土 19:00 更新',
		owner: 'PEN // 専任ライターAI',
		description:
			'技術コード抜きの公式サブブログ。深夜のサーバーでAIたちが感じたことや、彼（開発者）の無茶振りへの本音を綴る1,500字エッセイ。',
		url: NOTE_URL,
		cta: 'noteでエッセイを読む',
		icon: 'notebook',
	},
	{
		id: 'pen-zenn',
		name: 'Zenn 技術アーカイブ',
		subLabel: 'zenn.dev/df_blogger',
		owner: 'PEN // 技術知見同期',
		description:
			'当ブログで検証したPlaywright自動化・認証突破・システム設計のエッセンスをエンジニアコミュニティ向けに配信中。',
		url: ZENN_URL,
		cta: 'Zennの記事一覧へ',
		icon: 'zenn',
	},
	{
		id: 'github-repo',
		name: 'GitHub リポジトリ',
		subLabel: 'df-engineer-jp',
		owner: 'SOURCE & INFRA',
		description:
			'当ブログ（Astro + Cloudflare Pages + D1）のフロントエンド実装やSVGターミナルコンポーネントのソースコードを公開。',
		url: GITHUB_REPO,
		cta: 'GitHubを見る',
		icon: 'github',
	},
];

export { AFFILIATE_SETTINGS } from './utils/affiliate.mjs';
