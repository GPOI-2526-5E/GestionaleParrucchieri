import express, { Request, Response } from "express";
import { db } from "../db_parrucchieri";
import { Utente } from "../../client/src/app/models/utente.model"

const router = express.Router();



router.get("/operatori", async (req: Request, res: Response) => {
    try {
      const result = await db.query(
        `SELECT idUtente, nome, cognome, email, telefono, data_nascita, ruolo
         FROM utenti
         WHERE ruolo = 'operatore' OR ruolo = 'admin'`
      );
  
      const operatori = result[0] as Utente[];
  
      return res.json({
        operatori
      });
  
    } catch (err: any) {
      console.error("Errore GET /operatori:", err);
      return res.status(500).json({ message: err.message });
    }
  });

  export default router;