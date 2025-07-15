import { Context, cors, Hono, Next, serveStatic } from "./deps.ts";
import indexRouter from "./routes/index.ts";

const app = new Hono();

app.use("*", async (ctx: Context, next: Next) => {
    const origin = ctx.req.header("Origin");
    const proto = ctx.req.header("x-forwarded-proto");
    ctx.set('isSecure', proto === "https" || origin?.startsWith("https") || false);

    await next();
});
app.use("*", cors({
    origin: (origin) => {
        const allowedOrigins = [
            "http://localhost:5173",
            "https://sm-movie-match.vercel.app",
        ];
        return allowedOrigins.includes(origin) ? origin : "";
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
}));
app.use("*", async (ctx: Context, next: Next) => {
    console.log(`Incoming request: ${ctx.req.method} ${ctx.req.url} (secure: ${ctx.get('isSecure')})`);
    await next();
});
app.use("/static/*", serveStatic({ root: "./", rewriteRequestPath: (path: any) => path }));
app.route("/", indexRouter);

Deno.serve(app.fetch);