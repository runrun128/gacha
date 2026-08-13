import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { STARTING_MONEY } from "@identity-slot/game-core";
import { env } from "../lib/env";
import { signToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "パスワードは8文字以上にしてください"),
  displayName: z.string().min(1).max(30),
  adminCode: z.string().optional(),
});

const cookieOptions = {
  httpOnly: true,
  sameSite: "none" as const,
  secure: true,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message ?? "入力内容が不正です。",
    });
  }

  const { email, password, displayName, adminCode } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return res.status(409).json({
      error: "このメールアドレスは既に登録されています。",
    });
  }

  if (adminCode && adminCode !== env.adminSignupCode) {
    return res.status(400).json({
      error: "運営コードが正しくありません。",
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userCount = await prisma.user.count();

  // 最初の登録者、または正しい運営コードを入力した場合に管理者になる
  const isAdmin =
    userCount === 0 ||
    (!!adminCode && adminCode === env.adminSignupCode);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName,
      money: STARTING_MONEY,
      role: isAdmin ? "admin" : "user",
    },
  });

  const token = signToken({ userId: user.id });

  // 従来のCookie認証も残す
  res.cookie(env.cookieName, token, cookieOptions);

  // JWTもフロントに返す
  res.status(201).json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    money: user.money,
    token,
  });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "メールアドレスとパスワードを入力してください。",
    });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({
      error: "メールアドレスまたはパスワードが正しくありません。",
    });
  }

  const token = signToken({ userId: user.id });

  // 従来のCookie認証も残す
  res.cookie(env.cookieName, token, cookieOptions);

  // JWTもフロントに返す
  res.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    money: user.money,
    token,
  });
});

authRouter.post("/logout", (_req, res) => {
  const { maxAge: _maxAge, ...clearOptions } = cookieOptions;

  res.clearCookie(env.cookieName, clearOptions);

  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
  });

  if (!user) {
    return res.status(401).json({
      error: "ログインが必要です。",
    });
  }

  res.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    money: user.money,
  });
});

const promoteSchema = z.object({
  code: z.string().min(1),
});

authRouter.post("/promote", requireAuth, async (req, res) => {
  const parsed = promoteSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "運営コードを入力してください。",
    });
  }

  if (parsed.data.code !== env.adminSignupCode) {
    return res.status(403).json({
      error: "運営コードが正しくありません。",
    });
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { role: "admin" },
  });

  res.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    money: user.money,
  });
});