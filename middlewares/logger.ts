import { Context, Next } from "../deps.ts";

const loggerMiddleware = async (ctx: Context, next: Next) => {
    console.log(`Incoming request: ${ctx.req.method} ${ctx.req.url}`);
    await next();
};

export default loggerMiddleware;
