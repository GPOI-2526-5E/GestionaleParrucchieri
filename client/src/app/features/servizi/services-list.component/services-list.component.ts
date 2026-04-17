import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../navbar.component/navbar.component';
import { ServiceCardComponent } from '../service-card.component/service-card.component';
import { Servizio } from '../../../models/servizio.model';
import { ServiziService } from '../../../services/servizio';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CommonModule, NavbarComponent, ServiceCardComponent],
  templateUrl: './services-list.component.html',
  styleUrl: './services-list.component.css'
})
export class ServicesListComponent {

  servicesMD!: Observable<Servizio[]>;
  servicesBySite: Servizio[] = [];
  servicesByPhone: Servizio[] = [];
  servicesByConsultation: Servizio[] = [];
  totalServices = 0;

  constructor(private serviziService: ServiziService) { }

  ngOnInit(): void {
    this.servicesMD = this.serviziService.getServizi();
    this.servicesMD.subscribe((services) => {
      this.totalServices = services.length;
      this.servicesBySite = services.filter((service) => service.tipoPrenotazione === 'sito');
      this.servicesByPhone = services.filter((service) => service.tipoPrenotazione === 'telefono');
      this.servicesByConsultation = services.filter((service) => service.tipoPrenotazione === 'consulenza');
    });
  }

  trackById(index: number, service: Servizio) {
    return service.idServizio;
  }
}
