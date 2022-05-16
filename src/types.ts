import { createUpdootLoader } from "./utils/createUpdootLoader";
import { createUserLoader } from "./utils/createUserLoader";
import { Redis } from "ioredis";
import { Request, Response } from "express";
import { Session } from "express-session";
import "express-session";

export type MyContext = {
  req: Request & { session: Session };
  res: Response;
  redisClient: Redis;
  userLoader: ReturnType<typeof createUserLoader>;
  updootLoader: ReturnType<typeof createUpdootLoader>;
};

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}
