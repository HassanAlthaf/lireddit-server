import { Redis } from "ioredis";
import { Request, Response } from "express";
import { Session } from "express-session";
import "express-session";

export type MyContext = {
  req: Request & { session: Session };
  res: Response;
  redisClient: Redis;
};

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}
