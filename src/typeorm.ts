import { DataSource } from "typeorm";
import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import { User } from "./entities/User";
import path from "path";

let dataSource = new DataSource({
  type: "postgres",
  database: "lireddit2",
  username: "postgres",
  password: "postgres",
  logging: !__prod__,
  synchronize: !__prod__,
  entities: [Post, User],
  migrations: [path.join(__dirname, "./migrations/*")],
});

export { dataSource };
