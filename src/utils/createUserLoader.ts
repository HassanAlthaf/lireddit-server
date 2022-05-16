import { User } from "./../entities/User";
import DataLoader from "dataloader";
import { In } from "typeorm";

export const createUserLoader = () =>
  new DataLoader<number, User>(async (userIds: readonly number[]) => {
    const users = await User.findBy({
      id: In([...userIds]),
    });

    const userIdToUser: Record<number, User> = {};

    users.forEach((u) => {
      userIdToUser[u.id] = u;
    });

    return userIds.map((userId): User => {
      return userIdToUser[userId];
    });
  });
