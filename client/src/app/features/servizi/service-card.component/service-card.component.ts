import { Component, Input } from '@angular/core';
import { Servizio } from '../../../models/servizio.model';
import { CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ServiziService } from '../../../services/servizio';

@Component({
  selector: 'app-service-card',
  standalone: true,
  imports: [CurrencyPipe, RouterModule],
  templateUrl: './service-card.component.html',
  styleUrls: ['./service-card.component.css']
})
export class ServiceCardComponent {
  private readonly salonPhoneHref = 'tel:+393478085277';

  constructor(private serviziService: ServiziService) { }
  
  @Input() service!: Servizio; 

  get bookingBadge(): string {
    switch (this.service.tipoPrenotazione) {
      case 'telefono':
        return 'Prenotazione telefonica';
      case 'consulenza':
        return 'Prenotazione con consulenza';
      default:
        return 'Prenotabile dal sito';
    }
  }

  get buttonLabel(): string {
    switch (this.service.tipoPrenotazione) {
      case 'telefono':
        return 'Chiama';
      case 'consulenza':
        return 'Richiedi consulenza';
      default:
        return 'Aggiungi';
    }
  }

  get buttonTitle(): string {
    if (this.service.tipoPrenotazione === 'consulenza') {
      return 'Questo servizio può essere prenotato solo dopo una consulenza.';
    }

    if (this.service.tipoPrenotazione === 'telefono') {
      return 'Chiama il salone per prenotare questo servizio.';
    }

    return 'Aggiungi il servizio alla prenotazione';
  }

  addToCart() {
    if (this.service.tipoPrenotazione !== 'sito') {
      return;
    }

    this.serviziService.addServiceToCart(this.service);
    alert(`${this.service.nome} è stato aggiunto alla prenotazione`);
  }

  callSalon(): void {
    window.location.href = this.salonPhoneHref;
  }

  requestConsultation(): void {
    window.location.href = this.salonPhoneHref;
  }
} 
