import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../navbar.component/navbar.component';
import { AiChatDrawerComponent } from '../../ai-chat-drawer.component/ai-chat-drawer.component';
import { ProductCardComponent } from '../product-card.component/product-card.component';
import { Prodotto } from '../../../services/prodotto';
import { ProdottoService } from '../../../services/prodotto';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, AiChatDrawerComponent, ProductCardComponent],
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.css']
})
export class ProductsListComponent implements OnInit {

  productsMD!: Observable<Prodotto[]>;

  selectedCategory: string = 'all';
  categories: string[] = [];

  constructor(private prodottiService: ProdottoService) {}

  ngOnInit(): void {

    this.productsMD = this.prodottiService.getProdotti();

    this.productsMD.subscribe(products => {
      this.categories = [...new Set(products.map(p => p.categoria))];
    });

  }

  trackById(index: number, product: Prodotto) {
    return product.id;
  }
}