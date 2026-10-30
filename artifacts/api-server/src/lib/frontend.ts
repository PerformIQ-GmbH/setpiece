import { existsSync } from "node:fs";
import path from "node:path";
import express, { type Express } from "express";

export function mountFrontend(app: Express, publicDirectory: string) {
  const indexFile = path.join(publicDirectory, "index.html");
  if (!existsSync(indexFile)) {
    throw new Error("Frontend build missing; build @workspace/setpiece before starting production.");
  }

  app.use(express.static(publicDirectory, { index: false }));
  app.get("/{*path}", (req, res, next) => {
    if (path.extname(req.path) || !req.accepts("html")) {
      next();
      return;
    }
    res.set("Cache-Control", "no-cache");
    res.sendFile(indexFile);
  });
}
