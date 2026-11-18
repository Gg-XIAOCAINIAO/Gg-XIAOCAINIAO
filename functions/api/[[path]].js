import { handle } from "../_app.js";

// Cloudflare Pages Functions：/api/* 全部交给统一处理器。
export const onRequest = ({ request, env }) => handle(request, env);
