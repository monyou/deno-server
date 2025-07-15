import { Context, Next } from "../../deps.ts";

const credentialsMiddleware = async (ctx: Context, next: Next) => {
    const allowedOrigins = [
        "http://localhost:5173",
        "https://sm-server.deno.dev",
    ];
    const origin = ctx.request.headers.get("Origin");

    if (origin && allowedOrigins.includes(origin)) {
        ctx.response.headers.set("Access-Control-Allow-Origin", origin);
        ctx.response.headers.set("Access-Control-Allow-Credentials", "true");
    }
    await next();
};

export default credentialsMiddleware;
