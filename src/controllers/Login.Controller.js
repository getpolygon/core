const router = require("express").Router();
const bcrypt = require("bcrypt");
const AccountSchema = require("../models/account");

router.get("/", (req, res) => {
  if (!req.cookies.email && !req.cookies.password) {
    res.clearCookie("email");
    res.clearCookie("password");
    res.render("login", { title: "Login | ArmSocial" });
  } else {
    res.redirect("/");
  }
});

router.post("/", async (req, res) => {
  let email = req.body.email;
  let Account = await AccountSchema.findOne({
    email: email
  })
    .then((doc) => {
      if (doc <= 0) {
        return [];
      } else {
        console.log(doc);
        return doc;
      }
    })
    .catch((e) => {
      return e;
    });
  let password = await bcrypt
    .compare(req.body.password, Account.password)
    .then((result) => {
      if (result === true) return req.body.password;
      else return false;
    })
    .catch((e) => {
      return e;
    });

  if (email != Account.email || password === false) {
    res.status(404).render("login", {
      err: "Please check your credentials or create an account",
      title: "Login | ArmSocial"
    });
  } else {
    res.cookie("email", Account.email);
    res.cookie("password", Account.password);
    res.redirect("/");
  }
});

module.exports = router;