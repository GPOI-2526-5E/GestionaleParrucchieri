import nodemailer from "nodemailer";

export interface AppointmentMailUser {
  idUtente: number;
  nome: string;
  cognome: string;
  email: string;
}

export interface AppointmentMailService {
  idServizio: number;
  nome: string;
  prezzo?: number | null;
}

export interface AppointmentMailPayload {
  cliente: AppointmentMailUser;
  operatore: AppointmentMailUser | null;
  servizio: AppointmentMailService | null;
  dataOraInizio: string;
  dataOraFine: string;
}

function formatAppointmentDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function createTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    throw new Error("Configurazione SMTP incompleta");
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
}

function buildAppointmentInfoBlock(params: AppointmentMailPayload): string {
  const servizioLabel = params.servizio?.nome || "Servizio prenotato";
  const operatoreLabel = params.operatore
    ? `${params.operatore.nome} ${params.operatore.cognome}`
    : "Operatore assegnato";

  return `
    <div style="margin:0 0 18px;padding:18px;border:1px solid #efc983;border-radius:16px;background:#fbf3e3;">
      <div style="margin:0 0 8px;font-size:14px;color:#c08612;font-weight:700;">Dettagli appuntamento</div>
      <div style="font-size:15px;line-height:1.8;color:#1a1a1a;">
        <div><strong>Servizio:</strong> ${servizioLabel}</div>
        <div><strong>Operatore:</strong> ${operatoreLabel}</div>
        <div><strong>Inizio:</strong> ${formatAppointmentDateTime(params.dataOraInizio)}</div>
        <div><strong>Fine:</strong> ${formatAppointmentDateTime(params.dataOraFine)}</div>
      </div>
    </div>
  `;
}

function wrapMailContent(title: string, badge: string, greeting: string, intro: string, detailsBlock: string, footerCopy: string) {
  return `
    <div style="margin:0;padding:32px 18px;background:#f6f0e6;font-family:Arial,sans-serif;color:#16120d;">
      <div style="max-width:760px;margin:0 auto;text-align:center;">
        <div style="margin:0 auto 14px;width:234px;background:#1b1610;border-radius:16px;padding:18px 22px;box-sizing:border-box;">
          <img
            src="https://res.cloudinary.com/duimlq34k/image/upload/v1776668316/logo-parrucchieri-oro-bianco_jkgk5v.png"
            alt="I Parrucchieri"
            style="display:block;width:100%;height:auto;border:0;"
          />
        </div>

        <div style="margin:0 auto;max-width:718px;background:#ffffff;border:1px solid #e2c89b;border-radius:20px;padding:24px 34px 22px;text-align:left;box-sizing:border-box;">
          <div style="display:inline-block;margin-bottom:8px;padding:6px 12px;border:1px solid #e5c37d;border-radius:999px;background:#f8f2e8;color:#b67a08;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
            ${badge}
          </div>

          <h1 style="margin:0 0 10px;font-size:30px;line-height:1.2;color:#101010;font-weight:800;">
            ${title}
          </h1>

          <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#1a1a1a;">
            ${greeting}
          </p>

          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#1a1a1a;">
            ${intro}
          </p>

          ${detailsBlock}

          <p style="margin:0;font-size:14px;line-height:1.7;color:#3a3126;">
            ${footerCopy}
          </p>
        </div>

        <div style="padding-top:14px;text-align:center;color:#8b7555;">
          <div style="font-size:13px;line-height:1.5;">I Parrucchieri, Fossano</div>
          <div style="font-size:11px;line-height:1.6;">Questa e una comunicazione automatica relativa al tuo appuntamento.</div>
        </div>
      </div>
    </div>
  `;
}

async function sendMail(to: string, subject: string, html: string) {
  const smtpFrom = process.env.SMTP_FROM;

  if (!smtpFrom) {
    throw new Error("SMTP_FROM non configurato");
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"I Parrucchieri" <${smtpFrom}>`,
    to,
    subject,
    html
  });
}

export async function sendAppointmentConfirmationEmail(params: AppointmentMailPayload) {
  const html = wrapMailContent(
    "La tua prenotazione e confermata",
    "Conferma Appuntamento",
    `Ciao ${params.cliente.nome} ${params.cliente.cognome},`,
    `abbiamo registrato con successo il tuo appuntamento presso <strong>I Parrucchieri</strong>.`,
    buildAppointmentInfoBlock(params),
    "Se hai bisogno di modificare la prenotazione, contattaci con anticipo."
  );

  await sendMail(params.cliente.email, "Conferma appuntamento", html);
}

export async function sendAppointmentReminderEmail(params: AppointmentMailPayload) {
  const html = wrapMailContent(
    "Promemoria appuntamento di domani",
    "Reminder 24 Ore",
    `Ciao ${params.cliente.nome} ${params.cliente.cognome},`,
    `ti ricordiamo che domani hai un appuntamento prenotato presso <strong>I Parrucchieri</strong>.`,
    buildAppointmentInfoBlock(params),
    "Ti aspettiamo in salone. Se hai bisogno di modificare la prenotazione, contattaci appena possibile."
  );

  await sendMail(params.cliente.email, "Promemoria appuntamento di domani", html);
}
