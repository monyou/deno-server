import { Application, oakCors } from "./deps.ts";
import loggerMiddleware from "./middlewares/logger.ts";
import staticFilesMiddleware from "./middlewares/staticFiles.ts";
import indexRouter from "./routes/index.ts";

const app = new Application();

app.use(oakCors());
app.use(loggerMiddleware);
app.use(staticFilesMiddleware);
app.use(indexRouter.routes());

console.log("Server running on http://localhost:8000");
await app.listen({ port: 8000 });
