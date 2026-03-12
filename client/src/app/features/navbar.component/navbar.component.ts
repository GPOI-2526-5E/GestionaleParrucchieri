import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatUiService } from '../../services/chat-ui';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  isScrolled = false;

  private chatUi = inject(ChatUiService);

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
  }

  openAi() {
    this.chatUi.open('navbar');
  }
}