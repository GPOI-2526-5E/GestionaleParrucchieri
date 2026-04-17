export interface Servizio {
    idServizio: number;
    nome: string;
    descrizione: string;
    durata: number;
    prezzo: number;
    categoria: string;
    sottocategoria: string;
    tipoPrenotazione: 'sito' | 'telefono' | 'consulenza';
}
