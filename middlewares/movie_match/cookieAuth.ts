import { Context, Next } from "../../deps.ts";
import { closeMongoDbConnection, openMongoDbConnection } from "../../utils/movie_match/mongoDbClient.ts";


export const authCookie = "sm_movie_match_auth";

const cookieAuthMiddleware = async (ctx: Context, next: Next) => {
    const cookie = ctx.cookies.get(authCookie);
    if (!cookie) {
        ctx.cookies.set(authCookie, "", { maxAge: 0, httpOnly: true, secure: ctx.state.isSecure, sameSite: "none", path: "/" });
        ctx.response.status = 401;
        ctx.response.body = { message: "Session expired" };
        return;
    }
    const db = await openMongoDbConnection();
    const usersCollection = db.collection("User");
    const user = await usersCollection.findOne({ _id: cookie, active: true });
    await closeMongoDbConnection();
    if (!user) {
        ctx.cookies.set(authCookie, "", { maxAge: 0, httpOnly: true, secure: ctx.state.isSecure, sameSite: "none", path: "/" });
        ctx.response.status = 403;
        ctx.response.body = { message: "Forbidden" };
        return;
    }
    await next();
};

export default cookieAuthMiddleware;
