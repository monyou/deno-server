import { Application } from "./deps.ts";
import logger from "./middlewares/logger.ts";
import staticFiles from "./middlewares/staticFiles.ts";
import indexRouter from "./routes/index.ts";

const app = new Application();

app.use(logger);
app.use(staticFiles);
app.use(indexRouter.routes());

console.log("Server running on http://localhost:8000");
await app.listen({ port: 8000 });
