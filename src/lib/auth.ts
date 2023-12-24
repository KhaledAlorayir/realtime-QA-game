import { verify } from "hono/jwt";
import { settings } from "./settings";
import { UserData } from "./types";
import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { createMiddleware } from "hono/factory";

declare module "hono" {
  interface ContextVariableMap {
    authId: string;
  }
}

interface DecodedToken {
  sub: string;
  email: string;
  user_metadata: {
    avatar_url: string;
    custom_claims: {
      global_name: string;
    };
  };
}

export async function getUserByToken(token: string): Promise<UserData> {
  const verified = (await verify(
    token,
    settings.JWT_SECRET,
    "HS256"
  )) as DecodedToken;
  return {
    userId: verified.sub,
    username: verified.user_metadata.custom_claims.global_name,
    img: verified.user_metadata.avatar_url,
  };
}

export const auth = createMiddleware(async (ctx, next) => {
  try {
    const token = await ctx.req.header("Authorization")?.split("Bearer ")[1];
    if (!token) {
      throw new Error("no token provided");
    }
    const userInfo = await getUserByToken(token);
    ctx.set("authId", userInfo.userId);
    await next();
  } catch (error) {
    throw new HTTPException(401);
  }
});
