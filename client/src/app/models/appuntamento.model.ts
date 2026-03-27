export interface Appuntamento {
    idAppuntamento: number;
    idCliente: number;
    idOperatore: number;
    dataOraInizio: string;
    dataOraFine: string;
    stato: string;
    note: string | null;
  }