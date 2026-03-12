import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable({ providedIn: 'root' })
export class AiChatService {
  constructor(private http: HttpClient) {}

  async send(messages: ChatMessage[]): Promise<string> {
    const request = firstValueFrom(
      this.http.post<{ reply: string }>('http://localhost:3000/api/chat', { messages })
    );

    // ✅ timeout 30s
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    );

    const res = await Promise.race([request, timeout]);
    return res.reply;
  }
}