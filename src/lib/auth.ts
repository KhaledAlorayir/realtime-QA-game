import { verify, jwt } from "hono/jwt";
import { settings } from "./settings";
import { UserData } from "./types";
import { Context } from "hono";

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

export function getUserId(ctx: Context): string {
  const payload = ctx.get("jwtPayload") as DecodedToken;
  return payload.sub;
}

export const authenticated = jwt({ secret: settings.JWT_SECRET });
