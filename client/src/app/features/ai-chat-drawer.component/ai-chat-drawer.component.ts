import { Component, HostListener, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatUiService } from '../../services/chat-ui';
import { AiChatService, ChatMessage, ServiceCard } from '../../services/ai-chat';

@Component({
  selector: 'app-ai-chat-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat-drawer.component.html',
  styleUrl: './ai-chat-drawer.component.css',
})
export class AiChatDrawerComponent {
  chatUi = inject(ChatUiService);
  ai = inject(AiChatService);
  private cdr = inject(ChangeDetectorRef);

  messages: ChatMessage[] = [];
  inputText = '';
  isSending = false;
  services: ServiceCard[] = [];

  @HostListener('window:keydown.escape')
  onEsc() {
    if (this.chatUi.isOpen()) this.chatUi.close();
  }

  close() {
    this.chatUi.close();
  }

  quick(text: string) {
    if (this.isSending) return;
    this.inputText = text;
    this.send();
  }

  trackByIndex(i: number) {
    return i;
  }

  trackByService(_: number, s: ServiceCard) {
    return s.idServizio;
  }

  async send() {
    const text = this.inputText.trim();

    if (!text || this.isSending) return;

    this.messages.push({ role: 'user', content: text });
    this.inputText = '';
    this.isSending = true;
    this.services = [];

    this.cdr.detectChanges();
    this.scrollToBottom();

    try {
      const res = await this.ai.send(this.messages);

      let assistantText = res.reply || 'Vuoi parlarmi di taglio, colore, barba o trattamenti?';

      if (Array.isArray(res.services) && res.services.length > 0) {
        assistantText = 'Ecco alcuni servizi disponibili nel salone:';
      }

      this.messages.push({
        role: 'assistant',
        content: assistantText
      });

      this.services = Array.isArray(res.services) ? res.services : [];
    } catch (e: any) {
      const msg = String(e?.message || e);

      this.messages.push({
        role: 'assistant',
        content: msg.includes('TIMEOUT')
          ? 'Sto impiegando troppo tempo a rispondere. Riprova tra qualche secondo 🙂'
          : 'Errore di connessione. Riprova.'
      });

      this.services = [];
    } finally {
      this.isSending = false;
      this.cdr.detectChanges();
      this.scrollToBottom();
}
  }

  private scrollToBottom() {
    setTimeout(() => {
      const el = document.querySelector('.ai-body') as HTMLElement | null;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }
}