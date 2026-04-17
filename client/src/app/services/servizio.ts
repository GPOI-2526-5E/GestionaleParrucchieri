import { Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Servizio } from '../models/servizio.model';

@Injectable({
  providedIn: 'root'
})
export class ServiziService {
  cart: WritableSignal<Servizio[]> = signal([]);
  private apiUrl = 'http://localhost:3000/api/servizi';

  constructor(private http: HttpClient) { }

  private normalizeBookingType(raw: unknown): 'sito' | 'telefono' | 'consulenza' {
    const value = String(raw ?? '')
      .trim()
      .toLowerCase();

    if (value === 'telefono') return 'telefono';
    if (value === 'consulenza') return 'consulenza';
    return 'sito';
  }

  private normalizeText(raw: unknown): string {
    return String(raw ?? '').trim();
  }

  getServizi(): Observable<Servizio[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(servizi =>
        servizi.map(s => this.mapServizio(s))
      )
    );
  }

  getServiziPrenotabiliByOperatore(idOperatore: number): Observable<Servizio[]> {
    return this.http.get<any[]>(`${this.apiUrl}?idOperatore=${idOperatore}`).pipe(
      map(servizi =>
        servizi.map(s => this.mapServizio(s))
      )
    );
  }

  getServiceById(id: number): Observable<Servizio | undefined> {
    return this.getServizi().pipe(
      map(servizi => servizi.find(s => s.idServizio == id))
    );
  }

  addServiceToCart(serv: Servizio) {
    this.cart.update(curCart => [...curCart, serv]);
  }

  getCart(): Servizio[] {
    return this.cart();
  }

  getCartItemCount(): number {
    return this.cart().length;
  }

  clearCart(): void {
    this.cart.set([]);
  }

  removeServiceFromCart(serviceId: number | string): void {
    this.cart.update(curCart => curCart.filter(service => service.idServizio != serviceId));
  }

  private mapServizio(s: any): Servizio {
    return {
      idServizio: s.idServizio ?? s.id,
      nome: s.nome,
      descrizione: s.descrizione,
      durata: Number(s.durata),
      prezzo: Number(s.prezzo ?? s.prezzoRivendita ?? 0),
      categoria: this.normalizeText(
        s.categoria ?? s.Categoria
      ),
      sottocategoria: this.normalizeText(
        s['sottocategoria'] ?? s.sottoCategoria ?? s.sottocategoria_nome
      ),
      tipoPrenotazione: this.normalizeBookingType(
        s['tipo prenotazione'] ?? s.tipoPrenotazione ?? s.tipo_prenotazione ?? s.prenotazione
      )
    };
  }
}
