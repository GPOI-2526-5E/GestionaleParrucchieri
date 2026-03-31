import { Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Prodotto {
  idProdotto: number;
  foto: string;
  nome: string;
  descrizione: string;
  prezzo: number;
  qta: number;
  categoria: string;
  quantita?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProdottoService {

  private _cart: WritableSignal<Prodotto[]> = signal([]);
  cart = this._cart.asReadonly();

  private apiUrl = 'http://localhost:3000/api/prodotti';

  private STORAGE_KEY = 'cart';

  constructor(private http: HttpClient) { this.loadCart(); }

  getProdotti(): Observable<Prodotto[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(prodotti =>
        prodotti.map(p => ({
          idProdotto: p.idProdotto ?? p.id,
          foto: p.foto,
          nome: p.nome,
          descrizione: p.descrizione,
          prezzo: Number(p.prezzo),
          qta: Number(p.quantitaMagazzino),
          categoria: p.categoria,
          quantita: 0
        }))
      )
    );
  }

  private loadCart() {
    const data = localStorage.getItem(this.STORAGE_KEY);

    if (data) {
      this._cart.set(JSON.parse(data));
    }
  }

  private saveCart() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._cart()));
  }

  getProdottoById(id: number): Observable<Prodotto | undefined> {
    return this.getProdotti().pipe(
      map(prodotti => prodotti.find(p => p.idProdotto == id))
    );
  }

  addProductToCart(prod: Prodotto) {
    this._cart.update(cart => {
      const existing = cart.find(p => p.idProdotto === prod.idProdotto);
      if (existing) {
        return cart.map(p =>
          p.idProdotto === prod.idProdotto
            ? { ...p, quantita: (p.quantita || 1) + 1 }
            : p
        );
      }
      return [...cart, { ...prod, quantita: 1 }];
    });
    this.saveCart();
  }

  increaseQuantity(productId: number) {
    this._cart.update(cart =>
      cart.map(p =>
        p.idProdotto === productId
          ? { ...p, quantita: (p.quantita || 1) + 1 }
          : p
      )
    );
    this.saveCart();
  }

  decreaseQuantity(productId: number) {
    this._cart.update(cart =>
      cart
        .map(p =>
          p.idProdotto === productId
            ? { ...p, quantita: (p.quantita || 1) - 1 }
            : p
        )
        .filter(p => (p.quantita || 1) > 0)
    );
    this.saveCart();
  }

  removeProductFromCart(productId: number | string): void {
    this._cart.update(cart =>
      cart.filter(product => product.idProdotto != productId)
    );
    this.saveCart();
  }

  clearCart(): void {
    this._cart.set([]);
    this.saveCart();
  }

  getCart(): Prodotto[] {
    return this._cart();
  }

  getCartItemCount(): number {
    return this._cart().reduce((sum, p) => sum + (p.quantita || 1), 0);
  }

  getCartTotal(): number {
    return this._cart().reduce(
      (sum, p) => sum + p.prezzo * (p.quantita || 1),
      0
    );
  }

  updateStock(cartItems: Prodotto[]) {
    return this.http.post('http://localhost:3000/api/products/update-stock', cartItems);
  }
}