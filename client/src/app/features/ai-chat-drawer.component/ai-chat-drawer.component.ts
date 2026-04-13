import { Component, HostListener, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatUiService } from '../../services/chat-ui';
import { AiChatService, ChatMessage, ServiceCard, ProductCard } from '../../services/ai-chat';

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
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private conversationVersion = 0;

  messages: ChatMessage[] = [];
  inputText = '';
  isSending = false;
  services: ServiceCard[] = [];
  products: ProductCard[] = [];

  @HostListener('window:keydown.escape')
  onEsc() {
    if (this.chatUi.isOpen()) this.chatUi.close();
  }

  close() {
    this.chatUi.close();
  }

  startNewConversation() {
    this.conversationVersion += 1;

    this.messages = [];
    this.services = [];
    this.products = [];
    this.inputText = '';
    this.isSending = false;
    this.cdr.detectChanges();
    this.scrollToBottom();
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

  trackByProduct(_: number, p: ProductCard) {
    return p.idProdotto;
  }

  openProduct(product: ProductCard) {
    this.router.navigate(['/product', product.idProdotto]);
    this.chatUi.close();
  }

  openService(service: ServiceCard) {
    this.router.navigate(['/service', service.idServizio]);
    this.chatUi.close();
  }

  async send() {
    const text = this.inputText.trim();

    if (!text || this.isSending) return;

    this.messages.push({ role: 'user', content: text });
    this.inputText = '';
    this.isSending = true;
    this.services = [];
    this.products = [];

    this.cdr.detectChanges();
    this.scrollToBottom();

    const activeConversation = this.conversationVersion;
    const requestMessages = [...this.messages];

    try {
      const res = await this.ai.send(requestMessages);

      if (activeConversation !== this.conversationVersion) {
        return;
      }

      let assistantText = res.reply || 'Vuoi parlarmi di taglio, colore, barba o servizi del salone?';

      this.messages.push({
        role: 'assistant',
        content: assistantText
      });

      this.services = Array.isArray(res.services) ? res.services : [];
      this.products = Array.isArray(res.products) ? res.products : [];
    } catch (e: any) {
      if (activeConversation !== this.conversationVersion) {
        return;
      }

      const msg = String(e?.message || e);

      this.messages.push({
        role: 'assistant',
        content: msg.includes('TIMEOUT')
          ? 'Sto impiegando troppo tempo a rispondere. Riprova tra qualche secondo.'
          : 'Errore di connessione. Riprova.'
      });

      this.services = [];
      this.products = [];
    } finally {
      if (activeConversation === this.conversationVersion) {
        this.isSending = false;
        this.cdr.detectChanges();
        this.scrollToBottom();
      }
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      const el = document.querySelector('.ai-body') as HTMLElement | null;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }
}
