import * as express from "express";

export const router = express.Router();

router.get("/", (_req: express.Request, res: express.Response) => {
  res.render("index", {});
});

router.get("/login", (_req: express.Request, res: express.Response) => {
  const random = Math.floor(Math.random() * 8);
  res.render("login", { random });
});
