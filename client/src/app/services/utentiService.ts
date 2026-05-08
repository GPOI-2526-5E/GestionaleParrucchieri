import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Utente } from '../models/utente.model';

@Injectable({
  providedIn: 'root',
})


export class UtentiService {
  constructor(
    private http: HttpClient,
    private router: Router
  ) {}
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
}
