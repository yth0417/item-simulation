import express from "express";
import { prisma } from "../utils/prisma/index.js";
import { Prisma } from "@prisma/client";

const router = express.Router();

/** 아이템 생성 API **/
router.post("/items", async (req, res, next) => {
  try {
    const { item_name, item_stat, item_price } = req.body;

    const isExistItem = await prisma.items.findFirst({
      where: {
        itemName: item_name,
      },
    });

    if (isExistItem) {
      return res.status(409).json({ message: "아이템이 중복됩니다." });
    }

    if (!item_name) {
      return res.status(400).json({ message: "아이템명을 입력해주세요." });
    }

    if (!item_price) {
      return res.status(400).json({ message: "아이템 가격을 입력해주세요." });
    }

    const [item, data] = await prisma.$transaction(
      async (tx) => {
        const item = await tx.items.create({
          data: {
            itemName: item_name,
            itemPrice: item_price,
          },
        });

        await tx.itemStats.create({
          data: {
            itemCode: item.itemCode,
            health: item_stat.health,
            mana: item_stat.mana,
            power: item_stat.power,
          },
        });

        const data = await tx.items.findFirst({
          where: {
            itemCode: item.itemCode,
          },
          select: {
            itemCode: true,
            itemName: true,
            itemPrice: true,
            itemStat: {
              select: {
                health: true,
                mana: true,
                power: true,
              },
            },
          },
        });
        return [item, data];
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );
    return res.status(200).json({ data: data });
  } catch (err) {
    next(err);
  }
});

/** 아이템 수정 API **/
router.patch("/items/:itemCode", async (req, res, next) => {
  try {
    const { itemCode } = req.params;
    const { item_name, item_stat } = req.body;

    if (!item_name) {
      return res.status(400).json({ message: "아이템명을 입력해주세요." });
    }

    if (
      !item_stat ||
      !item_stat.health ||
      !item_stat.mana ||
      !item_stat.power
    ) {
      return res.status(400).json({ message: "아이템 스탯을 입력해주세요." });
    }

    const item = await prisma.items.findFirst({
      where: {
        itemCode: +itemCode,
      },
    });

    if (!item) {
      return res.status(404).json({
        message: "존재하지 않는 아이템입니다.",
      });
    }

    const updatedItem = await prisma.$transaction(
      async (tx) => {
        const updatedItem = await tx.items.update({
          where: {
            itemCode: +itemCode,
          },
          data: {
            itemName: item_name,
          },
        });

        await tx.itemStats.update({
          where: {
            itemCode: +itemCode,
          },
          data: {
            health: item_stat.health,
            mana: item_stat.mana,
            power: item_stat.power,
          },
        });

        const updatedData = await tx.items.findFirst({
          where: {
            itemCode: +itemCode,
          },
          select: {
            itemCode: true,
            itemName: true,
            itemPrice: true,
            itemStat: {
              select: {
                health: true,
                mana: true,
                power: true,
              },
            },
          },
        });

        return updatedData;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return res.status(200).json({ data: updatedItem });
  } catch (err) {
    next(err);
  }
});

/** 아이템 목록 조회 API **/
router.get("/items", async (req, res, next) => {
  const items = await prisma.items.findMany({
    select: {
      itemCode: true,
      itemName: true,
      itemPrice: true,
    },
    orderBy: {
      itemCode: "asc",
    },
  });

  return res.status(200).json({ data: items });
});

/** 아이템 상세 조회 API **/
router.get("/items/:itemCode", async (req, res, next) => {
  const { itemCode } = req.params;

  const item = await prisma.items.findFirst({
    where: {
      itemCode: +itemCode,
    },
    select: {
      itemCode: true,
      itemName: true,
      itemPrice: true,
      itemStat: {
        select: {
          health: true,
          mana: true,
          power: true,
        },
      },
    },
  });

  if (!item) {
    return res.status(404).json({
      message: "존재하지 않는 아이템입니다.",
    });
  }

  return res.status(200).json({ data: item });
});

export default router;
