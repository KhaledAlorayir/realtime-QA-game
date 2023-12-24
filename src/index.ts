import { serve } from "@hono/node-server";
import { Hono } from "hono";
import "./connections/database/db";
import "./connections/redis";
import { categories } from "./controller/categoriesController";
import { ApiError } from "./model/ApiError";
import { ZodError } from "zod";
import { Server } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "./lib/types";
import { webSocketHandler } from "./socket";
import { quizzes } from "controller/quizzesController";
import { stats } from "controller/statsController";
import { HTTPException } from "hono/http-exception";

const app = new Hono().basePath("/api");
const io = new Server<ClientToServerEvents, ServerToClientEvents>(
  //@ts-ignore
  serve(app)
);

app.route("/categories", categories);
app.route("/quizzes", quizzes);
app.route("/stats", stats);

app.onError((error, ctx) => {
  if (error instanceof ZodError) {
    return ctx.json(ApiError.parseZodError(error), 400);
  } else if (error instanceof HTTPException) {
    return ctx.json(new ApiError(), error.status);
  } else {
    return ctx.json(ApiError.parseServerError(), 500);
  }
});

webSocketHandler(io);

/*TODO 
  others:
  - user stats endpoint
  - refactor seed (sperate reset from seeding master data)
*/
