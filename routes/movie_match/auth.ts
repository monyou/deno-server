import { Context, Hono, hash, verify, deleteCookie, setCookie } from "../../deps.ts";
import { authCookie } from "../../middlewares/movie_match/cookieAuth.ts";
import { closeMongoDbConnection, openMongoDbConnection } from "../../utils/movie_match/mongoDbClient.ts";

const router = new Hono();

router.post(
    "/login",
    async (ctx: Context) => {
        try {
            const body = await ctx.req.json();
            if (!body.email || !body.password) {
                ctx.status(400);
                return ctx.json({ message: "Missing fields" });
            }
            if (typeof body.email !== "string" || typeof body.password !== "string") {
                ctx.status(400);
                return ctx.json({ message: "Invalid field types" });
            }
            const db = await openMongoDbConnection();
            const usersCollection = db.collection("User");
            const user = await usersCollection.findOne({ email: body.email });
            await closeMongoDbConnection();
            if (!user) {
                ctx.status(404);
                return ctx.json({ message: "User not found" });
            }
            if (user.active === false) {
                ctx.status(404);
                return ctx.json({ message: "User not activated" });
            }
            const isPasswordValid = await verify(body.password, user.password);
            if (!isPasswordValid) {
                ctx.status(404);
                return ctx.json({ message: "Invalid password" });
            }

            setCookie(ctx, authCookie, user._id.toString(), {
                maxAge: 60 * 60 * 24 * 30,
                httpOnly: true,
                secure: ctx.get("isSecure"),
                sameSite: ctx.get('isSecure') ? "none" : "lax",
                path: "/"
            });
            ctx.status(200);
            return ctx.json({ message: "OK", data: { id: user._id, email: user.email, firstName: user.firstName } });
        } catch (error) {
            console.log("Server Error: ", error);
            ctx.status(500);
            return ctx.json({
                message: "Internal Server Error"
            });
        }
    }
);

router.post(
    "/register",
    async (ctx: Context) => {
        try {
            const body = await ctx.req.json();
            if (!body.firstName || !body.lastName || !body.email || !body.password) {
                ctx.status(400);
                return ctx.json({ message: "Missing fields" });
            }
            if (typeof body.firstName !== "string" || typeof body.lastName !== "string" || typeof body.email !== "string" || typeof body.password !== "string") {
                ctx.status(400);
                return ctx.json({ message: "Invalid field types" });
            }

            const db = await openMongoDbConnection();
            const usersCollection = db.collection("User");
            const existingUser = await usersCollection.findOne({ email: body.email });
            if (existingUser) {
                await closeMongoDbConnection();
                ctx.status(400);
                return ctx.json({ message: "Email already exists" });
            }

            const hashedPassword = await hash(body.password);
            const newUser = {
                firstName: body.firstName,
                lastName: body.lastName,
                email: body.email,
                password: hashedPassword,
                active: false,
                createdAt: Date.now(),
            };
            await usersCollection.insertOne(newUser);
            await closeMongoDbConnection();

            ctx.status(200);
            return ctx.json({ message: "OK" });
        } catch (error) {
            await closeMongoDbConnection();
            console.log("Server Error: ", error);
            ctx.status(500);
            return ctx.json({
                message: "Internal Server Error"
            });
        }
    }
);

router.get(
    "/logout",
    async (ctx: Context) => {
        try {
            deleteCookie(ctx, authCookie, {
                path: '/',
                secure: ctx.get("isSecure"),
            });
            ctx.status(200);
            return ctx.json({ message: "OK" });
        } catch (error) {
            console.log("Server Error: ", error);
            ctx.status(500);
            return ctx.json({
                message: "Internal Server Error"
            });
        }
    }
);

export default router;
