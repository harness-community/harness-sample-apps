import Fastify from "fastify";
import sensible from "@fastify/sensible";
import { registerRoutes } from "./routes.js";

export async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(sensible);
  await registerRoutes(app);
  return app;
}
