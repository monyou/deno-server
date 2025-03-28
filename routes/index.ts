import { Router } from "../deps.ts";
import vsg_marketplaceBobRouter from "./vsg_marketplace/bob.ts";

const indexRouter = new Router();

// vsg_marketplace
indexRouter.use(
    vsg_marketplaceBobRouter.routes(),
    vsg_marketplaceBobRouter.allowedMethods()
);

export default indexRouter;
