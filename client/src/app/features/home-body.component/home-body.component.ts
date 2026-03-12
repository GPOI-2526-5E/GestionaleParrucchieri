import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatUiService } from '../../services/chat-ui';

@Component({
  selector: 'app-home-body',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-body.component.html',
  styleUrl: './home-body.component.css',
})
export class HomeBodyComponent {
  chatUi = inject(ChatUiService);

  openAiFromCard() {
    this.chatUi.open('card');
  }
}