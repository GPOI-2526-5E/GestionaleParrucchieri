import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { Router } from '@angular/router';

import { NavbarComponent } from '../../navbar.component/navbar.component';
import { AiChatDrawerComponent } from '../../ai-chat-drawer.component/ai-chat-drawer.component';
import { ProductCardComponent } from '../product-card.component/product-card.component';

import { Prodotto } from '../../../services/prodotto';
import { ProdottoService } from '../../../services/prodotto';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NavbarComponent,
    AiChatDrawerComponent,
    ProductCardComponent
  ],
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.css']
})
export class ProductsListComponent implements OnInit, OnDestroy {

  productsMD!: Observable<Prodotto[]>;

  selectedCategory: string = 'all';
  categories: string[] = [];
  isCategoryOpen: boolean = false;

  showCartAlert: boolean = false;
  isClosing: boolean = false;
  cartAlertMessage: string = '';

  private alertTimeout: ReturnType<typeof setTimeout> | null = null;
  private removeAlertTimeout: ReturnType<typeof setTimeout> | null = null;
  private productsSub?: Subscription;

  constructor(
    private prodottiService: ProdottoService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.productsMD = this.prodottiService.getProdotti();

    this.productsSub = this.productsMD.subscribe(products => {
      this.categories = [...new Set(products.map(p => p.categoria))];
    });
  }

  ngOnDestroy(): void {
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }

    if (this.removeAlertTimeout) {
      clearTimeout(this.removeAlertTimeout);
    }

    if (this.productsSub) {
      this.productsSub.unsubscribe();
    }
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

  onAddToCart(product: Prodotto): void {
    this.prodottiService.addProductToCart(product);

    this.cartAlertMessage = `${product.nome} aggiunto al carrello`;
    this.showCartAlert = true;
    this.isClosing = false;

    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }

    if (this.removeAlertTimeout) {
      clearTimeout(this.removeAlertTimeout);
    }

    this.cdr.detectChanges();

    this.alertTimeout = setTimeout(() => {
      this.isClosing = true;
      this.cdr.detectChanges();

      this.removeAlertTimeout = setTimeout(() => {
        this.showCartAlert = false;
        this.isClosing = false;
        this.cdr.detectChanges();
      }, 320);
    }, 2000);
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.custom-dropdown')) {
      this.isCategoryOpen = false;
    }
  }
}