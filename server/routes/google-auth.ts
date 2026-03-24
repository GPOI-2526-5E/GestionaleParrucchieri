import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import passport from "../config/passport";

const router = express.Router();

<<<<<<< HEAD
<<<<<<< HEAD
interface JwtUser {
  id: number;
  nome: string;
  cognome: string;
  email: string;
  ruolo: string;
}

function generateToken(user: JwtUser) {
=======
function generateToken(user: { id: number; email: string; ruolo: string }) {
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
=======
function generateToken(user: { id: number; email: string; ruolo: string }) {
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET mancante nel file .env");
  }

  return jwt.sign(
    {
      userId: user.id,
<<<<<<< HEAD
<<<<<<< HEAD
      nome: user.nome,
      cognome: user.cognome,
=======
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
=======
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
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
<<<<<<< HEAD
<<<<<<< HEAD
      const user = req.user as JwtUser;
=======
      const user = req.user as { id: number; email: string; ruolo: string };
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
=======
      const user = req.user as { id: number; email: string; ruolo: string };
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b

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