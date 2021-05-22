const _ = require("lodash");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const minio = require("../../db/minio");
const emailValidator = require("email-validator");
const { JWT_PRIVATE_KEY, SALT_ROUNDS } = process.env;
const AccountSchema = require("../../models/all/account");
const checkForDuplicates = require("../../helpers/checkForDuplicates");
const generateDicebearUrl = require("../../utils/generateDicebearUrl");

exports.register = async (req, res) => {
  const email = _.toLower(req.body.email);
  const { password, firstName, lastName } = req.body;
  const hasValidEmail = emailValidator.validate(email);
  const hasDuplicates = await checkForDuplicates({ email }, AccountSchema);

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
        // Creating file path
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
        account.avatar = `${minio.config.MINIO_ENDPOINT}:${minio.config.MINIO_PORT}/${path}`;
      } else {
        // Setting the avatar URL to an image generated by an external API
        account.avatar = generateDicebearUrl(
          account.firstName,
          account.lastName
        );
      }

      // Saving the account
      await account.save();

      // Creating an account token
      const token = jwt.sign({ id: account.id }, JWT_PRIVATE_KEY);

      // Returning the token
      return res
        .status(201)
        .cookie("jwt", token, {
          httpOnly: true,
          sameSite: true,
          signed: true,
          secure: true,
        })
        .json({ token });
    } else return res.status(403).send("Taken Account");
  } else return res.status(401).send("Invalid Fields");
};
