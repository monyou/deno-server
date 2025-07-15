import { Context, Next } from "../deps.ts";

const corsMiddleware = async (ctx: Context, next: Next) => {
    const allowedOrigins = [
        "http://localhost:5173",
        "https://sm-movie-match.vercel.app",
    ];
    const origin = ctx.request.headers.get("Origin");

    if (origin && allowedOrigins.includes(origin)) {
        ctx.response.headers.set("Access-Control-Allow-Origin", origin);
    }
    ctx.response.headers.set("Access-Control-Allow-Credentials", "true");
    ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type");

    if (ctx.request.method === "OPTIONS") {
        ctx.response.status = 204;
        return;
    }
    await next();
};

export default corsMiddleware;
