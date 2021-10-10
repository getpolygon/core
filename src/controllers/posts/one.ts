import express from "express";
import getFirst from "../../utils/getFirst";
import type { Post } from "../../types/post";
import { checkStatus } from "../../helpers/helpers";

// For fetching one post
const one = async (req: express.Request, res: express.Response) => {
  // The id of the post
  const { id } = req.params;

  try {
    // Getting the post
    const post = await getFirst<Partial<Post>>(
      `
      SELECT
        Post.id,
        Post.body,
        Post.created_at,
        row_to_json(Author) AS user

      FROM posts Post

      INNER JOIN (
        SELECT
            id,
            avatar,
            username
            last_name,
            first_name,
            username

        FROM users
      ) Author ON Post.user_id = Author.id

      WHERE Post.id = $1
      GROUP BY Post.id, Author.*
      ORDER BY Post.created_at DESC;
      `,
      [id]
    );

    // Fetching the relation status between users
    const status = await checkStatus({
      current: req.user?.id!!,
      other: post?.user_id!! as string,
    });

    // If post exists
    if (!post) return res.status(404).json();
    else {
      // If post author has blocked current user
      if (status === "BLOCKED") return res.status(403).json();
      else return res.json(post);
    }
  } catch (error: any) {
    if (error?.code === "22P02") return res.status(400).json();
    else {
      console.error(error);
      return res.status(500).json();
    }
  }
};

export default one;