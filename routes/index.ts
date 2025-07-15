import { Context, compile, Hono } from "../deps.ts";
import vsg_marketplaceBobRouter from "./vsg_marketplace/bob.ts";
import movie_match_authRouter from "./movie_match/auth.ts";

const indexRouter = new Hono();

// Home page view route
indexRouter.get("/", async (ctx: Context) => {
    const template = await Deno.readTextFile("./views/index.pug");
    const htmlData = compile(template)();
    return ctx.html(htmlData);
});
// vsg_marketplace
indexRouter.route(
    "/vsg_marketplace/bob",
    vsg_marketplaceBobRouter
);
// movie_match
indexRouter.route(
    "/movie_match/auth",
    movie_match_authRouter
);

export default indexRouter;
