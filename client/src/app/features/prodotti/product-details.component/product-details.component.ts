import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../navbar.component/navbar.component';
import { AiChatDrawerComponent } from '../../ai-chat-drawer.component/ai-chat-drawer.component';
import { ProdottoService, Prodotto } from '../../../services/prodotto';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, NavbarComponent, AiChatDrawerComponent, RouterLink],
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.css']
})
export class ProductDetailsComponent implements OnInit {

  product: Prodotto | undefined;
  showAlert = false;

  constructor(
    private route: ActivatedRoute,
    private prodottoService: ProdottoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const productId = Number(this.route.snapshot.paramMap.get('id'));

    if (!isNaN(productId)) {
      this.prodottoService.getProdottoById(productId).subscribe({
        next: p => {
          this.product = p;
          this.cdr.detectChanges();
        },
        error: () => {
          this.product = undefined;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.product = undefined;
    }
  }

  addToCart(): void {
    if (!this.product) return;

    this.prodottoService.addProductToCart(this.product);

    this.showAlert = true;

    setTimeout(() => {
      this.showAlert = false;
    }, 2000);
  }
}