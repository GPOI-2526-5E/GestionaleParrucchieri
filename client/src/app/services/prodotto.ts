import { Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Prodotto {
  id: number;
  foto: string;
  nome: string;
  descrizione: string;
  prezzo: number;
  qta: number;
  categoria: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProdottoService {
  cart: WritableSignal<Prodotto[]> = signal([]);
  private apiUrl = 'http://localhost:3000/api/prodotti';

  constructor(private http: HttpClient) { }

  getProdotti(): Observable<Prodotto[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(prodotti =>
        prodotti.map(p => ({
          id: p.idProdotto ?? p.id,
          foto: p.foto,
          nome: p.nome,
          descrizione: p.descrizione,
          prezzo: Number(p.prezzo),
          qta: Number(p.quantitaMagazzino),
          categoria: p.categoria
        }))
      )
    );
  }

  getProdottoById(id: number): Observable<Prodotto | undefined> {
    return this.getProdotti().pipe(
      map(prodotti => prodotti.find(p => p.id == id))
    );
  }

  addProductToCart(prod: Prodotto) {
    this.cart.update(curCart => [...curCart, prod]);
  }

  getCart(): Prodotto[] {
    return this.cart();
  }

  getCartItemCount(): number {
    return this.cart().length;
  }

  clearCart(): void {
    this.cart.set([]);
  }

  removeProductFromCart(productId: number | string): void {
    this.cart.update(curCart => curCart.filter(product => product.id != productId));
  }
}