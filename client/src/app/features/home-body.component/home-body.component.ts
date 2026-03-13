import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatUiService } from '../../services/chat-ui';
import { NavbarComponent } from "../navbar.component/navbar.component";
import { AiChatDrawerComponent } from "../ai-chat-drawer.component/ai-chat-drawer.component";
import { RouterLink, RouterLinkActive } from "@angular/router";

@Component({
  selector: 'app-home-body',
  standalone: true,
  imports: [CommonModule, NavbarComponent, AiChatDrawerComponent, RouterLink, RouterLinkActive],
  templateUrl: './home-body.component.html',
  styleUrl: './home-body.component.css',
})
export class HomeBodyComponent {

  hoursOpen = false;

  chatUi = inject(ChatUiService);

  openAiFromCard() {
    this.chatUi.open('card');
  }

  isOpen = false;
  todayName = '';
  todayHours = '';
  statusMessage = '';

  ngOnInit() {
    const now = new Date();
    const day = now.getDay();
    const minutesNow = now.getHours() * 60 + now.getMinutes();

    const schedule: any = {
      0: { name: 'Domenica', intervals: [] },
      1: { name: 'Lunedì', intervals: [] },
      2: { name: 'Martedì', intervals: [[480, 750], [840, 1170]] },
      3: { name: 'Mercoledì', intervals: [[780, 1290]] },
      4: { name: 'Giovedì', intervals: [[480, 750], [840, 1170]] },
      5: { name: 'Venerdì', intervals: [[420, 1170]] },
      6: { name: 'Sabato', intervals: [[420, 1080]] }
    };

    const today = schedule[day];
    this.todayName = today.name;

    if (today.intervals.length === 0) {
      this.todayHours = 'Chiuso';
      this.statusMessage = 'Chiuso oggi';
      this.isOpen = false;
      return;
    }

    for (const interval of today.intervals) {
      const start = interval[0];
      const end = interval[1];

      if (minutesNow >= start && minutesNow <= end) {
        this.isOpen = true;

        const closeHour = Math.floor(end / 60);
        const closeMin = end % 60;

        this.statusMessage = `Aperto ora — chiude alle ${closeHour}:${closeMin.toString().padStart(2, '0')}`;
        break;
      }

      if (minutesNow < start) {
        this.isOpen = false;

        const openHour = Math.floor(start / 60);
        const openMin = start % 60;

        this.statusMessage = `Chiuso — apre alle ${openHour}:${openMin.toString().padStart(2, '0')}`;
        break;
      }
    }

    // Caso: tutti gli orari di oggi sono già passati
    if (!this.statusMessage) {
      this.isOpen = false;
      this.statusMessage = 'Chiuso — riapre domani';
    }

    this.todayHours = today.intervals
      .map((i: any) => {
        const sh = Math.floor(i[0] / 60);
        const sm = (i[0] % 60).toString().padStart(2, '0');
        const eh = Math.floor(i[1] / 60);
        const em = (i[1] % 60).toString().padStart(2, '0');
        return `${sh}:${sm} – ${eh}:${em}`;
      })
      .join(', ');
  }
}