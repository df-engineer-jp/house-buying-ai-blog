/**
 * Cloudflare Pages Function: /api/contact
 * お問い合わせ・開発相談フォーム送信を Cloudflare D1 に保存し、
 * INQUIRY_WEBHOOK_URL が設定されていれば Discord へ即時通知する。
 */

const ALLOWED_ORIGINS = new Set([
  "https://house-buying-ai.com",
  "https://www.house-buying-ai.com",
  "https://house-buying-ai-blog.pages.dev",
]);

const VALID_CATEGORIES = new Map([
  ["article", "記事の内容へのご質問・ご感想"],
  ["correction", "記載内容の訂正・リンク修正のご依頼"],
  ["media", "広告掲載・取材・コラボについて"],
  ["development", "AI自動化・Webシステム開発のご相談"],
  ["other", "ブログ運営に関するその他のお問い合わせ"],
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.house-buying-ai-blog\.pages\.dev$/i.test(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  return false;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function hashIp(ip) {
  const data = new TextEncoder().encode(`df-contact-salt:${ip || "unknown"}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const origin = request.headers.get("Origin");
  if (!isAllowedOrigin(origin)) {
    return jsonResponse({ ok: false, error: "許可されていない送信元です。" }, 403);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "不正なリクエスト形式です。" }, 400);
  }

  // ハニーポット（ボット対策）
  if (payload && typeof payload.website === "string" && payload.website.trim().length > 0) {
    return jsonResponse({ ok: false, error: "不正な送信を検知しました。" }, 400);
  }

  // 人間らしい入力時間チェック（表示から1.2秒未満の即時機械送信を拒否）
  if (payload && typeof payload.form_loaded_at === "number") {
    const elapsed = Date.now() - payload.form_loaded_at;
    if (elapsed >= 0 && elapsed < 1200) {
      return jsonResponse({ ok: false, error: "送信が早すぎます。少し待ってから再度お試しください。" }, 429);
    }
  }

  const categoryKey = typeof payload?.category === "string" ? payload.category.trim() : "other";
  const categoryLabel = VALID_CATEGORIES.get(categoryKey) || VALID_CATEGORIES.get("other");

  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  if (name.length < 1 || name.length > 60) {
    return jsonResponse({ ok: false, error: "お名前は1〜60文字で入力してください。" }, 400);
  }

  const email = typeof payload?.email === "string" ? payload.email.trim() : "";
  if (!email || email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ ok: false, error: "有効なメールアドレスを入力してください。" }, 400);
  }

  const message = typeof payload?.message === "string" ? payload.message.replace(/\r\n/g, "\n").trim() : "";
  if (message.length < 5 || message.length > 2000) {
    return jsonResponse({ ok: false, error: "お問い合わせ内容は5〜2000文字で入力してください。" }, 400);
  }

  const clientIp = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "";
  const ipHash = await hashIp(clientIp);

  let savedToDb = false;
  if (env && env.DB) {
    try {
      await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS inquiries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT NOT NULL,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          message TEXT NOT NULL,
          ip_hash TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )`
      ).run();

      const recentCheck = await env.DB.prepare(
        `SELECT
           SUM(CASE WHEN created_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-60 seconds') THEN 1 ELSE 0 END) AS burst_count,
           COUNT(*) AS hourly_count
         FROM inquiries
         WHERE ip_hash = ?
           AND created_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 hour')`
      )
        .bind(ipHash)
        .first();

      if (recentCheck && Number(recentCheck.burst_count || 0) >= 1) {
        return jsonResponse({ ok: false, error: "連続送信を防ぐため、1分ほど空けてから送信してください。" }, 429);
      }
      if (recentCheck && Number(recentCheck.hourly_count || 0) >= 10) {
        return jsonResponse({ ok: false, error: "1時間あたりの送信上限に達しました。しばらくしてからお試しください。" }, 429);
      }

      await env.DB.prepare(
        `INSERT INTO inquiries (category, name, email, message, ip_hash)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(categoryKey, name, email, message, ipHash)
        .run();
      savedToDb = true;
    } catch (err) {
      // D1失敗時もWebhook通知へフォールバック可能にする
      savedToDb = false;
    }
  }

  let notifiedWebhook = false;
  if (env && env.INQUIRY_WEBHOOK_URL) {
    try {
      const discordContent = [
        `📩 **【D.F.Blogger (PEN) 宛 お問い合わせ着弾】** (${categoryLabel})`,
        `• **お名前**: ${name}`,
        `• **メール**: ${email}`,
        `• **内容**:`,
        "```",
        message.slice(0, 1500),
        "```",
      ].join("\n");

      const hookRes = await fetch(env.INQUIRY_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: discordContent }),
      });
      notifiedWebhook = hookRes.ok;
    } catch {
      notifiedWebhook = false;
    }
  }

  if (!savedToDb && !notifiedWebhook) {
    return jsonResponse(
      { ok: false, error: "現在フォームの保存先に接続できません。ページ下部のメールアドレス宛にご連絡ください。" },
      500
    );
  }

  return jsonResponse({ ok: true, saved: savedToDb, notified: notifiedWebhook }, 201);
}
