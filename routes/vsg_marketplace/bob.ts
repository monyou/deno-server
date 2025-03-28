import { Context, Next, Router } from "../../deps.ts";

const router = new Router();

router.get(
    "/vsg_marketplace/bob/employees",
    async (ctx: Context, next: Next) => {
        try {
            const response = await fetch("https://api.hibob.com/v1/people", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: Deno.env.get("BOB_API_KEY"),
                },
            });
            const data = await response.json();

            const employees = data.employees.map((employee: any) => ({
                name: employee.displayName,
                avatar: employee.avatarUrl,
                email: employee.email,
            }));

            ctx.response.status = 200;
            ctx.response.body = { message: "OK", employees };
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

export default router;
