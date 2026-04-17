import { Router, Request, Response } from "express";
import { db } from "../db_parrucchieri";
import { verifyToken } from "../middleware/authMiddleware";

interface Appuntamento {
  idAppuntamento: number;
  idCliente: number;
  idOperatore: number;
  dataOraInizio: string;
  dataOraFine: string;
  stato: string;
  note: string | null;
}

const router = Router();

function normalizeEndDateTime(dataOraInizio: string, dataOraFine: string): string {
  if (dataOraFine.includes("T")) {
    return dataOraFine;
  }

  const [datePart] = dataOraInizio.split("T");
  return datePart ? `${datePart}T${dataOraFine}` : dataOraFine;
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const idOperatoreNum = parseInt(req.query.idOperatore as string, 10);
    if (isNaN(idOperatoreNum)) {
      return res.status(400).json({ message: "idOperatore non valido" });
    }

    const { data, error } = await db
      .from("appuntamenti")
      .select("idAppuntamento, idCliente, idOperatore, dataOraInizio, dataOraFine, stato, note")
      .eq("idOperatore", idOperatoreNum);

    if (error) {
      throw error;
    }

    return res.json({ appuntamenti: (data || []) as Appuntamento[] });
  } catch (err: any) {
    console.error("Errore GET /appuntamenti:", err);
    return res.status(500).json({ message: err.message });
  }
});

router.post("/", verifyToken, async (req: any, res: Response) => {
  try {
    const idCliente = req.user?.userId;
    const {
      idOperatore,
      dataOraInizio,
      dataOraFine,
      stato,
      note
    } = req.body;

    if (!idCliente) {
      return res.status(401).json({ message: "Utente non autenticato" });
    }

    if (!idOperatore || !dataOraInizio || !dataOraFine) {
      return res.status(400).json({
        message: "idOperatore, dataOraInizio e dataOraFine sono obbligatori"
      });
    }

    const normalizedEndDateTime = normalizeEndDateTime(dataOraInizio, dataOraFine);

    const { data: overlappingAppointments, error: overlappingAppointmentsError } = await db
      .from("appuntamenti")
      .select("idAppuntamento")
      .eq("idOperatore", idOperatore)
      .lt("dataOraInizio", normalizedEndDateTime)
      .gt("dataOraFine", dataOraInizio)
      .limit(1);

    if (overlappingAppointmentsError) {
      throw overlappingAppointmentsError;
    }

    if ((overlappingAppointments || []).length > 0) {
      return res.status(409).json({
        message: "L'operatore non e disponibile per tutta la durata del servizio selezionato"
      });
    }

    const { data, error } = await db
      .from("appuntamenti")
      .insert({
        idCliente,
        idOperatore,
        dataOraInizio,
        dataOraFine: normalizedEndDateTime,
        stato: stato || "prenotato",
        note: note || null
      })
      .select("idAppuntamento, idCliente, idOperatore, dataOraInizio, dataOraFine, stato, note")
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json(data as Appuntamento);
  } catch (err: any) {
    console.error("Errore POST /appuntamenti:", err);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
