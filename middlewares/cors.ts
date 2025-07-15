import { Context, Next } from "../deps.ts";

const corsMiddleware = async (ctx: Context, next: Next) => {
    const allowedOrigins = [
        "http://localhost:5173",
        "https://sm-movie-match.vercel.app",
    ];
    const origin = ctx.req.header("Origin");
    const proto = ctx.req.header("x-forwarded-proto");
    ctx.set('isSecure', ctx.req.secure || proto === "https" || origin?.startsWith("https"));

    if (origin && allowedOrigins.includes(origin)) {
        ctx.header("Access-Control-Allow-Origin", origin);
    }
    ctx.header("Access-Control-Allow-Credentials", "true");
    ctx.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    ctx.header("Access-Control-Allow-Headers", "Content-Type");

    if (ctx.req.method === "OPTIONS") {
        ctx.status(204);
        return ctx.text("Ok");
    }

    await next();
};

export default corsMiddleware;
