import pg from "../../../db/pg";
import getFirst from "../../../util/getFirst";
import type { Request, Response } from "express";
import checkStatus from "../../../util/checkStatus";

// For fetching comments of a post
const ofPost = async (req: Request, res: Response) => {
  // Getting the post from the query
  const { post: postId } = req.params;
  // Getting next comment cursor and limit per page
  const { next, limit = 2 } = req.query;

  try {
    // Finding the post
    const post = await getFirst<{ id: string; user_id: string }>(
      "SELECT id, user_id FROM posts WHERE id = $1",
      [postId]
    );

    // If post doesn't exist
    if (!post) return res.sendStatus(404);
    else {
      // Checking the relations between current user and post author
      const status = await checkStatus({
        other: post.user_id!!,
        current: req.user?.id!!,
      });

      // If the relation between 2 users is BLOCKED
      if (status === "BLOCKED") return res.sendStatus(403);

      // If no comment cursor was supplied
      if (!next) {
        // Fetching the comments
        const { rows: comments } = (await pg.query(
          `
            SELECT id, created_at FROM comments WHERE post_id = $1
            ORDER BY created_at DESC LIMIT $2
            `,
          [post.id, Number(limit) || 2]
        )) as { rows: { id: string; created_at: Date }[] };

        // Getting next cursor
        const next = await new Promise(async (resolve, _) => {
          if (comments.length === 0) return null;

          const nextComment = await getFirst<{ id: string }>(
            `
              SELECT id FROM comments WHERE post_id = $1
              AND id > $2 AND created_at > $3
              ORDER BY created_at DESC LIMIT 1;
              `,
            [
              post.id,
              comments[comments.length - 1].id,
              comments[comments.length - 1].created_at,
            ]
          );

          return resolve(nextComment);
        });

        return res.json({
          data: comments,
          next: (next as any)?.id,
        });
      }

      return res.json("not implemented");
    }
  } catch (error: any) {
    if (error?.code === "22P02") return res.sendStatus(400);

    console.error(error);
    return res.sendStatus(500);
  }
};

export default ofPost;