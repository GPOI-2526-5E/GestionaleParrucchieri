import { Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Prodotto {
  idProdotto: number;
  foto: string;
  nome: string;
  marca: string;
  formato: string;
  descrizione: string;
  prezzoRivendita: number;
  prezzoAcquisto: number;
  prezzo: number;
  qta: number;
  categoria: string;
  quantita?: number;
}

export interface CheckoutCustomerData {
  name: string;
  surname: string;
  email: string;
  phone: string;
  shippingMethod: string;
  shippingCost: number;
  address?: string;
  city?: string;
  zip?: string;
  lockerLabel?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProdottoService {

  private _cart: WritableSignal<Prodotto[]> = signal([]);
  cart = this._cart.asReadonly();

  private apiUrl = 'http://localhost:3000/api/prodotti';
  private apiBaseUrl = 'http://localhost:3000';

  private STORAGE_KEY = 'cart';

  constructor(private http: HttpClient) { this.loadCart(); }

  getProdotti(): Observable<Prodotto[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(prodotti =>
        prodotti.map(p => ({
          idProdotto: p.idProdotto ?? p.id,
          foto: this.buildImageUrl(p.foto),
          nome: p.nome,
          marca: p.marca ?? '',
          formato: p.formato ?? '',
          descrizione: p.descrizione,
          prezzoRivendita: Number(p.prezzoRivendita ?? p.prezzo ?? 0),
          prezzoAcquisto: Number(p.prezzoAcquisto ?? 0),
          // `prezzo` resta disponibile per i componenti che usano ancora il nome precedente.
          prezzo: Number(p.prezzoRivendita ?? p.prezzo ?? 0),
          qta: Number(p.quantitaMagazzino),
          categoria: p.categoria,
          quantita: 0
        }))
      )
    );
  }

  private buildImageUrl(foto?: string | null): string {
    if (!foto) {
      return '';
    }

    if (/^https?:\/\//i.test(foto)) {
      return this.normalizeCloudinaryImage(foto);
    }

    return `${this.apiBaseUrl}${foto.startsWith('/') ? '' : '/'}${foto}`;
  }

  private normalizeCloudinaryImage(url: string): string {
    if (!/res\.cloudinary\.com/i.test(url) || !/\/image\/upload\//i.test(url)) {
      return url;
    }

    // Uniforma il canvas dei packshot senza perdere il ritaglio del prodotto.
    return url.replace(
      '/image/upload/',
      '/image/upload/e_trim/c_pad,w_900,h_900/'
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

  completeCheckout(
    cartItems: Prodotto[],
    total: number,
    customer: CheckoutCustomerData
  ) {
    return this.http.post('http://localhost:3000/api/checkout/complete', {
      cartItems,
      total,
      customer
    });
  }
}
