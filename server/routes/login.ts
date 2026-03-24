import express, { Request, Response } from "express";
import { db } from "../db_parrucchieri";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();

interface User {
  idUtente: number;
  email: string;
  password: string;
  ruolo: string;
}

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email e password obbligatorie" });
    }

    const result = await db.query(
      "SELECT idUtente, email, password, ruolo FROM utenti WHERE email = ? LIMIT 1",
      [email]
    );

    const users = result[0] as User[];
    const user = users[0];

    if (!user) {
      return res.status(404).json({ message: "Utente non trovato" });
    }

    if (!user.password) {
      return res.status(400).json({
        message: "Questo account è registrato con Google. Accedi con Google."
      });
    }

    const validate = await bcrypt.compare(password, user.password);

    if (!validate) {
      return res.status(401).json({ message: "Password errata" });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return res.status(500).json({ message: "JWT_SECRET mancante nel file .env" });
    }

    const token = jwt.sign(
      {
        userId: user.idUtente,
        email: user.email,
        ruolo: user.ruolo
      },
      jwtSecret,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login effettuato con successo",
      token,
      user: {
        id: user.idUtente,
        email: user.email,
        ruolo: user.ruolo
      }
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;