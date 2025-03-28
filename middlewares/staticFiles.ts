import { Context, Next, send } from "../deps.ts";

const staticFiles = async (ctx: Context, next: Next) => {
    if (ctx.request.url.pathname.startsWith("/static")) {
        await send(ctx, ctx.request.url.pathname, {
            root: Deno.cwd(),
        });
    } else {
        await next();
    }
};

export default staticFiles;
