import express, { Request, Response } from "express";
import { db } from "../db_parrucchieri";

interface Utente {
  idUtente: number;
  nome: string;
  cognome: string;
  email: string;
  telefono: string | null;
  data_nascita: string | null;
  ruolo: string;
}

const router = express.Router();



router.get("/operatori", async (req: Request, res: Response) => {
  try {
    const { data, error } = await db
      .from("utenti")
      .select("idUtente, nome, cognome, email, telefono, data_nascita, ruolo")
      .in("ruolo", ["operatore", "admin"])
      .order("cognome", { ascending: true })
      .order("nome", { ascending: true });

    if (error) {
      throw error;
    }

    return res.json({
      operatori: (data || []) as Utente[]
    });

  } catch (err: any) {
    console.error("Errore GET /operatori:", err);
    return res.status(500).json({ message: err.message });
  }
});

router.get("/clienti", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await db
      .from("utenti")
      .select("idUtente, nome, cognome, email, telefono, data_nascita, ruolo")
      .eq("ruolo", "cliente")
      .order("cognome", { ascending: true })
      .order("nome", { ascending: true });

    if (error) {
      throw error;
    }

    return res.json({
      clienti: (data || []) as Utente[]
    });
  } catch (err: any) {
    console.error("Errore GET /clienti:", err);
    return res.status(500).json({ message: err.message });
  }
});

// router.get("/", async (req, res) => {
//   try {
//     const { data, error } = await db.from("utenti").select("*");
//     if (error) throw error;
//     res.json(data);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Errore server" });
//   }
// });

  export default router;
