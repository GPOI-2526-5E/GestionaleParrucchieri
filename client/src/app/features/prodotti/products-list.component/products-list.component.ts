import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../navbar.component/navbar.component';
import { AiChatDrawerComponent } from '../../ai-chat-drawer.component/ai-chat-drawer.component';
import { ProductCardComponent } from '../product-card.component/product-card.component';
import { Prodotto } from '../../../services/prodotto';
import { ProdottoService } from '../../../services/prodotto';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CommonModule, NavbarComponent, AiChatDrawerComponent, ProductCardComponent],
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.css']
})
export class ProductsListComponent {

  productsMD!: Observable<Prodotto[]>;

  constructor(private prodottiService: ProdottoService) { }

  ngOnInit(): void {
    this.productsMD = this.prodottiService.getProdotti();
  }

  trackById(index: number, product: Prodotto) {
    return product.id;
  }
}