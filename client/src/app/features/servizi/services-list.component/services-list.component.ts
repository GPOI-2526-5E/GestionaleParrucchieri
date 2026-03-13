import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../navbar.component/navbar.component';
import { AiChatDrawerComponent } from '../../ai-chat-drawer.component/ai-chat-drawer.component';
import { ServiceCardComponent } from '../service-card.component/service-card.component';
import { Servizio, ServiziService } from '../../../data/service';

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CommonModule, NavbarComponent, AiChatDrawerComponent, ServiceCardComponent],
  templateUrl: './services-list.component.html',
  styleUrl: './services-list.component.css'
})
export class ServicesListComponent implements OnInit {

  services: Servizio[] = [];

  constructor(private serviziService: ServiziService) { }

  ngOnInit(): void {
    this.serviziService.getServizi().subscribe(data => {
      console.log(data);
      this.services = data;
    });
  }
}