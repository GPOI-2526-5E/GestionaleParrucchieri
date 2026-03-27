export interface Utente {
    idUtente: number;
    nome: string;
    cognome: string;
    email: string;
    telefono?: string | null;
    data_nascita?: string | null;
    ruolo?: string;
  }