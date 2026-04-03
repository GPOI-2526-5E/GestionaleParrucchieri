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
  isImageLoading = true;
  showImageZoom = false;
  isClosingImageZoom = false;
  zoomLensVisible = false;
  zoomLensX = 50;
  zoomLensY = 50;
  zoomLensImageWidth = 0;
  zoomLensImageHeight = 0;
  zoomLensImageOffsetX = 0;
  zoomLensImageOffsetY = 0;
  private readonly zoomScale = 1.35;
  private readonly zoomLensSize = 220;

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
  private imageZoomCloseTimeout: any;

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
        this.isImageLoading = !!p?.foto;
        this.showImageZoom = false;
        this.cdr.detectChanges();
      });
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.alertTimeout);
    clearTimeout(this.removeAlertTimeout);
    clearTimeout(this.errorTimeout);
    clearTimeout(this.imageZoomCloseTimeout);
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

  onImageLoad(): void {
    this.isImageLoading = false;
    this.cdr.detectChanges();
  }

  onImageError(): void {
    this.isImageLoading = false;
    this.cdr.detectChanges();
  }

  openImageZoom(): void {
    if (!this.product?.foto) return;
    clearTimeout(this.imageZoomCloseTimeout);
    this.showImageZoom = true;
    this.isClosingImageZoom = false;
    this.cdr.detectChanges();
  }

  closeImageZoom(): void {
    this.isClosingImageZoom = true;
    this.zoomLensVisible = false;
    this.cdr.detectChanges();

    clearTimeout(this.imageZoomCloseTimeout);
    this.imageZoomCloseTimeout = setTimeout(() => {
      this.showImageZoom = false;
      this.isClosingImageZoom = false;
      this.zoomLensX = 50;
      this.zoomLensY = 50;
      this.cdr.detectChanges();
    }, 240);
  }

  onZoomImageMove(event: MouseEvent): void {
    const target = event.target as HTMLImageElement;
    const rect = target.getBoundingClientRect();
    const naturalWidth = target.naturalWidth;
    const naturalHeight = target.naturalHeight;

    if (!rect.width || !rect.height || !naturalWidth || !naturalHeight) return;

    const localX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const localY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    const fitScale = Math.min(rect.width / naturalWidth, rect.height / naturalHeight);
    const renderedWidth = naturalWidth * fitScale;
    const renderedHeight = naturalHeight * fitScale;
    const offsetX = (rect.width - renderedWidth) / 2;
    const offsetY = (rect.height - renderedHeight) / 2;

    // Se il cursore e' nel padding creato da object-fit: contain,
    // non mostriamo la lente: evita mismatch soprattutto sui packshot verticali.
    if (
      localX < offsetX ||
      localX > offsetX + renderedWidth ||
      localY < offsetY ||
      localY > offsetY + renderedHeight
    ) {
      this.resetZoomImage();
      return;
    }

    const contentX = localX - offsetX;
    const contentY = localY - offsetY;
    const lensX = (localX / rect.width) * 100;
    const lensY = (localY / rect.height) * 100;
    const scaledWidth = renderedWidth * this.zoomScale;
    const scaledHeight = renderedHeight * this.zoomScale;

    this.zoomLensX = lensX;
    this.zoomLensY = lensY;
    this.zoomLensImageWidth = scaledWidth;
    this.zoomLensImageHeight = scaledHeight;
    this.zoomLensImageOffsetX = -((contentX * this.zoomScale) - this.zoomLensSize / 2);
    this.zoomLensImageOffsetY = -((contentY * this.zoomScale) - this.zoomLensSize / 2);
    this.zoomLensVisible = true;
    this.cdr.detectChanges();
  }

  resetZoomImage(): void {
    this.zoomLensVisible = false;
    this.zoomLensImageOffsetX = 0;
    this.zoomLensImageOffsetY = 0;
    this.cdr.detectChanges();
  }

  getZoomImageUrl(url?: string): string {
    if (!url) return '';

    if (/res\.cloudinary\.com/i.test(url) && /\/image\/upload\//i.test(url)) {
      return url
        .replace('/image/upload/e_trim/c_pad,w_900,h_900/', '/image/upload/e_trim/c_limit,w_1800,h_1800/')
        .replace('/image/upload/e_trim/c_pad,w_900,h_900', '/image/upload/e_trim/c_limit,w_1800,h_1800');
    }

    return url;
  }
}
