import pg from "../../db/pg";
import express from "express";

const unfollow = async (req: express.Request, res: express.Response) => {
  // Other user's ID
  const { id } = req.params;

  try {
    if (id === req?.user?.id!!) return res.status(406).json();
    else {
      // Deleting the relation
      await pg.query(
        `
        DELETE 
            FROM 
                relations 
        
        WHERE 
            to_user = $1 
            AND 
            from_user = $2 
            AND
            status = 'FOLLOWING'
        `,
        [id, req?.user?.id]
      );

      return res.json(null);
    }
  } catch (error: any) {
    if (error?.code === "22P02") return res.status(400).json();
    else {
      console.error(error);
      return res.status(500).json();
    }
  }
};

export default unfollow;