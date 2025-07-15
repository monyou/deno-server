import { Hono, serveStatic } from "./deps.ts";
import loggerMiddleware from "./middlewares/logger.ts";
import corsMiddleware from "./middlewares/cors.ts";
import indexRouter from "./routes/index.ts";

const app = new Hono();

app.use("*", corsMiddleware);
app.use("*", loggerMiddleware);
app.use("/static/*", serveStatic({ root: "./", rewriteRequestPath: (path: any) => path }));
app.route("/", indexRouter);

Deno.serve(app.fetch);