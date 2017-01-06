import * as express from "express";

export const router = express.Router();

router.get("*", (_req: express.Request, res: express.Response) => {
  res.render("index", {});
});
