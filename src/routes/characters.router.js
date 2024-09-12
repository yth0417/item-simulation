import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma/index.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { Prisma } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

/**  캐릭터 생성 API **/
router.post("/characters", authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "캐릭터명을 입력해주세요." });
    }

    const space = /\s/g; // 공백을 확인하기 위한 정규표현식

    if (name.match(space)) {
      return res
        .status(400)
        .json({ message: "캐릭터명에 공백이 포함되어있습니다." });
    }

    const isExistCharacter = await prisma.characters.findFirst({
      where: {
        userId: +userId,
        name,
      },
    });

    if (isExistCharacter) {
      return res
        .status(409)
        .json({ message: "이미 게임에 있는 캐릭터명입니다." });
    }

    const [character] = await prisma.$transaction(
      async (tx) => {
        const character = await tx.characters.create({
          data: {
            userId: +userId,
            name,
          },
        });

        return [character];
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );
    return res.status(200).json({ message: "캐릭터를 생성 완료하였습니다!" });
  } catch (err) {
    next(err);
  }
});

/**  캐릭터 삭제 API **/
router.delete(
  "/characters/:characterId",
  authMiddleware,
  async (req, res, next) => {
    const { userId } = req.user;
    const { characterId } = req.params;
    const { name } = req.body;

    const character = await prisma.characters.findFirst({
      where: {
        characterId: +characterId,
        userId: +userId,
      },
    });

    if (!character) {
      return res.status(404).json({ message: "존재하지 않는 캐릭터입니다." });
    } else if (character.name !== name) {
      return res
        .status(401)
        .json({ message: "캐릭터 이름이 일치하지 않습니다." });
    }

    await prisma.characters.delete({
      where: {
        characterId: +characterId,
        userId: +userId,
      },
    });

    return res.status(200).json({ message: "캐릭터를 삭제했습니다." });
  }
);

/**  캐릭터 상세 조회 API **/
router.get("/characters/:characterId", async (req, res, next) => {
  const { characterId } = req.params;
  const authorization = req.header("authorization"); // 로그인 상태인지 확인

  // 로그인 상태가 아니라면 일반 조회
  if (!authorization) {
    const character = await prisma.characters.findFirst({
      where: {
        characterId: +characterId,
      },
      select: {
        name: true,
        health: true,
        mana: true,
        power: true,
      },
    });

    return res.status(200).json({ data: character });
  }
  // 로그인 상태라면 상세 조회
  else {
    const [tokenType, token] = authorization.split(" ");

    if (tokenType !== "Bearer")
      throw new Error("토큰 타입이 일치하지 않습니다.");

    const decodedToken = jwt.verify(token, process.env.CUSTOM_SECRET_KEY);
    const userId = decodedToken.userId;

    const user = await userPrisma.users.findFirst({
      where: { userId: +userId },
    });
    if (!user) {
      res.clearCookie("authorization");
      throw new Error("토큰 사용자가 존재하지 않습니다.");
    }

    // req.user에 사용자 정보를 저장합니다.
    req.user = user;

    // 조회하려는 캐릭터가 누구인지를 구분
    const characterCheck = await prisma.characters.findFirst({
      where: {
        characterId: +characterId,
        userId: +userId,
      },
    });

    // 내 캐릭터라면
    if (characterCheck) {
      const character = await prisma.characters.findFirst({
        where: {
          characterId: +characterId,
          userId: +userId,
        },
        select: {
          name: true,
          health: true,
          mana: true,
          power: true,
          money: true,
        },
      });

      return res.status(200).json({ data: character });
    }
    // 다른 사람의 캐릭터라면
    else {
      const character = await prisma.characters.findFirst({
        where: {
          characterId: +characterId,
        },
        select: {
          name: true,
          health: true,
          mana: true,
          power: true,
        },
      });

      return res.status(200).json({ data: character });
    }
  }
});

export default router;
