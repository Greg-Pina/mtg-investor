import { Request, Response } from "express";

export function helloController(req: Request, res: Response) {
  const name = (req.query.name as string) || "world";
  res.json({ message: `Hello, ${name}!` });
}
