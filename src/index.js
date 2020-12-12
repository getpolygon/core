const { MONGO_DB, USER, PASS } = require("../config/mongo");
const { SECRET, PORT } = require("../config/globals");

// Dependencies
const cors = require("cors");
const morgan = require("morgan");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const compression = require("compression");
const session = require("express-session");
const cookieParser = require("cookie-parser");
// const rateLimit = require("express-rate-limit");
const port = 3000 || PORT;
const app = express();

// Routes
const apiRoute = require("./routes/api");
const authRoute = require("./routes/auth");
const platformRoute = require("./routes/platform");

// Middleware
app.use(cors());
// app.use(
//   rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 100
//   })
// );
app.use(morgan("dev"));
app.use(compression());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static("public/"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  session({
    cookie: {
      secure: false,
      httpOnly: false
    },
    secret: SECRET,
    resave: false,
    saveUninitialized: true
  })
);

app.set("views", "src/views/");
app.set("view engine", "ejs");

// Enable/Disable Headers
app.enable("trust proxy");
app.disable("x-powered-by");
app.enable("x-frame-options");
app.enable("x-content-type-options");

// Use the routes
app.use("/", platformRoute);
app.use("/api", apiRoute);
app.use("/auth", authRoute);

// Error page
app.get("*", (_req, res) => res.redirect("/static/error.html"));
// Maybe will use the global method instead of the one-by-one
// app.get("/*", (req, res) => {
//   if (!req.cookies.email || req.cookies.password) {
//     return res.redirect("/");
//   }
// });

// Connect to MongoDB
mongoose
  .connect(MONGO_DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    user: USER,
    pass: PASS
  })
  .then(console.log("MongoDB: OK"))
  .catch((e) => console.error(e));

// Start the server
app.listen(port, "0.0.0.0", () => console.log(`Server listening at port http://localhost:${port}`));
