import { Context, deleteCookie, getCookie, Next, ObjectId } from "../../deps.ts";
import { closeMongoDbConnection, openMongoDbConnection } from "../../utils/movie_match/mongoDbClient.ts";

export const authCookie = "sm_movie_match_auth";

const cookieAuthMiddleware = async (ctx: Context, next: Next) => {
    const cookie = getCookie(ctx, authCookie);
    if (!cookie) {
        deleteCookie(ctx, authCookie, {
            httpOnly: true,
            secure: ctx.get("isSecure"),
            sameSite: ctx.get('isSecure') ? "none" : "lax",
            path: "/"
        });
        ctx.status(401);
        return ctx.json({ message: "Session expired" });
    }
    const db = await openMongoDbConnection();
    const usersCollection = db.collection("User");
    const user = await usersCollection.findOne({ _id: new ObjectId(cookie), active: true });
    await closeMongoDbConnection();
    if (!user) {
        deleteCookie(ctx, authCookie, {
            httpOnly: true,
            secure: ctx.get("isSecure"),
            sameSite: ctx.get('isSecure') ? "none" : "lax",
            path: "/"
        });
        ctx.status(403);
        return ctx.json({ message: "Forbidden" });
    }
    await next();
};

export default cookieAuthMiddleware;
