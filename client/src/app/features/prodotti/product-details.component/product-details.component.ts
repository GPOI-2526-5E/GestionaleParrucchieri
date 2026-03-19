import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
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
export class ProductDetailsComponent implements OnInit {

  product: Prodotto | undefined;
  showAlert = false;
  isClosing = false;

  contProd: number = 1;

  constructor(
    private route: ActivatedRoute,
    private prodottoService: ProdottoService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

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
    this.isClosing = false;

    // Se l'alert è già visibile, incremento il contatore
    this.contProd = this.showAlert && this.contProd > 0 ? this.contProd + 1 : 1;

    this.cdr.detectChanges();

    // Timer per chiudere alert
    setTimeout(() => {
      this.isClosing = true;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.showAlert = false;
        this.isClosing = false;
        this.contProd = 0; // reset
        this.cdr.detectChanges();
      }, 350);
    }, 2500);
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }
}