import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Signal,
  ViewChild,
  computed,
  signal
} from '@angular/core';
import * as L from 'leaflet';

import { NavbarComponent } from '../navbar.component/navbar.component';
import { AiChatDrawerComponent } from '../ai-chat-drawer.component/ai-chat-drawer.component';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Prodotto } from '../../services/prodotto';
import { ProdottoService } from '../../services/prodotto';
import { LockerOption, LockerService } from '../../services/locker';

type DeliveryMethod =
  | 'home-standard'
  | 'home-express'
  | 'store-pickup'
  | 'locker';

interface LockerWithDistance extends LockerOption {
  distance?: number;
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, NavbarComponent, AiChatDrawerComponent, RouterLink],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css',
})
export class CartComponent implements OnInit, OnDestroy {
  @ViewChild('lockerMap') lockerMapRef?: ElementRef<HTMLDivElement>;

  cartItems: Signal<Prodotto[]>;
  cartTotal: Signal<number>;
  showSuccessMessage = false;

  selectedDeliveryMethod = signal<DeliveryMethod>('home-standard');
  selectedLockerId = signal<string>('');

  lockers = signal<LockerOption[]>([]);
  lockersLoading = signal(false);
  lockersError = signal('');

  userPosition = signal<{ lat: number; lng: number } | null>(null);

  nearestLockers = computed<LockerWithDistance[]>(() => {
    const position = this.userPosition();
    const lockers = this.lockers();

    if (!position) {
      return [...lockers];
    }

    return [...lockers]
      .map(locker => ({
        ...locker,
        distance: this.distanceInKm(
          position.lat,
          position.lng,
          locker.lat,
          locker.lng
        )
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  });

  selectedLocker = computed<LockerOption | null>(() => {
    return this.lockers().find(l => l.id === this.selectedLockerId()) ?? null;
  });

  differentProductsCount = computed(() => this.cartItems().length);

  totalQuantity = computed(() =>
    this.cartItems().reduce((sum, item) => sum + (item.quantita || 1), 0)
  );

  cartSubtotal = computed(() =>
    this.cartItems().reduce(
      (sum, item) => sum + item.prezzo * (item.quantita || 1),
      0
    )
  );

  deliveryPrice = computed(() => {
    switch (this.selectedDeliveryMethod()) {
      case 'home-standard':
        return 4.99;
      case 'home-express':
        return 8.99;
      case 'store-pickup':
        return 0;
      case 'locker':
        return 2.99;
      default:
        return 0;
    }
  });

  finalTotal = computed(() => this.cartSubtotal() + this.deliveryPrice());

  selectedLockerName = computed(() => {
    const locker = this.lockers().find(l => l.id === this.selectedLockerId());
    return locker ? `${locker.name} - ${locker.city}` : '';
  });

  private map: L.Map | null = null;
  private lockerMarkersLayer: L.LayerGroup | null = null;
  private userMarker: L.Marker | null = null;

  constructor(
    private prodottoService: ProdottoService,
    private router: Router,
    private lockerService: LockerService
  ) {
    this.cartItems = this.prodottoService.cart;

    this.cartTotal = computed(() =>
      this.cartItems().reduce(
        (sum, item) => sum + item.prezzo * (item.quantita || 1),
        0
      )
    );
  }

  ngOnInit(): void {
    this.loadAreaLockers();
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  increase(id: number): void {
    this.prodottoService.increaseQuantity(id);
  }

  decrease(id: number): void {
    this.prodottoService.decreaseQuantity(id);
  }

  removeFromCart(id: number): void {
    this.prodottoService.removeProductFromCart(id);
  }

  setDeliveryMethod(method: DeliveryMethod): void {
    this.selectedDeliveryMethod.set(method);

    if (method !== 'locker') {
      this.selectedLockerId.set('');
      this.destroyMap();
      return;
    }

    setTimeout(() => this.initLockerMap(), 0);
  }

  getDeliveryLabel(method: DeliveryMethod): string {
    switch (method) {
      case 'home-standard':
        return '€4,99';
      case 'home-express':
        return '€8,99';
      case 'store-pickup':
        return 'Gratis';
      case 'locker':
        return '€2,99';
      default:
        return '€0,00';
    }
  }

  selectLocker(lockerId: string): void {
    this.selectedLockerId.set(lockerId);
    this.refreshLockerMarkers(false);

    const locker = this.lockers().find(l => l.id === lockerId);
    if (locker && this.map) {
      this.map.setView([locker.lat, locker.lng], 15);
    }
  }

  locateUser(): void {
    if (!navigator.geolocation) {
      alert('Geolocalizzazione non supportata dal browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        this.userPosition.set({ lat, lng });

        if (!this.map) {
          this.initLockerMap();
        }

        this.updateUserMarker(lat, lng);
        this.refreshLockerMarkers(true);

        const nearest = this.nearestLockers()[0];
        if (nearest) {
          this.selectedLockerId.set(nearest.id);
          this.refreshLockerMarkers(true);
        }
      },
      () => {
        alert('Non è stato possibile recuperare la tua posizione.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  checkout(): void {
    if (this.selectedDeliveryMethod() === 'locker' && !this.selectedLockerId()) {
      alert('Seleziona un locker sulla mappa prima di procedere.');
      return;
    }

    const orderData = {
      items: this.cartItems(),
      differentProducts: this.differentProductsCount(),
      quantity: this.totalQuantity(),
      subtotal: this.cartSubtotal(),
      deliveryMethod: this.selectedDeliveryMethod(),
      deliveryPrice: this.deliveryPrice(),
      lockerId: this.selectedLockerId() || null,
      lockerName: this.selectedLockerName() || null,
      total: this.finalTotal()
    };

    console.log('Dati ordine:', orderData);
    alert('Procedi al pagamento');
  }

  private loadAreaLockers(): void {
    this.lockersLoading.set(true);
    this.lockersError.set('');

    this.lockerService.getLockersAroundFossano().subscribe({
      next: (lockers) => {
        this.lockers.set(lockers);
        this.lockersLoading.set(false);

        if (lockers.length === 0) {
          this.lockersError.set('Nessun locker trovato nella zona di Fossano.');
        }

        if (this.map) {
          this.refreshLockerMarkers(true);
        }
      },
      error: (error) => {
        console.error('Errore caricamento locker:', error);
        this.lockersError.set('Non è stato possibile caricare i locker.');
        this.lockersLoading.set(false);
      }
    });
  }

  private initLockerMap(): void {
    if (!this.lockerMapRef?.nativeElement) return;

    if (this.map) {
      this.map.invalidateSize();
      this.refreshLockerMarkers(true);
      return;
    }

    const mapElement = this.lockerMapRef.nativeElement;

    this.map = L.map(mapElement).setView([44.5505, 7.7264], 12);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    this.lockerMarkersLayer = L.layerGroup().addTo(this.map);

    this.refreshLockerMarkers(true);

    setTimeout(() => this.map?.invalidateSize(), 100);
  }

  private refreshLockerMarkers(fit = false): void {
    if (!this.lockerMarkersLayer || !this.map) return;

    this.lockerMarkersLayer.clearLayers();

    const visibleLockers = this.lockers();
    const bounds: L.LatLngTuple[] = [];

    for (const locker of visibleLockers) {
      const isSelected = this.selectedLockerId() === locker.id;

      const icon = L.divIcon({
        className: 'locker-marker-wrapper',
        html: `<div class="locker-marker${isSelected ? ' active' : ''}"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([locker.lat, locker.lng] as L.LatLngTuple, { icon });

      marker.bindPopup(`
        <div style="min-width:220px;">
          <strong>${locker.name}</strong><br/>
          <span>${locker.address}</span><br/>
          <span>${locker.postalCode} ${locker.city}${locker.province ? ` (${locker.province})` : ''}</span>
          ${locker.note ? `<br/><small>${locker.note}</small>` : ''}
        </div>
      `);

      marker.on('click', () => {
        this.selectedLockerId.set(locker.id);
        this.refreshLockerMarkers(false);
      });

      marker.addTo(this.lockerMarkersLayer);
      bounds.push([locker.lat, locker.lng]);
    }

    const position = this.userPosition();
    if (position) {
      bounds.push([position.lat, position.lng]);
    }

    if (fit && bounds.length > 0) {
      this.map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] });
    }
  }

  private updateUserMarker(lat: number, lng: number): void {
    if (!this.map) return;

    if (this.userMarker) {
      this.map.removeLayer(this.userMarker);
    }

    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: '<div class="user-location-dot"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    this.userMarker = L.marker([lat, lng] as L.LatLngTuple, { icon: userIcon })
      .addTo(this.map)
      .bindPopup('La tua posizione');
  }

  private distanceInKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.lockerMarkersLayer = null;
    this.userMarker = null;
  }
}