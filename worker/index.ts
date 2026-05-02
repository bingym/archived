import { Hono } from "hono";
import type { Env } from "./types";
import people from "./routes/people";
import items from "./routes/items";
import uploads, { r2Public } from "./routes/r2";

const app = new Hono<{ Bindings: Env }>();

app.route("/api/v1/people", people);
app.route("/api/v1", items);
app.route("/api/v1/uploads", uploads);
app.route("/r2", r2Public);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message ?? "Internal error" }, 500);
});

export default app;
