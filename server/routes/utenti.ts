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

type ClienteSource = "clienti" | "utenti";

const router = express.Router();

function normalizeClienteRow(row: any, source: ClienteSource): Utente | null {
  const idUtente = Number(
    row?.idUtente ??
    row?.idCliente ??
    row?.id ??
    0
  );

  if (!Number.isFinite(idUtente) || idUtente <= 0) {
    return null;
  }

  return {
    idUtente,
    nome: String(row?.nome ?? "").trim(),
    cognome: String(row?.cognome ?? "").trim(),
    email: String(row?.email ?? "").trim(),
    telefono: row?.telefono != null ? String(row.telefono).trim() : null,
    data_nascita: row?.data_nascita != null ? String(row.data_nascita).trim() : null,
    ruolo: source === "clienti"
      ? "cliente"
      : String(row?.ruolo ?? "cliente").trim() || "cliente"
  };
}

function sortClienti(clienti: Utente[]): Utente[] {
  return [...clienti].sort((a, b) => {
    const cognomeCompare = a.cognome.localeCompare(b.cognome, "it", { sensitivity: "base" });
    if (cognomeCompare !== 0) {
      return cognomeCompare;
    }

    return a.nome.localeCompare(b.nome, "it", { sensitivity: "base" });
  });
}

function isMissingTableError(error: any): boolean {
  const message = String(error?.message ?? "").toLowerCase();
  const details = String(error?.details ?? "").toLowerCase();
  const hint = String(error?.hint ?? "").toLowerCase();
  const combined = `${message} ${details} ${hint}`;

  return combined.includes("relation") ||
    combined.includes("does not exist") ||
    combined.includes("not found") ||
    combined.includes("schema cache");
}

async function getClientiFromClientiTable(): Promise<Utente[]> {
  const { data, error } = await db
    .from("clienti")
    .select("*");

  if (error) {
    throw error;
  }

  return sortClienti(
    (data || [])
      .map((row: any) => normalizeClienteRow(row, "clienti"))
      .filter((row: Utente | null): row is Utente => row !== null)
  );
}

async function getClientiFromUtentiTable(): Promise<Utente[]> {
  const { data, error } = await db
    .from("utenti")
    .select("idUtente, nome, cognome, email, telefono, data_nascita, ruolo")
    .order("cognome", { ascending: true })
    .order("nome", { ascending: true });

  if (error) {
    throw error;
  }

  const clienti = (data || [])
    .map((row: any) => normalizeClienteRow(row, "utenti"))
    .filter((row: Utente | null): row is Utente => row !== null)
    .filter((row) => !["operatore", "admin", "salone"].includes(String(row.ruolo || "").toLowerCase()));

  return sortClienti(clienti);
}

async function getClientiWithSource(): Promise<{ clienti: Utente[]; source: ClienteSource }> {
  try {
    const clienti = await getClientiFromClientiTable();
    return { clienti, source: "clienti" };
  } catch (error) {
    if (!isMissingTableError(error)) {
      console.warn("Lettura tabella clienti fallita, provo fallback su utenti:", error);
    }

    const clienti = await getClientiFromUtentiTable();
    return { clienti, source: "utenti" };
  }
}

async function getClientSourceById(id: number): Promise<ClienteSource> {
  try {
    const { data, error } = await db
      .from("clienti")
      .select("*")
      .or(`idCliente.eq.${id},idUtente.eq.${id},id.eq.${id}`)
      .limit(1);

    if (!error && Array.isArray(data) && data.length > 0) {
      return "clienti";
    }
  } catch {
    // fallback silenzioso su utenti
  }

  return "utenti";
}

router.get("/clienti", async (_req: Request, res: Response) => {
  try {
    const { clienti } = await getClientiWithSource();

    return res.json({
      clienti
    });
  } catch (err: any) {
    console.error("Errore GET /clienti:", err);
    return res.status(500).json({ message: err.message });
  }
});

router.put("/clienti/:id", async (req: Request, res: Response) => {
  try {
    const idUtente = Number(req.params.id);
    const nome = String(req.body?.nome ?? "").trim();
    const cognome = String(req.body?.cognome ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const telefono = String(req.body?.telefono ?? "").trim();
    const data_nascita = String(req.body?.data_nascita ?? "").trim();

    if (!Number.isFinite(idUtente) || idUtente <= 0) {
      return res.status(400).json({ message: "Cliente non valido" });
    }

    if (!nome || !cognome || !email) {
      return res.status(400).json({ message: "Nome, cognome ed email sono obbligatori" });
    }

    const source = await getClientSourceById(idUtente);

    if (source === "clienti") {
      const { data, error } = await db
        .from("clienti")
        .update({
          nome,
          cognome,
          email,
          telefono: telefono || null,
          data_nascita: data_nascita || null
        })
        .or(`idCliente.eq.${idUtente},idUtente.eq.${idUtente},id.eq.${idUtente}`)
        .select("*")
        .limit(1);

      if (error) {
        throw error;
      }

      const cliente = normalizeClienteRow(Array.isArray(data) ? data[0] : data, "clienti");

      if (!cliente) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }

      return res.json(cliente);
    }

    const { data: existingUser, error: existingError } = await db
      .from("utenti")
      .select("idUtente")
      .eq("email", email)
      .neq("idUtente", idUtente)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingUser) {
      return res.status(400).json({ message: "Esiste gia un utente con questa email" });
    }

    const { data, error } = await db
      .from("utenti")
      .update({
        nome,
        cognome,
        email,
        telefono: telefono || null,
        data_nascita: data_nascita || null
      })
      .eq("idUtente", idUtente)
      .select("idUtente, nome, cognome, email, telefono, data_nascita, ruolo")
      .maybeSingle();

    if (error) {
      throw error;
    }

    const cliente = normalizeClienteRow(data, "utenti");

    if (!cliente || ["operatore", "admin", "salone"].includes(String(cliente.ruolo || "").toLowerCase())) {
      return res.status(404).json({ message: "Cliente non trovato" });
    }

    return res.json(cliente);
  } catch (err: any) {
    console.error("Errore PUT /clienti/:id:", err);
    return res.status(500).json({ message: err.message });
  }
});

router.delete("/clienti/:id", async (req: Request, res: Response) => {
  try {
    const idUtente = Number(req.params.id);

    if (!Number.isFinite(idUtente) || idUtente <= 0) {
      return res.status(400).json({ message: "Cliente non valido" });
    }

    const source = await getClientSourceById(idUtente);

    if (source === "clienti") {
      const { data, error } = await db
        .from("clienti")
        .delete()
        .or(`idCliente.eq.${idUtente},idUtente.eq.${idUtente},id.eq.${idUtente}`)
        .select("*")
        .limit(1);

      if (error) {
        throw error;
      }

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }

      return res.json({ message: "Cliente eliminato con successo" });
    }

    const { data, error } = await db
      .from("utenti")
      .delete()
      .eq("idUtente", idUtente)
      .select("idUtente, ruolo")
      .maybeSingle();

    if (error) {
      throw error;
    }

    const ruolo = String((data as any)?.ruolo ?? "").toLowerCase();

    if (!data || ["operatore", "admin", "salone"].includes(ruolo)) {
      return res.status(404).json({ message: "Cliente non trovato" });
    }

    return res.json({ message: "Cliente eliminato con successo" });
  } catch (err: any) {
    console.error("Errore DELETE /clienti/:id:", err);
    return res.status(500).json({ message: err.message });
  }
});

router.get("/operatori", async (_req: Request, res: Response) => {
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
export default router;
