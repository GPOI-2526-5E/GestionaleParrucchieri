import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../navbar.component/navbar.component';
import { AiChatDrawerComponent } from '../../ai-chat-drawer.component/ai-chat-drawer.component';
import { ServiziService, Servizio } from '../../../services/servizio';

@Component({
  selector: 'app-service-details',
  standalone: true,
  imports: [CommonModule, NavbarComponent, AiChatDrawerComponent, RouterLink],
  templateUrl: './service-details.component.html',
  styleUrls: ['./service-details.component.css']
})
export class ServiceDetailsComponent {

  service: Servizio | undefined;

  constructor(private route: ActivatedRoute, private serviziService: ServiziService) { }

  ngOnInit(): void {
    const serviceId = Number(this.route.snapshot.paramMap.get('id'));
    if (serviceId) {
      // Sottoscrizione dell'observable
      this.serviziService.getServiceById(serviceId).subscribe({
        next: s => this.service = s,
        error: () => this.service = undefined
      });
    } else {
      this.service = undefined;
    }
  }

  addToCart(): void {
    if (this.service) {
      this.serviziService.addServiceToCart(this.service);
      alert(`${this.service.nome} è stato aggiunto al carrello`);
    }
  }
}