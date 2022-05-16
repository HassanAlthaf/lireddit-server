import { createUpdootLoader } from "./utils/createUpdootLoader";
import { createUserLoader } from "./utils/createUserLoader";
import "reflect-metadata";
import { __prod__, COOKIE_NAME } from "./constants";
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
import { dataSource } from "./typeorm";

const main = async () => {
  const connection = await dataSource.initialize();

  connection.runMigrations();

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
      req,
      res,
      redisClient,
      userLoader: createUserLoader(),
      updootLoader: createUpdootLoader(),
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
