import { Context, Next, pug, Router } from "../deps.ts";
import vsg_marketplaceBobRouter from "./vsg_marketplace/bob.ts";

const indexRouter = new Router();
const viewsRouter = new Router();
viewsRouter.get("/", async (ctx: Context, next: Next) => {
    const template = await Deno.readTextFile("./views/index.pug");
    ctx.response.body = pug.compile(template)({ name: "Kolio" });
    await next();
});

indexRouter.use(viewsRouter.routes(), viewsRouter.allowedMethods());
// vsg_marketplace
indexRouter.use(
    vsg_marketplaceBobRouter.routes(),
    vsg_marketplaceBobRouter.allowedMethods()
);

export default indexRouter;
