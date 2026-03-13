import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../navbar.component/navbar.component';
import { AiChatDrawerComponent } from '../../ai-chat-drawer.component/ai-chat-drawer.component';
import { ServiceCardComponent } from '../service-card.component/service-card.component';
import { Servizio, ServiziService } from '../../../data/service';
import { Observable } from 'rxjs/internal/Observable';

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CommonModule, NavbarComponent, AiChatDrawerComponent, ServiceCardComponent],
  templateUrl: './services-list.component.html',
  styleUrl: './services-list.component.css'
})
export class ServicesListComponent {

  servicesMD!: Observable<Servizio[]>;

  constructor(private serviziService: ServiziService) {}

  ngOnInit(): void {
    this.servicesMD = this.serviziService.getServizi();
  }
}