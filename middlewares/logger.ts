import { Context, Next } from "../deps.ts";

const logger = async (ctx: Context, next: Next) => {
    console.log(`Incoming request: ${ctx.request.method} ${ctx.request.url}`);
    await next();
};

export default logger;
