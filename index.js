require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cache = require('express-redis-cache')({
    host: process.env.REDIS_HOST, port: process.env.REDIS_PORT, auth_pass: process.env.REDIS_PASS
});
const app = express();
const port = 3000 || process.env.PORT;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static("./public"));
app.set("view engine", "ejs");
app.set("views", "./views");

const apiRoute = require("./routes/api");
const authRoute = require("./routes/auth");
const usersRoute = require("./routes/users");
const platformRoute = require("./routes/platform");
const checkEmailRoute = require("./api/checkEmail");
const createPostRoute = require("./api/createPost");
const fetchPostsRoute = require("./api/fetchPosts");

app.use("/", platformRoute);
app.use("/auth", authRoute);
app.use("/users", usersRoute);

app.use("/api", apiRoute);
app.use("/api/checkEmail", checkEmailRoute);
app.use("/api/createPost", createPostRoute);
app.use("/api/fetchPosts", fetchPostsRoute);

app.get("*", cache.route(), (_req, res) => {
    res.redirect("/static/error.html");
});

cache.once("connected", () => {
    console.log("Redis connection: OK, port: %s", process.env.REDIS_PORT);
});
cache.once("error", (e) => {
    console.log("Redis Connection: Error\n%s", e);
});

mongoose.connect(process.env.MONGO_DB, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.once("connected", () => {
    console.log(`MongoDB Connection: OK, at ${process.env.MONGO_DB}`)
});
mongoose.connection.once("error", (e) => {
    console.log(`MongoDB Connection: Error\n${e}`);
});

app.listen(port, () => console.log(`Server listening at port ${port}`));
