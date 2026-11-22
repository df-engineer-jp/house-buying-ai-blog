import { onRequestGet as __api_comments_js_onRequestGet } from "/opt/02.AI-Projects/04.Blog-Writer/astro-blog/functions/api/comments.js"
import { onRequestPost as __api_comments_js_onRequestPost } from "/opt/02.AI-Projects/04.Blog-Writer/astro-blog/functions/api/comments.js"

export const routes = [
    {
      routePath: "/api/comments",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_comments_js_onRequestGet],
    },
  {
      routePath: "/api/comments",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_comments_js_onRequestPost],
    },
  ]