const {
  MINIO_ENDPOINT,
  MINIO_BUCKET,
  MINIO_PORT,
  MINIO_ACCKEY,
  MINIO_SECKEY,
  MINIO_USESSL
} = process.env;
const _ = require("lodash");
const bcrypt = require("bcrypt");
const emailValidator = require("email-validator");
const router = require("express").Router();
const mongoose = require("mongoose");
const multer = require("multer");
const { unlinkSync } = require("fs");
const storage = multer.diskStorage({
  destination: "tmp/",
  filename: (err, file, cb) => {
    cb(null, `${file.originalname}`);
    if (err) return;
  }
});
const randomColorPair = require("random-color-pair");
const upload = multer({ storage: storage });
const minio = require("minio");
const MinIOClient = new minio.Client({
  endPoint: MINIO_ENDPOINT,
  port: parseInt(MINIO_PORT),
  accessKey: MINIO_ACCKEY,
  secretKey: MINIO_SECKEY,
  useSSL: JSON.parse(MINIO_USESSL.toLowerCase())
});
const AccountSchema = require("../models/account");

// Registration Page
router.get("/", (req, res) => {
  if (!req.cookies.email || !req.cookies.password) {
    req.session.destroy();
    return res.render("register", { title: "Register | ArmSocial" });
  } else {
    return res.redirect("/auth/register");
  }
});

// To register the account
router.post("/", upload.single("avatar"), async (req, res) => {
  let email = _.toLower(req.body.email);

  // Checking if the email is valid
  async function checkEmailValidity() {
    if (emailValidator.validate(email)) return email;
    else return false;
  }

  async function checkForDuplicates() {
    const doc = await AccountSchema.findOne({ email: email });
    if (!doc) return false;
    else return true;
  }

  var emailIsValid = await checkEmailValidity();
  var duplicates = await checkForDuplicates();

  if (emailIsValid && !duplicates) {
    let Account = new AccountSchema({
      _id: new mongoose.Types.ObjectId(),
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      fullName: `${req.body.firstName} ${req.body.lastName}`,
      email: email,
      bio: req.body.bio,
      isPrivate: req.body.privateCheck ? true : false,
      friends: {
        pending: [],
        approved: [],
        dismissed: [],
        requested: []
      },
      date: Date.now()
    });

    // If a custom image was selected by the client set the picture URL to Firebase's  CDN
    const url = async () => {
      // If the user has selected a file
      if (req.file) {
        // Upload user image to the database
        MinIOClient.fPutObject(MINIO_BUCKET, `${Account._id}/${Account._id}.png`, req.file.path, {
          "Content-Type": req.file.mimetype
        });
        // Getting the link for the user's image
        const presignedUrl = await MinIOClient.presignedGetObject(
          MINIO_BUCKET,
          `${Account._id}/${Account._id}.png`
        );
        return presignedUrl;
      }
      // If the user didn't select an image return a random image link(string) that will be used to serve default avatars from the server
      else {
        const [foreground, background] = randomColorPair();
        return `https://ui-avatars.com/api/?name=${
          Account.fullName
        }&background=${background.replace("#", "")}&color=${foreground.replace("#", "")}`;
      }
    };

    const hashPass = async () => {
      let pass = await bcrypt.hash(req.body.password, 10).catch((e) => {
        console.error(e);
      });
      return pass;
    };

    const password = await hashPass();
    const pictureUrl = await url();

    Account.pictureUrl = pictureUrl;
    Account.password = password;

    try {
      await Account.save();
      if (req.file) return unlinkSync(`tmp/${req.file.originalname}`);
      return res
        .cookie("email", Account.email)
        .cookie("password", Account.password)
        .redirect(`/user/${Account._id}`);
    } catch (err) {
      console.log(err);
      return res.redirect("/");
    }
  } else {
    req.session.destroy();
    return res.render("login", {
      title: "Login — ArmSocial",
      err: "The email you entered is invalid"
    });
  }
});

module.exports = router;