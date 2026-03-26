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
import { ChangeDetectorRef } from '@angular/core';

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

  name: string = '';
  surname: string = '';
  email: string = '';
  phone: string = '';
  cardName: string = '';
  cardNumber: string = '';
  expiry: string = '';
  cvv: string = '';

  address: string = '';
  city: string = '';
  zip: string = '';

  isProcessing: boolean = false;
  paymentSuccess: boolean = false;

  @ViewChild('mapContainer') mapContainer!: ElementRef;
  map!: L.Map;
  mapInitialized = false;

  lockers: LockerOption[] = [];
  selectedLocker: LockerOption | null = null;

  constructor(
    private prodottoService: ProdottoService,
    private lockerService: LockerService,
    private cdr: ChangeDetectorRef
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

  isValidName(): boolean {
    return /^[a-zA-ZàèéìòùÀÈÉÌÒÙ\s]{2,}$/.test(this.name.trim());
  }

  isValidSurname(): boolean {
    return /^[a-zA-ZàèéìòùÀÈÉÌÒÙ\s]{2,}$/.test(this.surname.trim());
  }

  isValidEmail(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email);
  }

  isValidPhone(): boolean {
    return /^[0-9+\s]{8,15}$/.test(this.phone);
  }

  isValidCardName(): boolean {
    return this.cardName.trim().length >= 3;
  }

  isValidCardNumber(): boolean {
    const clean = this.cardNumber.replace(/\s+/g, '');
    return /^[0-9]{16}$/.test(clean);
  }

  isValidExpiry(): boolean {
    if (!this.expiry) return false;

    // Rimuove spazi all’inizio/fine
    const clean = this.expiry.trim();

    // Accetta sia M/AA che MM/AA
    const match = clean.match(/^(\d{1,2})\/(\d{2})$/);
    if (!match) return false;

    let month = parseInt(match[1], 10);
    const year = 2000 + parseInt(match[2], 10);

    // Controlla mese valido
    if (month < 1 || month > 12) return false;

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // Gennaio = 0
    const currentYear = now.getFullYear();

    // Carta già scaduta
    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;

    return true;
  }

  isValidCVV(): boolean {
    if (!this.cvv) return false;

    const clean = this.cvv.replace(/\D/g, ''); // solo numeri

    // CVV standard 3 o 4 cifre
    return clean.length === 3 || clean.length === 4;
  }

  isValidAddress(): boolean {
    return this.address.trim() !== '' &&
      this.city.trim() !== '' &&
      /^[0-9]{5}$/.test(this.zip);
  }

  isPayDisabled(): boolean {

    if (
      !this.isValidName() ||
      !this.isValidSurname() ||
      !this.isValidEmail() ||
      !this.isValidPhone() ||
      !this.isValidCardName() ||
      !this.isValidCardNumber() ||
      !this.isValidExpiry() ||
      !this.isValidCVV()
    ) {
      return true;
    }

    if (this.shippingMethod === 'locker' && !this.selectedLocker) {
      return true;
    }

    if (
      (this.shippingMethod === 'standard' || this.shippingMethod === 'express') &&
      !this.isValidAddress()
    ) {
      return true;
    }

    return false;
  }

  getPayTooltip(): string {

    if (!this.isValidName()) return 'Nome non valido';
    if (!this.isValidSurname()) return 'Cognome non valido';
    if (!this.isValidEmail()) return 'Email non valida';
    if (!this.isValidPhone()) return 'Telefono non valido';
    if (!this.isValidCardName()) return 'Nome sulla carta non valido';
    if (!this.isValidCardNumber()) return 'Numero carta non valido';
    if (!this.isValidExpiry()) return 'Scadenza non valida (MM/AA)';
    if (!this.isValidCVV()) return 'CVV non valido';

    if (this.shippingMethod === 'locker' && !this.selectedLocker) {
      return 'Seleziona un locker';
    }

    if (
      (this.shippingMethod === 'standard' || this.shippingMethod === 'express') &&
      !this.isValidAddress()
    ) {
      return 'Completa indirizzo (CAP valido)';
    }

    return '';
  }

  loadLockers() {
    if (!this.map) return;

    (window as any).selectLockerFromMap = (lockerId: string) => {
      const locker = this.lockers.find(l => l.id === lockerId);
      if (locker) {
        this.selectedLocker = locker;
        this.cdr.detectChanges();
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

    if (this.isPayDisabled() || this.isProcessing) return;

    this.isProcessing = true;
    this.cdr.detectChanges();

    setTimeout(() => {

      this.prodottoService.updateStock(this.cartItems).subscribe({

        next: () => {

          this.paymentSuccess = true;
          this.isProcessing = false;

          this.cdr.detectChanges();

          setTimeout(() => {

            localStorage.removeItem('cart');
            localStorage.removeItem('cart_total');

            this.cartItems = [];
            this.totalQuantity = 0;
            this.finalTotal = 0;

            window.location.href = '/payment-success';

          }, 3000);
        },

        error: () => {
          this.isProcessing = false;
          this.cdr.detectChanges();
          alert('Errore durante il pagamento');
        }

      });

    }, 2500);
  }
}