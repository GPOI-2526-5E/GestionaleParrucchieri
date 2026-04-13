import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatUiService } from '../../services/chat-ui';
import { NavbarComponent } from "../navbar.component/navbar.component";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { FooterComponent } from '../footer.component/footer.component';

@Component({
  selector: 'app-home-body',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink, RouterLinkActive, FooterComponent],
  templateUrl: './home-body.component.html',
  styleUrl: './home-body.component.css',
})
export class HomeBodyComponent {
  chatUi = inject(ChatUiService);

  openAiFromCard() {
    this.chatUi.open('card');
  }
}
