import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ServiceCard {
  idServizio: number;
  nome: string;
  descrizione: string;
  durata: number;
  prezzo: number;
}

@Injectable({ providedIn: 'root' })
export class AiChatService {
  constructor(private http: HttpClient) {}

  async send(messages: ChatMessage[]): Promise<{ reply: string; services: ServiceCard[] }> {
    const request = firstValueFrom(
      this.http.post<{ reply?: string; services?: ServiceCard[] }>(
        'http://localhost:3000/api/chat',
        { messages }
      )
    );

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    );

    try {
      const res = await Promise.race([request, timeout]);

      return {
        reply: res?.reply || 'Nessuna risposta disponibile',
        services: Array.isArray(res?.services) ? res.services : []
      };
    } catch (error: any) {
      console.error('AI CHAT SERVICE ERROR:', error);

      if (error?.message === 'TIMEOUT') {
        return {
          reply: 'Sto impiegando troppo tempo a rispondere. Riprova tra qualche secondo 🙂',
          services: []
        };
      }

      if (error?.status) {
        return {
          reply: `Errore server (${error.status}). Controlla il backend.`,
          services: []
        };
      }

      return {
        reply: 'Errore di connessione. Controlla che il server sia attivo.',
        services: []
      };
    }
  }
}