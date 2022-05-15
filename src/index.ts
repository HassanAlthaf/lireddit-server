import "reflect-metadata";
import { MikroORM } from "@mikro-orm/core";
import { __prod__, COOKIE_NAME } from "./constants";
import microConfig from "./mikro-orm.config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import Redis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
import { MyContext } from "./types";
import cors from "cors";

const main = async () => {
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up();

  const app = express();

  const redisStore = connectRedis(session);
  const redisClient = new Redis();

  app.set("trust proxy", !__prod__);

  app.use(
    cors({
      credentials: true,
      origin: ["https://studio.apollographql.com", "http://localhost:3000"],
    })
  );

  app.use(
    session({
      name: COOKIE_NAME,
      store: new redisStore({
        client: redisClient,
        disableTTL: true, // Disable TTL of Data, Data lives infinitely.
        disableTouch: true, // Polls to renew TTL of Data, so disable it since data must last infinitely.
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years.
        httpOnly: true,
        secure: true, // cookie only works in https
        sameSite: __prod__ ? "lax" : "none", // CSRF
      },
      secret: "some special secret",
      resave: false,
      saveUninitialized: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({
      // Inject parameters to the resolver's context.
      em: orm.em,
      req,
      res,
    }),
  });

  await apolloServer.start();

  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.listen(4000, () => {
    console.info("Server started on port 4000.");
  });
};

main().catch((err) => {
  console.error(err);
});
