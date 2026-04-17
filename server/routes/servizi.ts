import express, { Request, Response } from "express";
import { db } from "../db_parrucchieri";

const router = express.Router();

function isVisibleOnSite(record: any): boolean {
  const value =
    record?.["visualizzazione sito"] ??
    record?.visualizzazioneSito ??
    record?.visualizzazione_sito ??
    record?.visualizzazione;

  return value === true || value === 1 || value === "true" || value === "t";
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const idOperatoreParam = req.query.idOperatore as string | undefined;

    if (!idOperatoreParam) {
      const { data, error } = await db.from("servizi").select("*");

      if (error) {
        throw error;
      }

      return res.json((data || []).filter(isVisibleOnSite));
    }

    const idOperatore = Number(idOperatoreParam);

    if (!Number.isFinite(idOperatore) || idOperatore <= 0) {
      return res.status(400).json({ message: "idOperatore non valido" });
    }

    const { data: serviziOperatore, error: serviziOperatoreError } = await db
      .from("serviziOperatori")
      .select("idServizio")
      .eq("idOperatore", idOperatore);

    if (serviziOperatoreError) {
      throw serviziOperatoreError;
    }

    const serviceIds = (serviziOperatore || [])
      .map((record: { idServizio: number | null }) => Number(record.idServizio))
      .filter((id) => Number.isFinite(id));

    if (!serviceIds.length) {
      return res.json([]);
    }

    const { data: servizi, error: serviziError } = await db
      .from("servizi")
      .select("*")
      .eq("visualizzazioneSito", true)
      .eq("tipoPrenotazione", "sito")
      .in("idServizio", serviceIds)
      .order("nome", { ascending: true });

    if (serviziError) {
      throw serviziError;
    }

    return res.json(servizi || []);
  } catch (err: any) {
    console.error("Errore GET /servizi:", err);
    return res.status(500).json({ message: err.message || "Errore server" });
  }
});

export default router;
