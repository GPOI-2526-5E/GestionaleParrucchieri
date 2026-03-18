import { Component, Signal, computed } from '@angular/core';
import { NavbarComponent } from '../navbar.component/navbar.component';
import { AiChatDrawerComponent } from '../ai-chat-drawer.component/ai-chat-drawer.component';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Prodotto } from '../../services/prodotto';
import { ProdottoService } from '../../services/prodotto';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, NavbarComponent, AiChatDrawerComponent, RouterLink],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css',
})
export class CartComponent {

  cartItems: Signal<Prodotto[]>;
  cartTotal: Signal<number>;
  showSuccessMessage = false;

  constructor(private prodottoService: ProdottoService, private router: Router) {

    this.cartItems = this.prodottoService.cart;

    this.cartTotal = computed(() =>
      this.cartItems().reduce((sum, item) =>
        sum + item.prezzo * (item.quantita || 1), 0
      )
    );
  }

  increase(id: number) {
    this.prodottoService.increaseQuantity(id);
  }

  decrease(id: number) {
    this.prodottoService.decreaseQuantity(id);
  }

  removeFromCart(id: number) {
    this.prodottoService.removeProductFromCart(id);
  }

  checkout() {
  //   this.prodottoService.clearCart();
  //   this.showSuccessMessage = true;

  //   setTimeout(() => {
  //     this.showSuccessMessage = false;
  //     this.router.navigate(['/home']);
  //   }, 3000);
    alert('pagato');
  }
}