import { DataSource } from "typeorm";
import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import { User } from "./entities/User";

let dataSource = new DataSource({
  type: "postgres",
  database: "lireddit2",
  username: "postgres",
  password: "postgres",
  logging: !__prod__,
  synchronize: !__prod__,
  entities: [Post, User],
});

export { dataSource };
