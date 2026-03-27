import { Router, Request, Response } from "express";
import { db } from "../db_parrucchieri";
import { Appuntamento } from "../../client/src/app/models/appuntamento.model";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
    try {
      const idOperatoreNum = parseInt(req.query.idOperatore as string, 10);
      if (isNaN(idOperatoreNum)) {
        return res.status(400).json({ message: "idOperatore non valido" });
      }
  
      const [rows] = await db.query(
        `SELECT idAppuntamento, idCliente, idOperatore, dataOraInizio
         FROM appuntamenti
         WHERE idOperatore = ?`,
        [idOperatoreNum]
      );
  
      // Restituisce sempre un array, anche vuoto
      return res.json({ appuntamenti: rows || [] });
  
    } catch (err: any) {
      console.error("Errore GET /appuntamenti:", err);
      return res.status(500).json({ message: err.message });
    }
  });

export default router;