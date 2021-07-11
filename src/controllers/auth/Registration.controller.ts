import _ from "lodash";
import bcrypt from "bcrypt";
import Express from "express";
import jwt from "jsonwebtoken";
import minio from "../../db/minio";
import { User } from "../../@types";
import { v4 as uuidv4 } from "uuid";
import slonik from "../../db/slonik";
const { JWT_PRIVATE_KEY, SALT_ROUNDS } = process.env;
import generateDicebearUrl from "../../utils/generateDicebearUrl";
import { sql, UniqueIntegrityConstraintViolationError } from "slonik";

export default async (req: Express.Request, res: Express.Response) => {
  // Getting the fields
  const { password, firstName, lastName, email, username } = req.body;

  try {
    // Hashing the password
    const hashedPassword = await bcrypt.hash(password, parseInt(SALT_ROUNDS!!));
    // Creating new user object to later retrieve the values from
    const data = {
      email,
      lastName,
      username,
      firstName,
      cover: "",
      avatar: "",
      password: hashedPassword,
    };

    // Check if there's a attached profile picture
    if (!req.file) {
      // Getting the properties
      const { firstName, lastName } = data;
      // Setting the avatar URL to an image generated by an external API
      data.avatar = generateDicebearUrl(firstName, lastName);
    } else {
      // Getting file format
      const format = req.file.mimetype.split("/")[1];
      // Creating a unique filename
      const path = `${uuidv4()}.${format}`;
      // Uploading to MinIO
      const etag = await minio.client.putObject(
        minio.config.MINIO_BUCKET!!,
        path,
        req.file.buffer,
        req.file.size,
        {
          "Content-Type": req.file.mimetype,
        }
      );
      data.avatar = path;
    }

    // Creating the account
    const {
      rows: { 0: user },
    } = await slonik.query<Partial<User>>(sql`
        INSERT INTO users (
          first_name, 
          last_name, 
          email, 
          password, 
          username, 
          avatar
        )
        
        VALUES (
          ${data.firstName}, 
          ${data.lastName}, 
          ${data.email}, 
          ${data.password}, 
          ${data.username},
          ${data.avatar}
          )

        RETURNING *;
      `);

    // Creating an account token
    jwt.sign(
      { id: user.id },
      JWT_PRIVATE_KEY!!,
      {
        expiresIn: "7 days",
      },
      (err, token) => {
        if (err) console.error(err);
        else {
          // Sending a token as a response
          return res
            .status(201)
            .cookie("jwt", token!!, {
              secure: true,
              signed: true,
              httpOnly: true,
              sameSite: "none",
            })
            .json({ token });
        }
      }
    );
  } catch (error) {
    if (error instanceof UniqueIntegrityConstraintViolationError) {
      return res.status(403).send();
    } else {
      console.error(error);
      return res.status(500).send();
    }
  }
};
