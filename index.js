// .env configuration
require("dotenv").config();

// Dependencies
const cors = require("cors");
const morgan = require("morgan");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const compression = require("compression");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const port = 3000 || process.env.PORT;
const app = express();

// Routes
const apiRoute = require("./routes/api");
const authRoute = require("./routes/auth");
const platformRoute = require("./routes/platform");

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(compression());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static("./public"));
app.use(express.static("./lib")); // This is for working with .min.* files ( May change file structure later )
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.set("views", "./views");
app.set("view engine", "ejs");

// Use the routes
app.use("/", platformRoute);
app.use("/api", apiRoute);
app.use("/auth", authRoute);

// Error page
app.get("*", (req, res) => res.redirect("/static/error.html"));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then(console.log("MongoDB: OK"))
  .catch((e) => console.error(e));

// Start the server
app.listen(port, "0.0.0.0", () =>
  console.log(`Server listening at port http://localhost:${port}`)
);
