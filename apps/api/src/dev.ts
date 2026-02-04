import { config } from "dotenv";
import app from "./index";

config({ path: ".env.local" });

const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);

const server = app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});

server.on("error", (error) => {
  console.error("API server failed to start:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});
// //