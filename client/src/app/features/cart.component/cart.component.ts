import { Component, Signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { NavbarComponent } from '../navbar.component/navbar.component';

import { Prodotto } from '../../services/prodotto';
import { ProdottoService } from '../../services/prodotto';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css',
})
export class CartComponent {
  cartItems: Signal<Prodotto[]>;

  differentProductsCount = computed(() => this.cartItems().length);

  totalQuantity = computed(() =>
    this.cartItems().reduce((sum, item) => sum + (item.quantita || 1), 0)
  );

  finalTotal = computed(() =>
    this.cartItems().reduce(
      (sum, item) => sum + item.prezzo * (item.quantita || 1),
      0
    )
  );

  constructor(
    private prodottoService: ProdottoService,
    private authService: AuthService,
    private router: Router
  ) {
    this.cartItems = this.prodottoService.cart;
  }

  increase(id: number): void {
    const product = this.cartItems().find(item => item.idProdotto === id);

    if (!product) return;

    const quantitaAttuale = product.quantita || 1;
    const quantitaMassima = product.qta;

    if (quantitaAttuale < quantitaMassima) {
      this.prodottoService.increaseQuantity(id);
    }
  }

  decrease(id: number): void {
    const product = this.cartItems().find(item => item.idProdotto === id);

    if (!product) return;

    const quantitaAttuale = product.quantita || 1;

    if (quantitaAttuale > 1) {
      this.prodottoService.decreaseQuantity(id);
    }
  }

  removeFromCart(id: number): void {
    this.prodottoService.removeProductFromCart(id);
  }

  checkout(): void {
    const cart = this.cartItems();

    if (!cart || cart.length == 0) {
      alert('Il carrello è vuoto');
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    localStorage.setItem('cart_total', JSON.stringify(this.finalTotal()));
    console.log(cart);

    this.router.navigate(['/payment']);
  }

  trackById(index: number, item: Prodotto): number {
    return item.idProdotto;
  }
}
