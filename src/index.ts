require("dotenv").config();

import path from "path";
import cors from "cors";
import chalk from "chalk";
import morgan from "morgan";
import helmet from "helmet";
import routes from "./routes";
import express from "express";
import slonik from "./db/slonik";
import compression from "compression";
import initDB from "./utils/initDB";
import cookieParser from "cookie-parser";
const PORT = Number(process.env.PORT) || 3001;
const __DEV__ = process.env.NODE_ENV === "development";
const origins = __DEV__ ? true : JSON.parse(process.env.ORIGINS!!) || null;

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(express.json());
__DEV__ && app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(cors({ origin: origins, credentials: true }));

// Use the routes
app.use(routes);

// Initialize database connection
slonik.connect(async (connection) => await initDB(connection));

// For development environment
if (__DEV__) {
  const fs = require("fs");
  const https = require("https");

  //Development server with SSL
  const httpsServer = https.createServer(
    {
      key: fs.readFileSync(path.resolve("cert/key.pem")),
      cert: fs.readFileSync(path.resolve("cert/cert.pem")),
    },
    app
  );

  // Start the server
  httpsServer.listen(PORT, "0.0.0.0", () => {
    // Clear the console
    console.clear();
    console.log(
      `${chalk.greenBright(
        "Started secure development server"
      )} at ${chalk.bold(`https://localhost:${PORT}/`)}`
    );
  });
}
// For production environment
else {
  const http = require("http");
  const server = http.createServer(app);

  server.listen(PORT, "0.0.0.0", () => {
    console.clear();
    console.log(
      `${chalk.greenBright("Production server")} started at port ${chalk.bold(
        PORT
      )}`
    );
  });
}
