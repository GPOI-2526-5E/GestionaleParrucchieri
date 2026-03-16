import { Component, Input } from '@angular/core';
import { Prodotto } from '../../../services/prodotto';
import { CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CurrencyPipe, RouterModule],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent {

  constructor() { }
  
  @Input() product!: Prodotto;

  addToCart() {
    console.log(`Aggiunto al carrello: ${this.product.nome}`);
  }
}