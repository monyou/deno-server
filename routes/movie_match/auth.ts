import { Context, Hono, hash, verify, deleteCookie, setCookie, ObjectId, SMTPClient } from "../../deps.ts";
import { authCookie } from "../../middlewares/movie_match/cookieAuth.ts";
import { closeMongoDbConnection, mongoDbClient, openMongoDbConnection } from "../../utils/movie_match/mongoDbClient.ts";

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
        let session;
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
                _id: new ObjectId(),
                firstName: body.firstName,
                lastName: body.lastName,
                email: body.email,
                password: hashedPassword,
                active: false,
                createdAt: Date.now(),
            };
            session = mongoDbClient.startSession();
            session.startTransaction();
            await usersCollection.insertOne(newUser, { session });

            const parsedUrl = new URL(ctx.req.url);
            const activationUrl = `${parsedUrl.protocol}//${parsedUrl.host}/movie_match/auth/activate/${newUser._id}`;
            const emailBody = `<p>Click <a href="${activationUrl}" target="_blank" rel="noopener noreferrer">HERE</a> to activate your account.</p>`;
            const client = new SMTPClient({
                connection: {
                    hostname: "smtp.gmail.com",
                    port: 465,
                    tls: true,
                    auth: {
                        username: "69gamemail69@gmail.com",
                        password: Deno.env.get("MOVIE_MATCH_GMAIL_APP_PASS"),
                    },
                },
            });
            await client.send({
                from: "69gamemail69@gmail.com",
                to: newUser.email,
                subject: "[MovieMatch] - Activate your account",
                html: emailBody,
            });
            await client.close();


            await session.commitTransaction();
            session.endSession();
            await closeMongoDbConnection();
            ctx.status(200);
            return ctx.json({ message: "OK" });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            await closeMongoDbConnection();
            console.log("Server Error: ", error);
            ctx.status(500);
            return ctx.json({
                message: "Internal Server Error"
            });
        }
    }
);

router.get('/activate/:id', async (ctx: Context) => {
    try {
        const userId = ctx.req.param('id');
        if (!userId) {
            ctx.status(400);
            return ctx.json({ message: "Missing user ID" });
        }

        const db = await openMongoDbConnection();
        const usersCollection = db.collection("User");
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            await closeMongoDbConnection();
            ctx.status(404);
            return ctx.json({ message: "User not found" });
        }

        user.active = true;
        await usersCollection.updateOne({ _id: new ObjectId(userId) }, { $set: { active: true } });

        await closeMongoDbConnection();
        return ctx.redirect(`${Deno.env.get("MOVIE_MATCH_APP_URL")}/login`, 302);
    } catch (error) {
        await closeMongoDbConnection();
        console.log("Server Error: ", error);
        ctx.status(500);
        return ctx.json({
            message: "Internal Server Error"
        });
    }
});

router.post(
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
