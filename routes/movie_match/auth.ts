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
        online: false,
        createdAt: Date.now(),
      };
      session = mongoDbClient.startSession();
      session.startTransaction();
      await usersCollection.insertOne(newUser, { session });

      const parsedUrl = new URL(ctx.req.url);
      const activationUrl = `${parsedUrl.protocol}//${parsedUrl.host}/movie_match/auth/activate/${newUser._id}`;
      const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Activate Your MovieMatch Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #1c1c1c; font-family: Arial, sans-serif;">
  <table width="100%" bgcolor="#1c1c1c" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="margin: 40px auto; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.2);">
          <!-- Header -->
          <tr>
            <td bgcolor="#111" style="padding: 30px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 28px;">🎬 MovieMatch</h1>
              <p style="margin: 8px 0 0; font-size: 16px; color: #ccc;">Your movie companion</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #333333; font-size: 22px;">Activate Your Account</h2>
              <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                Hi there! 🎉<br><br>
                Thanks for signing up for <strong>MovieMatch</strong> – your new favorite way to find movies and match with fellow movie lovers.
                To get started, please activate your account by clicking the button below:
              </p>

              <!-- Button -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${activationUrl}" target="_blank" rel="noopener noreferrer"
                       style="background-color: #e50914; color: #ffffff; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
                      🔓 Activate Account
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="color: #999999; font-size: 14px; text-align: center;">
                If the button doesn't work, copy and paste the following URL into your browser:<br>
                <a href="${activationUrl}" style="color: #e50914; word-break: break-all;" target="_blank" rel="noopener noreferrer">
                  ${activationUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#f5f5f5" style="padding: 20px; text-align: center; color: #777777; font-size: 12px;">
              © ${new Date().getFullYear()} MovieMatch, All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
            `;
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("MOVIE_MATCH_RESEND_TOKEN")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "no-reply@smechkov.my.id",
          to: newUser.email,
          subject: "[MovieMatch] - Activate your account",
          html: emailBody
        })
      });
      if (!emailResponse.ok) {
        const emailResponseData = await emailResponse.json();
        throw new Error(emailResponseData.message);
      }

      await session.commitTransaction();
      session.endSession();
      await closeMongoDbConnection();
      ctx.status(200);
      return ctx.json({ message: "OK", data: { id: newUser._id } });
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
