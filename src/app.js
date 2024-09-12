import express from "express";
import cookieParser from "cookie-parser";
import UsersRouter from "./routes/users.router.js";
import CharactersRouter from "./routes/characters.router.js";
import ItemsRouter from "./routes/items.router.js";
import LogMiddleware from "./middlewares/log.middleware.js";
import ErrorHandlingMiddleware from "./middlewares/error-handling.middleware.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3302;

app.use(express.json());
app.use(cookieParser());
app.use("/api", [UsersRouter, CharactersRouter, ItemsRouter]);
app.use(LogMiddleware);
app.use(ErrorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(PORT, "포트로 서버가 열렸어요!");
});
