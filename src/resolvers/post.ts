import { Updoot } from "./../entities/Updoot";
import { isAuth } from "../middleware/isAuth";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { Post } from "../entities/Post";
import { MyContext } from "../types";
import { dataSource } from "../typeorm";

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];

  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return `${root.text.slice(0, 50)}...`;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext
  ) {
    const { userId } = req.session;

    const isUpdoot = value !== -1;
    const realValue = isUpdoot ? 1 : -1;

    const updoot = await Updoot.findOne({ where: { postId, userId } });

    if (updoot && updoot.value !== realValue) {
      await dataSource.manager.transaction(
        async (transactionalEntityManager) => {
          await transactionalEntityManager
            .createQueryBuilder()
            .update(Updoot)
            .set({ value: realValue })
            .where({ postId, userId })
            .execute();

          await transactionalEntityManager
            .createQueryBuilder()
            .update(Post)
            .set({ points: () => `points + ${realValue * 2}` })
            .where({ id: postId })
            .execute();
        }
      );
    } else if (!updoot) {
      await dataSource.manager.transaction(
        async (transactionalEntityManager) => {
          await transactionalEntityManager.insert(Updoot, {
            userId,
            postId,
            value: realValue,
          });

          await transactionalEntityManager
            .createQueryBuilder()
            .update(Post)
            .set({ points: () => `points + ${realValue}` })
            .where({ id: postId })
            .execute();
        }
      );
    }

    return true;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null, // Cursor is by date
    @Ctx() { req }: MyContext
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1; // Plus one to check if there are more posts

    let replacements: any[] = [realLimitPlusOne];

    if (req.session.userId) {
      replacements.push(req.session.userId);
    }

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const posts = await dataSource.query(
      `
      SELECT p.*, json_build_object('username', u.username, 'id', u.id, 'email', u.email) creator,
      ${
        req.session.userId
          ? ' (select value from updoot where "userId" = $2 and "postId" = p.id) "voteStatus"'
          : 'null as "voteStatus"'
      }
      FROM post p
      INNER JOIN public.user u on u.id = p."creatorId"
      ${cursor ? `WHERE p."createdAt" < $${replacements.length}` : ""}
      ORDER BY p."createdAt" DESC
      LIMIT $1
    `,
      replacements
    );

    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === realLimitPlusOne,
    };
  }

  @Query(() => Post, { nullable: true })
  post(@Arg("id", () => Int) id: number): Promise<Post | null> {
    return Post.findOne({
      where: {
        id,
      },
      relations: ["creator"],
    });
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input", () => PostInput) input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    return Post.create({ ...input, creatorId: req.session.userId }).save();
  }

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("title", () => String, { nullable: true }) title: string
  ): Promise<Post | null> {
    const post = await Post.findOne({
      where: {
        id,
      },
    });

    if (!post) {
      return null;
    }

    if (!!title) {
      await Post.update({ id }, { title });
    }

    return post;
  }

  @Mutation(() => Boolean)
  async deletePost(@Arg("id") id: number): Promise<boolean> {
    Post.delete(id);
    return true;
  }
}
