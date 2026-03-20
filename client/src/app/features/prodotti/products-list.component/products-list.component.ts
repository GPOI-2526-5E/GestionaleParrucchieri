import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectorRef,
  ApplicationRef
} from '@angular/core';
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

  currentAlertProductId: number | null = null;
  contProd: number = 0;

  private alertTimeout: ReturnType<typeof setTimeout> | null = null;
  private removeAlertTimeout: ReturnType<typeof setTimeout> | null = null;
  private productsSub?: Subscription;

  constructor(
    private prodottiService: ProdottoService,
    private cdr: ChangeDetectorRef,
    private appRef: ApplicationRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.productsMD = this.prodottiService.getProdotti();

    this.productsSub = this.productsMD.subscribe(products => {
      this.categories = [...new Set(products.map(p => p.categoria))];
      this.forceUiUpdate();
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

  private forceUiUpdate(): void {
    this.cdr.detectChanges();
    this.appRef.tick();

    requestAnimationFrame(() => {
      this.cdr.detectChanges();
    });
  }

  trackById(index: number, product: Prodotto): number {
    return product.id;
  }

  toggleCategoryDropdown(): void {
    this.isCategoryOpen = !this.isCategoryOpen;
    this.forceUiUpdate();
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.isCategoryOpen = false;
    this.forceUiUpdate();
  }

  getSelectedCategoryLabel(): string {
    return this.selectedCategory === 'all' ? 'Tutti' : this.selectedCategory;
  }

  onAddToCart(product: Prodotto): void {
    this.prodottiService.addProductToCart(product);

    const sameProductAlertVisible =
      this.showCartAlert && this.currentAlertProductId === product.id;

    this.showCartAlert = true;
    this.isClosing = false;
    this.currentAlertProductId = product.id;
    this.cartAlertMessage = `${product.nome} aggiunto al carrello`;

    if (sameProductAlertVisible) {
      this.contProd += 1;
    } else {
      this.contProd = 1;
    }

    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }

    if (this.removeAlertTimeout) {
      clearTimeout(this.removeAlertTimeout);
    }

    this.forceUiUpdate();

    this.alertTimeout = setTimeout(() => {
      this.isClosing = true;
      this.forceUiUpdate();

      this.removeAlertTimeout = setTimeout(() => {
        this.showCartAlert = false;
        this.isClosing = false;
        this.contProd = 0;
        this.currentAlertProductId = null;
        this.forceUiUpdate();
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
      this.forceUiUpdate();
    }
  }
}