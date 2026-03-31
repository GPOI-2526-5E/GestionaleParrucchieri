import {
  Component,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  NgZone
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
export class ProductDetailsComponent implements OnInit, OnDestroy {
  product: Prodotto | undefined;

  // 🔴 ERROR ALERT
  showError = false;
  shakeAnimation = false;
  errorMessage = '';
  private errorTimeout: any;

  // 🛒 CART TOAST
  showCartAlert = false;
  isClosing = false;
  shakeCart = false;

  cartAlertMessage = '';
  contProd = 0;

  private currentAlertProductId: number | null = null;
  private alertTimeout: any;
  private removeAlertTimeout: any;

  constructor(
    private route: ActivatedRoute,
    private prodottoService: ProdottoService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    const productId = Number(this.route.snapshot.paramMap.get('id'));

    if (!isNaN(productId)) {
      this.prodottoService.getProdottoById(productId).subscribe(p => {
        this.product = p;
        this.cdr.detectChanges();
      });
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.alertTimeout);
    clearTimeout(this.removeAlertTimeout);
    clearTimeout(this.errorTimeout);
  }

  addToCart(): void {
    if (!this.product) return;

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((p: Prodotto) => p.idProdotto === this.product!.idProdotto);
    const qty = existing ? (existing.quantita || 1) : 0;

    if (qty >= this.product.qta) {
      this.showErrorAlert(
        `Limite massimo raggiunto (${this.product.qta})`
      );
      return;
    }

    // ✅ AGGIUNTA OK
    this.prodottoService.addProductToCart(this.product);

    const sameProduct =
      this.showCartAlert &&
      this.currentAlertProductId === this.product.idProdotto;

    this.showCartAlert = true;
    this.isClosing = false;
    this.currentAlertProductId = this.product.idProdotto;
    this.cartAlertMessage = `${this.product.nome} aggiunto`;

    this.contProd = sameProduct ? this.contProd + 1 : 1;

    // 🔥 SHAKE TOAST
    this.shakeCart = false;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.shakeCart = true;
      this.cdr.detectChanges();
    }, 10);

    clearTimeout(this.alertTimeout);

    this.alertTimeout = setTimeout(() => {
      this.ngZone.run(() => {
        this.isClosing = true;
        this.cdr.detectChanges();

        this.removeAlertTimeout = setTimeout(() => {
          this.ngZone.run(() => {
            this.showCartAlert = false;
            this.contProd = 0;
            this.cdr.detectChanges();
          });
        }, 300);
      });
    }, 2000);
  }

  showErrorAlert(msg: string) {
    this.ngZone.run(() => {
      this.errorMessage = msg;
      this.showError = true;

      // reset shake
      this.shakeAnimation = false;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.ngZone.run(() => {
          this.shakeAnimation = true;
          this.cdr.detectChanges();
        });
      }, 10);

      clearTimeout(this.errorTimeout);

      this.errorTimeout = setTimeout(() => {
        this.ngZone.run(() => {
          this.showError = false;
          this.cdr.detectChanges(); // 👈 QUESTO È IL FIX
        });
      }, 2500);
    });
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }
}