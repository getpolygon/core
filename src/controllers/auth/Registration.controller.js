const _ = require("lodash");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const minio = require("../../db/minio");
const emailValidator = require("email-validator");
const { JWT_PRIVATE_KEY, SALT_ROUNDS } = process.env;
const AccountSchema = require("../../models/all/account");
const duplicateCheck = require("../../helpers/duplicateCheck");
const generateDicebearUrl = require("../../utils/generateDicebearUrl");

module.exports = async (req, res) => {
  const email = _.toLower(req.body.email);
  const { password, firstName, lastName } = req.body;
  const hasValidEmail = emailValidator.validate(email);
  const hasDuplicates = await duplicateCheck({ email }, AccountSchema);

  // Checking if the email is valid
  if (hasValidEmail && password && firstName && lastName) {
    // If there are no duplicates
    if (!hasDuplicates) {
      // Hashing the password
      const hashedPassword = await bcrypt.hash(password, parseInt(SALT_ROUNDS));
      // Creating the account document
      const account = new AccountSchema({
        email: email,
        lastName: lastName,
        firstName: firstName,
        password: hashedPassword,
      });

      // Check if there's a attached profile picture
      if (req.file) {
        // Getting file format
        const format = req.file.mimetype.split(",")[1];
        /**
         * Creating file path
         * Default file path for user avatars is
         *
         * USER_ID/USER_ID.IMAGE_FORMAT
         */
        const path = `${account.id}/${account.id}.${format}`;

        // Uploading to MinIO
        minio.client.putObject(
          minio.config.MINIO_BUCKET,
          path,
          req.file.buffer,
          req.file.size,
          {
            "Content-Type": req.file.mimetype,
          }
        );

        // Setting the account URL to the
        account.avatar = `${minio.config.MINIO_ENDPOINT}:${minio.config.MINIO_PORT}/${minio.config.MINIO_BUCKET}/${path}`;
      } else {
        // Getting the properties
        const { firstName, lastName } = account;
        // Setting the avatar URL to an image generated by an external API
        account.avatar = generateDicebearUrl(firstName, lastName);
      }

      // Saving the account
      await account.save();

      // Creating an account token
      jwt.sign({ id: account._id }, JWT_PRIVATE_KEY, {}, (err, token) => {
        if (err) console.error(err);
        else {
          // Returning the token
          return res
            .status(201)
            .cookie("jwt", token, {
              httpOnly: true,
              sameSite: "Lax",
              signed: true,
              secure: true,
            })
            .json({ token });
        }
      });
    } else return res.status(403).send();
  } else return res.status(401).send();
};
