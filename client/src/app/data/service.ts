import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Servizio {
  id: number;
  nome: string;
  descrizione: string;
  durata: number;
  prezzo: number;
}

@Injectable({
  providedIn: 'root'
})
export class ServiziService {

  private apiUrl = 'http://localhost:3000/api/servizi';

  constructor(private http: HttpClient) {}

  getServizi(): Observable<Servizio[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(servizi =>
        servizi.map(s => ({
          id: s.idServizio,
          nome: s.nome,
          descrizione: s.descrizione,
          durata: s.durata,
          prezzo: Number(s.prezzo),
        }))
      )
    );
  }
}