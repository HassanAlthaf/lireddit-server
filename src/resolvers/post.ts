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

    await dataSource.manager.transaction(async (transactionalEntityManager) => {
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
    });

    return true;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null // Cursor is by date
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1; // Plus one to check if there are more posts

    const replacements: any[] = [realLimitPlusOne];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const posts = await dataSource.query(
      `
      SELECT p.*, json_build_object('username', u.username, 'id', u.id, 'email', u.email) creator FROM post p
      INNER JOIN public.user u on u.id = p."creatorId"
      ${cursor ? 'WHERE p."createdAt" < $2' : ""}
      ORDER BY p."createdAt" DESC
      LIMIT $1
    `,
      replacements
    );

    // console.log("posts", posts);

    // const queryBuilder = dataSource
    //   .getRepository(Post)
    //   .createQueryBuilder("p") // alias p
    //   .leftJoinAndSelect("p.creator", "user")
    //   .orderBy('p."createdAt"', "DESC")
    //   .take(realLimitPlusOne);
    // // .innerJoinAndSelect("p.creator", "u", 'u.id = p."creatorId"')

    // console.log(queryBuilder.getQueryAndParameters());

    // const posts = await queryBuilder.getMany();

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
