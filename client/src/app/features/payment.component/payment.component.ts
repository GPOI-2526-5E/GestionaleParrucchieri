import { Component, Signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../navbar.component/navbar.component';
import { AiChatDrawerComponent } from '../ai-chat-drawer.component/ai-chat-drawer.component';
import { Prodotto } from '../../services/prodotto';
import { ProdottoService } from '../../services/prodotto';

@Component({
  selector: 'app-payment.component',
  imports: [CommonModule, NavbarComponent, AiChatDrawerComponent, RouterLink],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css',
})
export class PaymentComponent {

  cartItems: Prodotto[] = [];

  totalQuantity: number = 0;
  finalTotal: number = 0;

  constructor(private prodottoService: ProdottoService) { }

  ngOnInit(): void {
    const savedCart = localStorage.getItem('cart');

    if (savedCart) {
      this.cartItems = JSON.parse(savedCart);

      this.totalQuantity = this.cartItems.reduce(
        (sum, item) => sum + (item.quantita || 1),
        0
      );

      this.finalTotal = this.cartItems.reduce(
        (sum, item) => sum + item.prezzo * (item.quantita || 1),
        0
      );
    }
  }

  trackById(index: number, item: Prodotto): number {
    return item.id;
  }

  pay(): void {
    alert('Pagamento completato');

    localStorage.removeItem('cart');
    localStorage.removeItem('cart_total');
  }
}
