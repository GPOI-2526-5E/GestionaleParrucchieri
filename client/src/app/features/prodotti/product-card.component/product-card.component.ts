import { Component, EventEmitter, Input, Output, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';

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
export class ProductCardComponent implements OnChanges {

  @Input() product!: Prodotto;
  @Output() addProductToCart = new EventEmitter<Prodotto>();

  imageUnavailable = false;
  showError = false;
  shakeAnimation = false;
  errorMessage = '';
  private alertTimeout: any;

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['product']) {
      this.imageUnavailable = false;
    }
  }

  get hasProductImage(): boolean {
    return !!this.product?.foto?.trim() && !this.imageUnavailable;
  }

  onImageError() {
    this.imageUnavailable = true;
  }

  addToCart() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');

    const existingProduct = cart.find((p: Prodotto) => p.idProdotto === this.product.idProdotto);

    const currentQuantity = existingProduct ? (existingProduct.quantita || 1) : 0;

    if (currentQuantity >= this.product.qta) {
      this.showAlert(
        `Limite massimo raggiunto per ${this.product.nome}: ${this.product.qta} disponibili`
      );
      return;
    }

    this.addProductToCart.emit(this.product);
  }

  showAlert(message: string) {
    this.errorMessage = message;
    this.showError = true;

    this.shakeAnimation = false;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.shakeAnimation = true;
      this.cdr.detectChanges();
    }, 10);

    clearTimeout(this.alertTimeout);

    this.alertTimeout = setTimeout(() => {
      this.showError = false;
      this.cdr.detectChanges();
    }, 2500);
  }
}
