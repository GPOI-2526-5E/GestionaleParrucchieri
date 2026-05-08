import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../navbar.component/navbar.component';
import { ServiceCardComponent } from '../service-card.component/service-card.component';
import { Servizio } from '../../../models/servizio.model';
import { ServiziService } from '../../../services/servizio';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, ServiceCardComponent],
  templateUrl: './services-list.component.html',
  styleUrl: './services-list.component.css'
})
export class ServicesListComponent implements OnInit, OnDestroy {

  servicesMD!: Observable<Servizio[]>;
  allServices: Servizio[] = [];
  servicesBySite: Servizio[] = [];
  servicesByPhone: Servizio[] = [];
  servicesByConsultation: Servizio[] = [];
  totalServices = 0;
  searchTerm = '';
  private servicesSub?: Subscription;

  constructor(private serviziService: ServiziService) { }

  ngOnInit(): void {
    this.servicesMD = this.serviziService.getServizi();
    this.servicesSub = this.servicesMD.subscribe((services) => {
      this.allServices = services;
      this.applySearchFilter();
    });
  }

  ngOnDestroy(): void {
    this.servicesSub?.unsubscribe();
  }

  trackById(index: number, service: Servizio) {
    return service.idServizio;
  }

  applySearchFilter(): void {
    const query = this.normalizeSearchText(this.searchTerm);
    const filteredServices = query
      ? this.allServices.filter((service) => this.serviceMatchesSearch(service, query))
      : this.allServices;

    this.totalServices = filteredServices.length;
    this.servicesBySite = filteredServices.filter((service) => service.tipoPrenotazione === 'sito');
    this.servicesByPhone = filteredServices.filter((service) => service.tipoPrenotazione === 'telefono');
    this.servicesByConsultation = filteredServices.filter((service) => service.tipoPrenotazione === 'consulenza');
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applySearchFilter();
  }

  private serviceMatchesSearch(service: Servizio, query: string): boolean {
    return this.normalizeSearchText([
      service.nome,
      service.descrizione,
      service.categoria,
      service.sottocategoria,
      service.tipoPrenotazione,
      service.durata ?? ''
    ].join(' ')).includes(query);
  }

  private normalizeSearchText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
