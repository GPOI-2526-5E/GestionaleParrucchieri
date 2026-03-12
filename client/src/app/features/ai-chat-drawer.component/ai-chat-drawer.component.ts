import { Component, HostListener, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatUiService } from '../../services/chat-ui';
import { AiChatService, ChatMessage } from '../../services/ai-chat';

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

  // ✅ Nessun messaggio iniziale
  messages: ChatMessage[] = [];

  inputText = '';
  isSending = false;

  @HostListener('window:keydown.escape')
  onEsc() {
    if (this.chatUi.isOpen()) this.chatUi.close();
  }

  close() {
    this.chatUi.close();
  }

  // ✅ Per i bottoni suggeriti (chip)
  quick(text: string) {
    this.inputText = text;
    this.send();
  }

  // (opzionale) migliora rendering
  trackByIndex(i: number) {
    return i;
  }

  async send() {
    const text = this.inputText.trim();
    if (!text || this.isSending) return;

    this.messages.push({ role: 'user', content: text });
    this.inputText = '';
    this.isSending = true;
    this.cdr.detectChanges();

    try {
      const reply = await this.ai.send(this.messages);
      this.messages.push({ role: 'assistant', content: reply });
    } catch (e: any) {
      const msg = String(e?.message || e);
      this.messages.push({
        role: 'assistant',
        content: msg.includes('TIMEOUT')
          ? 'Sto impiegando troppo tempo a rispondere. Riprova tra qualche secondo 🙂'
          : 'Errore di connessione. Riprova.'
      });
    } finally {
      this.isSending = false;
      this.cdr.detectChanges();

      setTimeout(() => {
        const el = document.querySelector('.ai-body') as HTMLElement | null;
        if (el) el.scrollTop = el.scrollHeight;
      }, 0);
    }
  }
}