import { DataSource } from "typeorm";
import { __prod__ } from "./constants";
import { Updoot } from "./entities/Updoot";
import { Post } from "./entities/Post";
import { User } from "./entities/User";
import path from "path";

let dataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  logging: !__prod__,
  synchronize: !__prod__,
  entities: [Post, User, Updoot],
  migrations: [path.join(__dirname, "./migrations/*")],
});

export { dataSource };
