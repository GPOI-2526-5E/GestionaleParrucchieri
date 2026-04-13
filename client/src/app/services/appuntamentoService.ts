import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Appuntamento } from '../models/appuntamento.model';

export interface CreaAppuntamentoPayload {
  idCliente: number;
  idOperatore: number | null;
  idServizio: number | null;
  dataOraInizio: string;
  dataOraFine: string;
}

@Injectable({
  providedIn: 'root',
})
export class AppuntamentoService {
  private api = 'http://localhost:3000/api/appuntamenti';

  constructor(private http: HttpClient) {}

  getAppuntamenti(idOperatore: number): Observable<Appuntamento[]> {
    return this.http
      .get<{ appuntamenti: Appuntamento[] }>(`${this.api}?idOperatore=${idOperatore}`)
      .pipe(map((res) => res.appuntamenti));
  }

  creaAppuntamento(appuntamento: CreaAppuntamentoPayload): Observable<Appuntamento> {
    return this.http.post<Appuntamento>(this.api, appuntamento);
  }
}
