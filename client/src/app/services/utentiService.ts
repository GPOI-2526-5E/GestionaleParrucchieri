import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Utente } from '../models/utente.model';

@Injectable({
  providedIn: 'root',
})


export class UtentiService {
  constructor(private http: HttpClient) {}
  private api = 'http://localhost:3000/api/utenti';

  getOperatori(): Observable<Utente[]> {
    return this.http.get<{ operatori: Utente[] }>(
      `${this.api}/operatori`
    ).pipe(
      map(res => res.operatori)
    );
  }

  getClienti(): Observable<Utente[]> {
    return this.http.get<{ clienti: Utente[] }>(
      `${this.api}/clienti`
    ).pipe(
      map(res => res.clienti)
    );
  }

  updateCliente(idUtente: number, cliente: Partial<Utente>): Observable<Utente> {
    return this.http.put<Utente>(`${this.api}/clienti/${idUtente}`, cliente);
  }

  deleteCliente(idUtente: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/clienti/${idUtente}`);
  }
}
