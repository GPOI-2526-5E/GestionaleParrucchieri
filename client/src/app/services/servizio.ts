import { Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Servizio {
  idServizio: number;
  nome: string;
  descrizione: string;
  durata: number;
  prezzo: number;
}

@Injectable({
  providedIn: 'root'
})
export class ServiziService {
  cart: WritableSignal<Servizio[]> = signal([]);
  private apiUrl = 'http://localhost:3000/api/servizi';

  constructor(private http: HttpClient) { }

  getServizi(): Observable<Servizio[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(servizi =>
        servizi.map(s => ({
          idServizio: s.idServizio ?? s.id,
          nome: s.nome,
          descrizione: s.descrizione,
          durata: s.durata,
          prezzo: Number(s.prezzo)
        }))
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
}