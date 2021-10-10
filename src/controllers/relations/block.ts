import express from "express";
import getFirst from "../../utils/getFirst";
import type { Relation } from "../../types/relation";

// For blocking users
const block = async (req: express.Request, res: express.Response) => {
  // Other user's ID
  const { id } = req.params;

  try {
    // If the user tries to block himself
    if (id === req?.user?.id!!) return res.status(406).json();
    else {
      /**
       * If there's an existing relation between these users
       * set the status of the relation to blocked, if a relation
       * doesn't exist, then create one
       */
      const relation = await getFirst<Partial<Relation>>(
        `
        INSERT INTO relations (from_user, to_user, status)
        VALUES ($1, $2, 'BLOCKED') ON CONFLICT (status) 
        DO UPDATE SET status = 'BLOCKED' RETURNING status;
        `,
        [id, req.user?.id]
      );

      return res.json(relation?.status);
    }
  } catch (error: any) {
    if (error?.code === "22P02") return res.status(400).json();
    else {
      console.error(error);
      return res.status(500).json();
    }
  }
};

export default block;