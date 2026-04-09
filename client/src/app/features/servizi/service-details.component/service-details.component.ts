import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../navbar.component/navbar.component';
import { ServiziService, Servizio } from '../../../services/servizio';

@Component({
  selector: 'app-service-details',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink],
  templateUrl: './service-details.component.html',
  styleUrls: ['./service-details.component.css']
})
export class ServiceDetailsComponent {

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
    if (this.service) {
      this.serviziService.addServiceToCart(this.service);
      alert(`${this.service.nome} è stato aggiunto al carrello`);
    }
  }
}
