import { Component, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { NavbarComponent } from '../navbar.component/navbar.component';
import { AiChatDrawerComponent } from '../ai-chat-drawer.component/ai-chat-drawer.component';
import { Prodotto } from '../../services/prodotto';
import { ProdottoService } from '../../services/prodotto';
import { LockerService, LockerOption } from '../../services/locker';

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/marker-icon-2x-red.png',
  iconUrl: 'assets/marker-icon-red.png',
  shadowUrl: 'assets/marker-shadow.png',
});

@Component({
  selector: 'app-payment.component',
  standalone: true,
  imports: [CommonModule, NavbarComponent, AiChatDrawerComponent, RouterLink, FormsModule],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css',
})
export class PaymentComponent implements AfterViewChecked {

  cartItems: Prodotto[] = [];
  totalQuantity: number = 0;
  subtotal: number = 0;
  finalTotal: number = 0;

  shippingMethod: string = 'standard';
  shippingCost: number = 0;

  @ViewChild('mapContainer') mapContainer!: ElementRef;
  map!: L.Map;
  mapInitialized = false;

  lockers: LockerOption[] = [];
  selectedLocker: LockerOption | null = null;

  constructor(
    private prodottoService: ProdottoService,
    private lockerService: LockerService
  ) { }

  ngOnInit(): void {
    const savedCart = localStorage.getItem('cart');

    if (savedCart) {
      this.cartItems = JSON.parse(savedCart);

      this.totalQuantity = this.cartItems.reduce(
        (sum, item) => sum + (item.quantita || 1),
        0
      );

      this.subtotal = this.cartItems.reduce(
        (sum, item) => sum + item.prezzo * (item.quantita || 1),
        0
      );

      this.updateTotal();
    }
  }

  ngAfterViewChecked() {
    if (
      this.shippingMethod === 'locker' &&
      !this.mapInitialized &&
      this.mapContainer
    ) {
      this.initMap();
      this.loadLockers();

      setTimeout(() => {
        this.map.invalidateSize();
      }, 200);

      this.mapInitialized = true;
    }
  }

  initMap() {
    if (this.map) return;

    if (!this.mapContainer?.nativeElement) {
      console.error('Map container non pronto');
      return;
    }

    this.map = L
      .map(this.mapContainer.nativeElement)
      .setView([44.55, 7.72], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);
  }

  loadLockers() {
    if (!this.map) return;

    (window as any).selectLockerFromMap = (lockerId: string) => {
      const locker = this.lockers.find(l => l.id === lockerId);
      if (locker) {
        this.selectedLocker = locker;
      }
    };

    this.lockerService.getLockersAroundFossano().subscribe(lockers => {
      this.lockers = lockers;

      lockers.forEach(locker => {
        const marker = L.marker([locker.lat, locker.lng])
          .addTo(this.map)
          .bindPopup(`
          <div style="min-width:180px">
            <strong>${locker.name}</strong><br>
            ${locker.address}<br>
            ${locker.city}<br><br>

            <button 
              onclick="selectLockerFromMap('${locker.id}')"
              style="
                background:#d4af37;
                color:black;
                border:none;
                padding:6px 10px;
                border-radius:6px;
                cursor:pointer;
                width:100%;
                font-weight:600;
              "
            >
              Seleziona
            </button>
          </div>
        `);
      });
    });
  }

  onShippingChange() {
    switch (this.shippingMethod) {
      case 'express':
        this.shippingCost = 9.99;
        break;
      case 'standard':
        this.shippingCost = 4.99;
        break;
      default:
        this.shippingCost = 0;
    }

    this.updateTotal();

    if (this.shippingMethod !== 'locker') {
      this.mapInitialized = false;

      if (this.map) {
        this.map.remove();
        this.map = undefined as any;
      }
    }
  }

  updateTotal() {
    this.finalTotal = this.subtotal + this.shippingCost;
  }

  trackById(index: number, item: Prodotto): number {
    return item.id;
  }

  pay(): void {
    if (this.shippingMethod === 'locker' && !this.selectedLocker) {
      alert('Seleziona un locker dalla mappa');
      return;
    }

    alert('Pagamento completato');

    localStorage.removeItem('cart');
    localStorage.removeItem('cart_total');
  }
}