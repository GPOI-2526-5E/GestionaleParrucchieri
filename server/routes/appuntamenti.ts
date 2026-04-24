import { Router, Request, Response } from "express";
import { db } from "../db_parrucchieri";
import { verifyToken } from "../middleware/authMiddleware";
import {
  AppointmentMailService,
  AppointmentMailUser,
  sendAppointmentConfirmationEmail
} from "../services/appointment-email";

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

function isStaffRole(ruolo: unknown): boolean {
  return ruolo === "admin" || ruolo === "operatore";
}

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

router.get("/count", async (req: Request, res: Response) => {
  try {
    const data = (req.query.data as string)?.trim();

    if (!data) {
      return res.status(400).json({ message: "La data e obbligatoria" });
    }

    const startOfDay = `${data}T00:00:00`;
    const endOfDay = `${data}T23:59:59`;

    const { count, error } = await db
      .from("appuntamenti")
      .select("idAppuntamento", { count: "exact", head: true })
      .gte("dataOraInizio", startOfDay)
      .lte("dataOraInizio", endOfDay);

    if (error) {
      throw error;
    }

    return res.json({ totale: count ?? 0 });
  } catch (err: any) {
    console.error("Errore GET /appuntamenti/count:", err);
    return res.status(500).json({ message: err.message });
  }
});

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
      idServizio,
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

    const { data: cliente, error: clienteError } = await db
      .from("utenti")
      .select("idUtente, nome, cognome, email")
      .eq("idUtente", idCliente)
      .maybeSingle();

    if (clienteError) {
      throw clienteError;
    }

    if (!cliente?.email) {
      return res.status(400).json({
        message: "Email del cliente non disponibile"
      });
    }

    const { data: operatore, error: operatoreError } = await db
      .from("utenti")
      .select("idUtente, nome, cognome, email")
      .eq("idUtente", idOperatore)
      .maybeSingle();

    if (operatoreError) {
      throw operatoreError;
    }

    let servizio: AppointmentMailService | null = null;

    if (idServizio) {
      const { data: servizioData, error: servizioError } = await db
        .from("servizi")
        .select("idServizio, nome, prezzo")
        .eq("idServizio", idServizio)
        .maybeSingle();

      if (servizioError) {
        throw servizioError;
      }

      servizio = (servizioData as AppointmentMailService | null) ?? null;
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

    if (idServizio) {
      const appointmentId = Number((data as Appuntamento).idAppuntamento);

      if (Number.isFinite(appointmentId) && appointmentId > 0) {
        const { error: relationError } = await db
          .from("appuntamentiservizi")
          .insert({
            idAppuntamento: appointmentId,
            idServizio
          });

        if (relationError) {
          console.error("Errore salvataggio relazione appuntamento-servizio:", relationError);
        }
      }
    }

    try {
      await sendAppointmentConfirmationEmail({
        cliente: cliente as AppointmentMailUser,
        operatore: (operatore as AppointmentMailUser | null) ?? null,
        servizio: servizio ?? (note ? { idServizio: Number(idServizio || 0), nome: String(note) } : null),
        dataOraInizio,
        dataOraFine: normalizedEndDateTime
      });
    } catch (mailError) {
      console.error("Errore invio mail conferma appuntamento:", mailError);
    }

    return res.status(201).json(data as Appuntamento);
  } catch (err: any) {
    console.error("Errore POST /appuntamenti:", err);
    return res.status(500).json({ message: err.message });
  }
});

router.put("/:idAppuntamento", verifyToken, async (req: any, res: Response) => {
  try {
    const idAppuntamento = parseInt(req.params.idAppuntamento, 10);
    const userId = req.user?.userId;
    const userRole = req.user?.ruolo;

    if (isNaN(idAppuntamento)) {
      return res.status(400).json({ message: "idAppuntamento non valido" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Utente non autenticato" });
    }

    const { data: existingAppointment, error: existingAppointmentError } = await db
      .from("appuntamenti")
      .select("idAppuntamento, idCliente, idOperatore, dataOraInizio, dataOraFine, stato, note")
      .eq("idAppuntamento", idAppuntamento)
      .maybeSingle();

    if (existingAppointmentError) {
      throw existingAppointmentError;
    }

    if (!existingAppointment) {
      return res.status(404).json({ message: "Appuntamento non trovato" });
    }

    const canManageAllAppointments = isStaffRole(userRole);
    const isAppointmentOwner = existingAppointment.idCliente === userId;

    if (!canManageAllAppointments && !isAppointmentOwner) {
      return res.status(403).json({ message: "Non autorizzato a modificare questo appuntamento" });
    }

    const appointmentStart = new Date(existingAppointment.dataOraInizio);
    const todayStart = startOfDay(new Date());
    const appointmentDayStart = startOfDay(appointmentStart);

    if (appointmentDayStart <= todayStart) {
      return res.status(409).json({
        message: "La modifica e consentita solo fino al giorno prima dell'appuntamento"
      });
    }

    const nextStart = req.body?.dataOraInizio || existingAppointment.dataOraInizio;
    const nextEnd = req.body?.dataOraFine || existingAppointment.dataOraFine;
    const normalizedEndDateTime = normalizeEndDateTime(nextStart, nextEnd);

    const { data: overlappingAppointments, error: overlappingAppointmentsError } = await db
      .from("appuntamenti")
      .select("idAppuntamento")
      .eq("idOperatore", existingAppointment.idOperatore)
      .neq("idAppuntamento", idAppuntamento)
      .lt("dataOraInizio", normalizedEndDateTime)
      .gt("dataOraFine", nextStart)
      .limit(1);

    if (overlappingAppointmentsError) {
      throw overlappingAppointmentsError;
    }

    if ((overlappingAppointments || []).length > 0) {
      return res.status(409).json({
        message: "L'operatore non e disponibile per tutta la durata del servizio selezionato"
      });
    }

    const updatePayload = {
      dataOraInizio: nextStart,
      dataOraFine: normalizedEndDateTime,
      stato: req.body?.stato || existingAppointment.stato || "prenotato",
      note: req.body?.note ?? null
    };

    const { data, error } = await db
      .from("appuntamenti")
      .update(updatePayload)
      .eq("idAppuntamento", idAppuntamento)
      .select("idAppuntamento, idCliente, idOperatore, dataOraInizio, dataOraFine, stato, note")
      .single();

    if (error) {
      throw error;
    }

    return res.json(data as Appuntamento);
  } catch (err: any) {
    console.error("Errore PUT /appuntamenti/:idAppuntamento:", err);
    return res.status(500).json({ message: err.message });
  }
});

router.delete("/:idAppuntamento", verifyToken, async (req: any, res: Response) => {
  try {
    const idAppuntamento = parseInt(req.params.idAppuntamento, 10);
    const userId = req.user?.userId;
    const userRole = req.user?.ruolo;

    if (isNaN(idAppuntamento)) {
      return res.status(400).json({ message: "idAppuntamento non valido" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Utente non autenticato" });
    }

    const { data: appointment, error: appointmentError } = await db
      .from("appuntamenti")
      .select("idAppuntamento, idCliente, dataOraInizio")
      .eq("idAppuntamento", idAppuntamento)
      .maybeSingle();

    if (appointmentError) {
      throw appointmentError;
    }

    if (!appointment) {
      return res.status(404).json({ message: "Appuntamento non trovato" });
    }

    const canManageAllAppointments = isStaffRole(userRole);
    const isAppointmentOwner = appointment.idCliente === userId;

    if (!canManageAllAppointments && !isAppointmentOwner) {
      return res.status(403).json({ message: "Non autorizzato a eliminare questo appuntamento" });
    }

    const appointmentStart = new Date(appointment.dataOraInizio);
    const todayStart = startOfDay(new Date());
    const appointmentDayStart = startOfDay(appointmentStart);

    if (appointmentDayStart <= todayStart) {
      return res.status(409).json({
        message: "L'eliminazione e consentita solo fino al giorno prima dell'appuntamento"
      });
    }

    const { error } = await db
      .from("appuntamenti")
      .delete()
      .eq("idAppuntamento", idAppuntamento);

    if (error) {
      throw error;
    }

    return res.json({ message: "Appuntamento eliminato con successo" });
  } catch (err: any) {
    console.error("Errore DELETE /appuntamenti/:idAppuntamento:", err);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
