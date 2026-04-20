import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../navbar.component/navbar.component';
import { ServiziService } from '../../../services/servizio';
import { Servizio } from '../../../models/servizio.model';

@Component({
  selector: 'app-service-details',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink],
  templateUrl: './service-details.component.html',
  styleUrls: ['./service-details.component.css']
})
export class ServiceDetailsComponent {
  private readonly salonPhoneHref = 'tel:+393478085277';

  service: Servizio | undefined;

  constructor(
    private route: ActivatedRoute,
    private serviziService: ServiziService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const serviceId = Number(this.route.snapshot.paramMap.get('id'));

    if (!isNaN(serviceId)) {
      this.serviziService.getServiceById(serviceId).subscribe({
        next: s => {
          this.service = s;
          this.cdr.detectChanges();
        },
        error: () => {
          this.service = undefined;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.service = undefined;
    }
  }

  addToCart(): void {
    if (this.service && this.service.tipoPrenotazione === 'sito') {
      this.serviziService.addServiceToCart(this.service);
      alert(`${this.service.nome} è stato aggiunto al carrello`);
    }
  }

  get bookingDescription(): string {
    switch (this.service?.tipoPrenotazione) {
      case 'telefono':
        return 'Questo servizio si prenota telefonicamente con il salone.';
      case 'consulenza':
        return 'Questo servizio è disponibile solo dopo una consulenza.';
      default:
        return 'Servizio disponibile su appuntamento online.';
    }
  }

  get actionLabel(): string {
    switch (this.service?.tipoPrenotazione) {
      case 'telefono':
        return 'Chiama il salone';
      case 'consulenza':
        return 'Richiedi consulenza';
      default:
        return "Aggiungi all'appuntamento";
    }
  }

  get categoryLabel(): string {
    return this.service?.categoria || 'Servizio professionale';
  }

  get subcategoryLabel(): string {
    return this.service?.sottocategoria || 'Definita dal salone';
  }

  get durationLabel(): string {
    const rawDuration = this.service?.durata?.trim();

    if (!rawDuration) {
      return 'Durata su richiesta';
    }

    const normalized = rawDuration.toLowerCase();

    if (
      normalized.includes('min') ||
      normalized.includes('ora') ||
      normalized.includes('circa') ||
      normalized.includes('/')
    ) {
      return rawDuration;
    }

    return `${rawDuration} min`;
  }

  callSalon(): void {
    window.location.href = this.salonPhoneHref;
  }

  requestConsultation(): void {
    window.location.href = this.salonPhoneHref;
  }
}
