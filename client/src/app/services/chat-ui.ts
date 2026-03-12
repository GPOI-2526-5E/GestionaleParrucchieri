import { Injectable, signal } from '@angular/core';

export type ChatOpenSource = 'navbar' | 'card' | 'other';

@Injectable({ providedIn: 'root' })
export class ChatUiService {
  isOpen = signal(false);
  openSource = signal<ChatOpenSource>('other');

  open(source: ChatOpenSource = 'other') {
    this.openSource.set(source);
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  toggle(source: ChatOpenSource = 'other') {
    this.isOpen() ? this.close() : this.open(source);
  }
}