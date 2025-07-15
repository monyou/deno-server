import { Context, Next, pug, Router } from "../deps.ts";
import vsg_marketplaceBobRouter from "./vsg_marketplace/bob.ts";
import movie_match_authRouter from "./movie_match/auth.ts";

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
// movie_match
indexRouter.use(
    movie_match_authRouter.routes(),
    movie_match_authRouter.allowedMethods()
);

export default indexRouter;
