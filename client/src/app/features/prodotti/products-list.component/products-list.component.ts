import { Component, OnInit, HostListener } from '@angular/core';
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
  imports: [
    CommonModule,
    FormsModule,
    NavbarComponent,
    AiChatDrawerComponent,
    ProductCardComponent,
  ],
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.css']
})
export class ProductsListComponent implements OnInit {

  productsMD!: Observable<Prodotto[]>;

  selectedCategory: string = 'all';
  categories: string[] = [];

  isCategoryOpen: boolean = false;

  constructor(private prodottiService: ProdottoService) { }

  ngOnInit(): void {
    this.productsMD = this.prodottiService.getProdotti();

    this.productsMD.subscribe(products => {
      this.categories = [...new Set(products.map(p => p.categoria))];
    });
  }

  trackById(index: number, product: Prodotto): number {
    return product.id;
  }

  toggleCategoryDropdown(): void {
    this.isCategoryOpen = !this.isCategoryOpen;
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.isCategoryOpen = false;
  }

  getSelectedCategoryLabel(): string {
    return this.selectedCategory === 'all' ? 'Tutti' : this.selectedCategory;
  }

  onAddToCart(product: Prodotto) {
    this.prodottiService.addProductToCart(product);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.custom-dropdown')) {
      this.isCategoryOpen = false;
    }
  }
}