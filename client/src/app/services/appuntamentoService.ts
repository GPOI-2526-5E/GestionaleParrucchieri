import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Appuntamento } from '../models/appuntamento.model';

@Injectable({
  providedIn: 'root',
})
export class AppuntamentoService {
  private api = 'http://localhost:3000/api/appuntamenti';

  constructor(private http: HttpClient) {}

  getAppuntamenti(idOperatore: number): Observable<Appuntamento[]> {
    return this.http.get<{ appuntamenti: Appuntamento[] }>(`${this.api}?idOperatore=${idOperatore}`)
      .pipe(
        map(res => res.appuntamenti)
      );
  }
}
