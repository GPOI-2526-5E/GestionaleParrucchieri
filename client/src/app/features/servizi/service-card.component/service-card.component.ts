import { Component, Input } from '@angular/core';
import { Servizio } from '../../../data/service';
import { CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-service-card',
  standalone: true,
  imports: [CurrencyPipe, RouterModule],
  templateUrl: './service-card.component.html',
  styleUrls: ['./service-card.component.css']
})
export class ServiceCardComponent {

  constructor() { }
  
  @Input() service!: Servizio; 

  addToCart() {
    console.log(`Aggiunto al carrello: ${this.service.nome}`);
  }
}