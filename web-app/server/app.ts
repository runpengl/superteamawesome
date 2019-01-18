import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as express from "express";
import * as fs from "fs";
import * as https from "https";
import * as path from "path";

import { router } from "./routes/index";
import "./slackBot";

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", router);

// catch 404 and forward to error handler
app.use((_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const err: any = new Error("Not Found");
    err.status = 404;
    next(err);
});

// error handler
app.use((err: any, req: express.Request, res: express.Response) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

const port = normalizePort(process.env.PORT || "3000");
// app.listen(port);
https
    .createServer(
        {
            key: fs.readFileSync(path.join(__dirname, "./config/server.key")),
            cert: fs.readFileSync(path.join(__dirname, "./config/server.cert")),
        },
        app,
    )
    .listen(port, () => {
        console.warn("Listening on port 3000!");
    });

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val: string) {
    const normalizedPort = parseInt(val, 10);

    if (isNaN(normalizedPort)) {
        // named pipe
        return val;
    }

    if (normalizedPort >= 0) {
        // port number
        return normalizedPort;
    }

    return false;
}
