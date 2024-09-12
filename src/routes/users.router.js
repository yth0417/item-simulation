import express from "express";
import { prisma } from "../utils/prisma/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

/** 사용자 회원가입 API **/
router.post("/sign-up", async (req, res, next) => {
  try {
    const { id, password, passwordCheck, name } = req.body;

    const isExistUser = await prisma.users.findFirst({
      where: { id },
    });

    if (isExistUser) {
      return res.status(409).json({ message: "이미 존재하는 ID입니다." });
    }

    if (password.length <= 6) {
      return res
        .status(400)
        .json({ message: "비밀번호는 최소 6자 이상입니다." });
    }

    if (password !== passwordCheck) {
      return res.status(400).json({ message: "비밀번호가 일치하지 않습니다." });
    }

    const space = /\s/g; // 공백을 확인하기 위한 정규표현식

    if (password.match(space)) {
      return res
        .status(400)
        .json({ message: "비밀번호에 공백이 포함되어있습니다." });
    }

    const mix = /^[a-z0-9]{6,12}$/; // 영어 소문자와 숫자만을 확인하기 위한 정규 표현식

    // test로 ID가 매칭되면 true, 아니면 false로 반환하여 메세지 출력
    if (!mix.test(id)) {
      return res.status(400).json({
        message:
          "ID는 영어 소문자와 숫자로만 가능하며, 최소 6자 최대 12자까지 가능합니다.",
      });
    }

    // 사용자 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    const [user] = await prisma.$transaction(
      async (tx) => {
        // Users 테이블에 사용자를 추가합니다.
        const user = await tx.users.create({
          data: {
            name,
            id,
            password: hashedPassword,
          },
        });
        return [user];
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return res.status(201).json({ message: "회원가입이 완료되었습니다." });
  } catch (err) {
    next(err);
  }
});

/** 로그인 API **/
router.post("/sign-in", async (req, res, next) => {
  const { id, password } = req.body;
  const user = await prisma.users.findFirst({ where: { id } });

  if (!user)
    return res.status(401).json({ message: "존재하지 않는 ID입니다." });
  // 입력받은 사용자의 비밀번호와 데이터베이스에 저장된 비밀번호를 비교합니다.
  else if (!(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: "비밀번호가 일치하지 않습니다." });

  // 로그인에 성공하면, 사용자의 userId를 바탕으로 토큰을 생성합니다.
  const token = jwt.sign(
    {
      userId: user.userId,
    },
    process.env.CUSTOM_SECRET_KEY
  );

  // authotization 쿠키에 Berer 토큰 형식으로 JWT를 저장합니다.
  res.cookie("authorization", `Bearer ${token}`);
  return res.status(200).json({ message: "로그인 성공" });
});

export default router;
