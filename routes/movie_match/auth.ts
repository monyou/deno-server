import { Context, Next, Router, hash, compare } from "../../deps.ts";
import { authCookie } from "../../middlewares/movie_match/cookieAuth.ts";
import { closeMongoDbConnection, openMongoDbConnection } from "../../utils/movie_match/mongoDbClient.ts";

const router = new Router();

router.post(
    "/movie_match/auth/login",
    async (ctx: Context, next: Next) => {
        try {
            const body = await ctx.request.body.json();
            if (!body.email || !body.password) {
                ctx.response.status = 400;
                ctx.response.body = { message: "Missing fields" };
                return;
            }
            if (typeof body.email !== "string" || typeof body.password !== "string") {
                ctx.response.status = 400;
                ctx.response.body = { message: "Invalid field types" };
                return;
            }
            const db = await openMongoDbConnection();
            const usersCollection = db.collection("User");
            const user = await usersCollection.findOne({ email: body.email });
            await closeMongoDbConnection();
            if (!user) {
                ctx.response.status = 404;
                ctx.response.body = { message: "User not found" };
                return;
            }
            if (user.active === false) {
                ctx.response.status = 404;
                ctx.response.body = { message: "User not activated" };
                return;
            }
            const isPasswordValid = await compare(body.password, user.password);
            if (!isPasswordValid) {
                ctx.response.status = 404;
                ctx.response.body = { message: "Invalid password" };
                return;
            }

            ctx.cookies.set(authCookie, user._id.toString(), {
                maxAge: 60 * 60 * 24 * 30,
                httpOnly: true,
                secure: true,
                sameSite: "strict",
                path: "/"
            });
            ctx.response.status = 200;
            ctx.response.body = { message: "OK", user: { id: user._id, email: user.email, firstName: user.firstName } };
            await next();
        } catch (error) {
            console.log("Server Error: ", error);
            ctx.response.status = 500;
            ctx.response.body = {
                message: "Internal Server Error",
                error: error,
            };
            await next();
        }
    }
);

router.post(
    "/movie_match/auth/register",
    async (ctx: Context, next: Next) => {
        try {
            const body = await ctx.request.body.json();
            if (!body.firstName || !body.lastName || !body.email || !body.password) {
                ctx.response.status = 400;
                ctx.response.body = { message: "Missing fields" };
                return;
            }
            if (typeof body.firstName !== "string" || typeof body.lastName !== "string" || typeof body.email !== "string" || typeof body.password !== "string") {
                ctx.response.status = 400;
                ctx.response.body = { message: "Invalid field types" };
                return;
            }

            const db = await openMongoDbConnection();
            const usersCollection = db.collection("User");
            const existingUser = await usersCollection.findOne({ email: body.email });
            if (existingUser) {
                ctx.response.status = 400;
                ctx.response.body = { message: "Email already exists" };
                await closeMongoDbConnection();
                return;
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


            ctx.response.status = 200;
            ctx.response.body = { message: "OK" };
            await next();
        } catch (error) {
            await closeMongoDbConnection();
            console.log("Server Error: ", error);
            ctx.response.status = 500;
            ctx.response.body = {
                message: "Internal Server Error",
                error: error,
            };
            await next();
        }
    }
);

export default router;
