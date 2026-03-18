import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Prodotto } from '../../../services/prodotto';
import { CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CurrencyPipe, RouterModule, CommonModule],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent {

  @Input() product!: Prodotto;

  @Output() addProductToCart = new EventEmitter<Prodotto>();

  constructor() { }

  addToCart() {
    console.log(`Aggiunto al carrello: ${this.product.nome}`);
    this.addProductToCart.emit(this.product);
  }
}