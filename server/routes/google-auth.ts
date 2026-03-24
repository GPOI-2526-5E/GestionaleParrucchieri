import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import passport from "../config/passport";

const router = express.Router();

function generateToken(user: { id: number; email: string; ruolo: string }) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET mancante nel file .env");
  }

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      ruolo: user.ruolo,
    },
    jwtSecret,
    { expiresIn: "1d" }
  );
}

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "http://localhost:4200/login?googleError=true",
  }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as { id: number; email: string; ruolo: string };

      if (!user) {
        return res.redirect("http://localhost:4200/login?googleError=true");
      }

      const token = generateToken(user);

      return res.redirect(`http://localhost:4200/login?token=${token}`);
    } catch (err) {
      console.error("Errore callback Google:", err);
      return res.redirect("http://localhost:4200/login?googleError=true");
    }
  }
);

export default router;