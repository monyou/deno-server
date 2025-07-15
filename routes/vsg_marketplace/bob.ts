import { Context, Hono } from "../../deps.ts";

const router = new Hono();

router.get(
    "/employees",
    async (ctx: Context) => {
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

            ctx.status(200);
            return ctx.json({ message: "OK", data: employees });
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
