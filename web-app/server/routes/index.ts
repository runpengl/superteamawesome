import * as express from "express";

export const router = express.Router();

router.get("/start", (_req: express.Request, res: express.Response) => {
  res.render("start", {});
});

router.get("*", (_req: express.Request, res: express.Response) => {
  res.render("index", {});
});
