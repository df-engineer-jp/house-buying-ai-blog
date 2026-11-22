/**
 * Cloudflare Pages Function: /api/comments
 * ブログ記事ごとのコメント取得（GET）および新規投稿（POST）を Cloudflare D1 で処理する。
 */

const ALLOWED_ORIGINS = new Set([
  "https://house-buying-ai.com",
  "https://www.house-buying-ai.com",
  "https://house-buying-ai-blog.pages.dev",
]);

function isAllowedOrigin(origin) {
  if (!origin) return true; // Originヘッダなし（同一オリジンGET等）は許可
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // プレビューデプロイ用サブドメイン (*.house-buying-ai-blog.pages.dev) およびローカル開発を許可
  if (/^https:\/\/[a-z0-9-]+\.house-buying-ai-blog\.pages\.dev$/i.test(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  return false;
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

function sanitizeSlug(raw) {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed || trimmed.length > 150) return "";
  if (!/^[a-zA-Z0-9/_-]+$/.test(trimmed)) return "";
  return trimmed;
}

async function hashIp(ip) {
  const data = new TextEncoder().encode(`df-blog-salt:${ip || "unknown"}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env || !env.DB) {
    return jsonResponse({ ok: false, error: "コメントデータベースが未接続です。" }, 500);
  }

  const url = new URL(request.url);
  const slug = sanitizeSlug(url.searchParams.get("slug"));
  if (!slug) {
    return jsonResponse({ ok: false, error: "有効な記事スラッグが必要です。" }, 400);
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, parent_id, author_name, author_role, body, created_at
       FROM comments
       WHERE slug = ? AND is_hidden = 0
       ORDER BY id ASC
       LIMIT 200`
    )
      .bind(slug)
      .all();

    return jsonResponse({
      ok: true,
      slug,
      count: results ? results.length : 0,
      comments: results || [],
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: "コメントの読み込みに失敗しました。" }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env || !env.DB) {
    return jsonResponse({ ok: false, error: "コメントデータベースが未接続です。" }, 500);
  }

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

  // 人間らしい入力時間チェック（フォーム表示から1.2秒未満の即時機械送信を拒否）
  if (payload && typeof payload.form_loaded_at === "number") {
    const elapsed = Date.now() - payload.form_loaded_at;
    if (elapsed >= 0 && elapsed < 1200) {
      return jsonResponse({ ok: false, error: "送信が早すぎます。少し待ってから再度お試しください。" }, 429);
    }
  }

  const slug = sanitizeSlug(payload?.slug);
  if (!slug) {
    return jsonResponse({ ok: false, error: "記事スラッグが不正です。" }, 400);
  }

  const authorName = typeof payload?.author_name === "string" ? payload.author_name.trim() : "";
  if (authorName.length < 1 || authorName.length > 40) {
    return jsonResponse({ ok: false, error: "お名前は1〜40文字で入力してください。" }, 400);
  }

  const body = typeof payload?.body === "string" ? payload.body.replace(/\r\n/g, "\n").trim() : "";
  if (body.length < 2 || body.length > 1000) {
    return jsonResponse({ ok: false, error: "コメント本文は2〜1000文字で入力してください。" }, 400);
  }

  // 大量URLスパム防止
  const urlMatches = body.match(/https?:\/\//gi) || [];
  if (urlMatches.length >= 4) {
    return jsonResponse({ ok: false, error: "スパム防止のため、URLは3つまでにしてください。" }, 400);
  }

  const clientIp = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "";
  const ipHash = await hashIp(clientIp);

  try {
    // 同一IPからの連投レート制限（直近45秒以内に1件、または直近1時間に15件）
    const recentCheck = await env.DB.prepare(
      `SELECT
         SUM(CASE WHEN created_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-45 seconds') THEN 1 ELSE 0 END) AS burst_count,
         COUNT(*) AS hourly_count
       FROM comments
       WHERE ip_hash = ?
         AND created_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 hour')`
    )
      .bind(ipHash)
      .first();

    if (recentCheck && Number(recentCheck.burst_count || 0) >= 1) {
      return jsonResponse(
        { ok: false, error: "連続投稿を防ぐため、45秒ほど時間を空けてから投稿してください。" },
        429
      );
    }
    if (recentCheck && Number(recentCheck.hourly_count || 0) >= 15) {
      return jsonResponse(
        { ok: false, error: "1時間あたりの投稿上限に達しました。しばらくしてからお試しください。" },
        429
      );
    }

    const insertRes = await env.DB.prepare(
      `INSERT INTO comments (slug, parent_id, author_name, author_role, body, ip_hash)
       VALUES (?, NULL, ?, 'reader', ?, ?)`
    )
      .bind(slug, authorName, body, ipHash)
      .run();

    const insertedId = insertRes?.meta?.last_row_id;
    let createdComment = null;
    if (insertedId) {
      createdComment = await env.DB.prepare(
        `SELECT id, parent_id, author_name, author_role, body, created_at
         FROM comments
         WHERE id = ?`
      )
        .bind(insertedId)
        .first();
    }

    return jsonResponse(
      {
        ok: true,
        comment: createdComment || {
          id: insertedId || Date.now(),
          parent_id: null,
          author_name: authorName,
          author_role: "reader",
          body,
          created_at: new Date().toISOString(),
        },
      },
      201
    );
  } catch (err) {
    return jsonResponse({ ok: false, error: "コメントの保存中にエラーが発生しました。" }, 500);
  }
}
