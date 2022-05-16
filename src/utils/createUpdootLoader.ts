import DataLoader from "dataloader";
import { Updoot } from "./../entities/Updoot";

interface UpdootLoaderKey {
  postId: number;
  userId: number;
}

export const createUpdootLoader = () =>
  new DataLoader<UpdootLoaderKey, Updoot, null>(
    async (updootKeys: readonly UpdootLoaderKey[]) => {
      const updoots = await Updoot.findByIds(updootKeys as any);

      const updootIdsToUpdoot: Record<string, Updoot> = {};

      updoots.forEach((updoot) => {
        updootIdsToUpdoot[`${updoot.userId}|${updoot.postId}`] = updoot;
      });

      return updootKeys.map((key): Updoot => {
        return updootIdsToUpdoot[`${key.userId}|${key.postId}`];
      });
    }
  );
