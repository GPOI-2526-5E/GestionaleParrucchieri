import express, { Request, Response } from "express";
import { db } from "../db_parrucchieri";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

interface User {
  idUtente: number;
  nome: string;
  cognome: string;
  email: string;
  password: string;
  telefono: string | null;
  data_nascita: string | null;
  ruolo: string;
}

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email e password obbligatorie" });
    }

    const result = await db.query(
      `SELECT idUtente, nome, cognome, email, password, telefono, data_nascita, ruolo
       FROM utenti
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    const users = result[0] as User[];
    const user = users[0];

    if (!user) {
      return res.status(404).json({ message: "Utente non trovato" });
    }

    if (!user.password || user.password.trim() === "") {
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
        nome: user.nome,
        cognome: user.cognome,
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
        nome: user.nome,
        cognome: user.cognome,
        email: user.email,
        telefono: user.telefono,
        data_nascita: user.data_nascita,
        ruolo: user.ruolo
      }
    });
  } catch (err: any) {
    console.error("Errore POST /login:", err);
    return res.status(500).json({ message: err.message });
  }
});

router.get("/me", verifyToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;

    const [rows]: any = await db.query(
      `SELECT idUtente, nome, cognome, email, password, telefono, data_nascita, ruolo
       FROM utenti
       WHERE idUtente = ?
       LIMIT 1`,
      [userId]
    );

    const user = rows[0];

    if (!user) {
      return res.status(404).json({ message: "Utente non trovato" });
    }

    return res.json({
      idUtente: user.idUtente,
      nome: user.nome,
      cognome: user.cognome,
      email: user.email,
      telefono: user.telefono,
      data_nascita: user.data_nascita,
      ruolo: user.ruolo,
      hasPassword: !!user.password && user.password.trim() !== ""
    });
  } catch (error: any) {
    console.error("Errore GET /me:", error);
    return res.status(500).json({ message: "Errore server" });
  }
});

router.put("/me", verifyToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { nome, cognome, telefono, data_nascita, password } = req.body;

    if (!nome || !cognome || !telefono || !data_nascita) {
      return res.status(400).json({
        message: "Nome, cognome, telefono e data di nascita sono obbligatori"
      });
    }

    if (password && password.trim() !== "") {
      if (password.trim().length < 6) {
        return res.status(400).json({
          message: "La password deve contenere almeno 6 caratteri"
        });
      }

      const hashedPassword = await bcrypt.hash(password.trim(), 10);

      await db.query(
        `UPDATE utenti
         SET nome = ?, cognome = ?, telefono = ?, data_nascita = ?, password = ?
         WHERE idUtente = ?`,
        [nome, cognome, telefono, data_nascita, hashedPassword, userId]
      );
    } else {
      await db.query(
        `UPDATE utenti
         SET nome = ?, cognome = ?, telefono = ?, data_nascita = ?
         WHERE idUtente = ?`,
        [nome, cognome, telefono, data_nascita, userId]
      );
    }

    return res.json({ message: "Dati aggiornati con successo" });
  } catch (error: any) {
    console.error("Errore PUT /me:", error);
    return res.status(500).json({ message: "Errore server" });
  }
});

export default router;