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

router.post("/register", async (req: Request, res: Response) => {
  try {
    const nome = req.body.nome;
    const cognome = req.body.cognome;
    const email = req.body.email;
    const password = req.body.password;
    const telefono = req.body.telefono;
    const data_nascita = req.body.data_nascita;
    const ruolo = req.body.ruolo;

    // 🔹 Controllo minimo
    if (!nome || !cognome || !email || !password) {
      return res.status(400).json({
        message: "Campi obbligatori mancanti"
      });
    }

    // 🔹 Email già esistente
    const [existing]: any = await db.query(
      "SELECT idUtente FROM utenti WHERE email = ? LIMIT 1",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        message: "Email già registrata"
      });
    }

    // 🔹 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔹 Inserimento (ruolo = cliente di default)
    const [result]: any = await db.query(
      `INSERT INTO utenti 
       (nome, cognome, email, password, telefono, data_nascita, ruolo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nome,
        cognome,
        email,
        hashedPassword,
        telefono || null,
        data_nascita || null,
        ruolo // ⚠️ deve essere uno degli ENUM
      ]
    );

    const userId = result.insertId;

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({
        message: "JWT_SECRET mancante"
      });
    }

    const token = jwt.sign(
      {
        userId,
        nome,
        cognome,
        email,
        ruolo: "cliente"
      },
      jwtSecret,
      { expiresIn: "1d" }
    );

    // 🔹 Risposta
    return res.status(201).json({
      message: "Registrazione completata",
      token,
      user: {
        id: userId,
        nome,
        cognome,
        email,
        telefono,
        data_nascita,
        ruolo: "cliente"
      }
    });

  } catch (err: any) {
    console.error("Errore POST /register:", err);
    return res.status(500).json({
      message: "Errore server"
    });
  }
});

router.post("/verify-password", verifyToken, async (req: any, res: Response) => {
  try {
    console.log("REQ.BODY VERIFY PASSWORD:", req.body);
    const userId = req.user.userId;
    const { currentPassword } = req.body;

    if (!currentPassword || currentPassword.trim() === "") {
      return res.status(400).json({
        message: "La password attuale è obbligatoria"
      });
    }

    const [rows]: any = await db.query(
      `SELECT idUtente, password
       FROM utenti
       WHERE idUtente = ?
       LIMIT 1`,
      [userId]
    );

    const user = rows[0];

    if (!user) {
      return res.status(404).json({
        message: "Utente non trovato"
      });
    }

    if (!user.password || user.password.trim() === "") {
      return res.status(400).json({
        message: "Questo account non ha una password locale configurata"
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "La password attuale non è corretta"
      });
    }

    return res.status(200).json({
      message: "Identità verificata con successo"
    });
  } catch (error: any) {
    console.error("Errore POST /verify-password:", error);
    return res.status(500).json({
      message: "Errore server"
    });
  }
});

router.post("/change-password", verifyToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (
      !currentPassword || currentPassword.trim() === "" ||
      !newPassword || newPassword.trim() === "" ||
      !confirmNewPassword || confirmNewPassword.trim() === ""
    ) {
      return res.status(400).json({
        message: "Tutti i campi password sono obbligatori"
      });
    }

    if (newPassword.trim().length < 6) {
      return res.status(400).json({
        message: "La nuova password deve contenere almeno 6 caratteri"
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        message: "La conferma della nuova password non coincide"
      });
    }

    const [rows]: any = await db.query(
      `SELECT idUtente, password
       FROM utenti
       WHERE idUtente = ?
       LIMIT 1`,
      [userId]
    );

    const user = rows[0];

    if (!user) {
      return res.status(404).json({
        message: "Utente non trovato"
      });
    }

    if (!user.password || user.password.trim() === "") {
      return res.status(400).json({
        message: "Questo account non ha una password locale configurata"
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        message: "La password attuale non è corretta"
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return res.status(400).json({
        message: "La nuova password deve essere diversa da quella attuale"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    await db.query(
      `UPDATE utenti
       SET password = ?
       WHERE idUtente = ?`,
      [hashedPassword, userId]
    );

    return res.status(200).json({
      message: "Password aggiornata con successo"
    });
  } catch (error: any) {
    console.error("Errore POST /change-password:", error);
    return res.status(500).json({
      message: "Errore server"
    });
  }
});

export default router;