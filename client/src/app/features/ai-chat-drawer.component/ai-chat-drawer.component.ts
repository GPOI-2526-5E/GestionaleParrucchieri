import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatUiService } from '../../services/chat-ui';

@Component({
  selector: 'app-ai-chat-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-chat-drawer.component.html',
  styleUrl: './ai-chat-drawer.component.css',
})
export class AiChatDrawerComponent {
  chatUi = inject(ChatUiService);

  @HostListener('window:keydown.escape')
  onEsc() {
    if (this.chatUi.isOpen()) this.chatUi.close();
  }

  close() {
    this.chatUi.close();
  }
}