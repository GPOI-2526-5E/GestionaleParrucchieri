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

  showCartAlert: boolean = false;
  isClosing: boolean = false;
  cartAlertMessage: string = '';
  contProd: number = 0;

  private currentAlertProductId: number | null = null;
  private alertTimeout: ReturnType<typeof setTimeout> | null = null;
  private removeAlertTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private route: ActivatedRoute,
    private prodottoService: ProdottoService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.resetAlertState();

    const productId = Number(this.route.snapshot.paramMap.get('id'));

    if (!isNaN(productId)) {
      this.prodottoService.getProdottoById(productId).subscribe({
        next: (p) => {
          this.ngZone.run(() => {
            this.product = p;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.product = undefined;
            this.cdr.detectChanges();
          });
        }
      });
    } else {
      this.product = undefined;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    this.clearAlertTimers();
    this.resetAlertState();
  }

  private clearAlertTimers(): void {
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
      this.alertTimeout = null;
    }

    if (this.removeAlertTimeout) {
      clearTimeout(this.removeAlertTimeout);
      this.removeAlertTimeout = null;
    }
  }

  private resetAlertState(): void {
    this.showCartAlert = false;
    this.isClosing = false;
    this.cartAlertMessage = '';
    this.contProd = 0;
    this.currentAlertProductId = null;
  }

  addToCart(): void {
    if (!this.product) return;

    this.ngZone.run(() => {
      this.prodottoService.addProductToCart(this.product!);

      const sameProductAlertVisible =
        this.showCartAlert && this.currentAlertProductId === this.product!.id;

      this.showCartAlert = true;
      this.isClosing = false;
      this.currentAlertProductId = this.product!.id;
      this.cartAlertMessage = `${this.product!.nome} aggiunto al carrello`;

      if (sameProductAlertVisible) {
        this.contProd += 1;
      } else {
        this.contProd = 1;
      }

      this.clearAlertTimers();
      this.cdr.detectChanges();

      this.alertTimeout = setTimeout(() => {
        this.ngZone.run(() => {
          this.isClosing = true;
          this.cdr.detectChanges();

          this.removeAlertTimeout = setTimeout(() => {
            this.ngZone.run(() => {
              this.resetAlertState();
              this.cdr.detectChanges();
            });
          }, 320);
        });
      }, 2000);
    });
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }
}