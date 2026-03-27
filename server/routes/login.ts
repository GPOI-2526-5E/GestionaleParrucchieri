import express, { Request, Response } from "express";
import { db } from "../db_parrucchieri";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
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

    if (!nome || !cognome || !email || !password) {
      return res.status(400).json({
        message: "Campi obbligatori mancanti"
      });
    }

    const [existing]: any = await db.query(
      "SELECT idUtente FROM utenti WHERE email = ? LIMIT 1",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        message: "Email già registrata"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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
        ruolo
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

router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || String(email).trim() === "") {
      return res.status(400).json({
        message: "L'email è obbligatoria"
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const [rows]: any = await db.query(
      `SELECT idUtente, email
       FROM utenti
       WHERE email = ?
       LIMIT 1`,
      [cleanEmail]
    );

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        message: "Se l’email esiste, riceverai un link per reimpostare la password"
      });
    }

    const user = rows[0];

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);

    await db.query(
      `UPDATE utenti
       SET resetPasswordToken = ?, resetPasswordExpires = ?
       WHERE idUtente = ?`,
      [resetToken, resetPasswordExpires, user.idUtente]
    );

    const resetLink = `http://localhost:4200/reset-password?token=${resetToken}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: `"I Parrucchieri" <${process.env.SMTP_FROM}>`,
      to: cleanEmail,
      subject: "Reimposta la tua password",
      html: `
        <div style="max-width:600px;margin:0 auto;padding:32px;background:#111111;border-radius:16px;font-family:Arial,sans-serif;color:#f5f1e8;">
          <h2 style="margin-top:0;color:#d4af37;">Reset della password</h2>

          <p style="font-size:15px;line-height:1.6;">
            Abbiamo ricevuto una richiesta di reimpostazione della password per il tuo account.
          </p>

          <p style="font-size:15px;line-height:1.6;">
            Clicca sul pulsante qui sotto per scegliere una nuova password:
          </p>

          <div style="margin:28px 0;">
            <a
              href="${resetLink}"
              style="display:inline-block;padding:14px 24px;background:#d4af37;color:#111111;text-decoration:none;border-radius:10px;font-weight:700;"
            >
              Reimposta password
            </a>
          </div>

          <p style="font-size:14px;line-height:1.6;color:#d9cfb2;">
            Il link sarà valido per 1 ora.
          </p>

          <p style="font-size:14px;line-height:1.6;color:#d9cfb2;">
            Se non hai richiesto tu questa operazione, puoi ignorare questa email.
          </p>

          <hr style="border:none;border-top:1px solid rgba(212,175,55,0.25);margin:24px 0;" />

          <p style="font-size:12px;color:#a89a73;word-break:break-all;">
            Se il pulsante non funziona, copia e incolla questo link nel browser:<br />
            ${resetLink}
          </p>
        </div>
      `
    });

    return res.status(200).json({
      message: "Se l’email esiste, riceverai un link per reimpostare la password"
    });
  } catch (error: any) {
    console.error("Errore POST /forgot-password:", error);
    return res.status(500).json({
      message: "Errore server durante il recupero password"
    });
  }
});

router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || String(token).trim() === "") {
      return res.status(400).json({
        message: "Token mancante"
      });
    }

    if (!newPassword || String(newPassword).trim() === "") {
      return res.status(400).json({
        message: "La nuova password è obbligatoria"
      });
    }

    if (String(newPassword).trim().length < 6) {
      return res.status(400).json({
        message: "La nuova password deve contenere almeno 6 caratteri"
      });
    }

    if (!confirmPassword || String(confirmPassword).trim() === "") {
      return res.status(400).json({
        message: "La conferma della password è obbligatoria"
      });
    }

    if (String(newPassword).trim() !== String(confirmPassword).trim()) {
      return res.status(400).json({
        message: "Le password non coincidono"
      });
    }

    const cleanToken = String(token).trim();
    const cleanPassword = String(newPassword).trim();

    const [rows]: any = await db.query(
      `SELECT idUtente, password, resetPasswordExpires
       FROM utenti
       WHERE resetPasswordToken = ?
       LIMIT 1`,
      [cleanToken]
    );

    const user = rows[0];

    if (!user) {
      return res.status(400).json({
        message: "Il link di reset non è valido"
      });
    }

    if (!user.resetPasswordExpires) {
      return res.status(400).json({
        message: "Il link di reset non è valido o è scaduto"
      });
    }

    const expiresAt = new Date(user.resetPasswordExpires);
    const now = new Date();

    if (expiresAt.getTime() < now.getTime()) {
      return res.status(400).json({
        message: "Il link di reset è scaduto. Richiedine uno nuovo"
      });
    }

    if (user.password && user.password.trim() !== "") {
      const isSamePassword = await bcrypt.compare(cleanPassword, user.password);

      if (isSamePassword) {
        return res.status(400).json({
          message: "La nuova password deve essere diversa da quella attuale"
        });
      }
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    await db.query(
      `UPDATE utenti
       SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL
       WHERE idUtente = ?`,
      [hashedPassword, user.idUtente]
    );

    return res.status(200).json({
      message: "Password aggiornata con successo"
    });
  } catch (error: any) {
    console.error("Errore POST /reset-password:", error);
    return res.status(500).json({
      message: "Errore server durante il reset della password"
    });
  }
});

export default router;