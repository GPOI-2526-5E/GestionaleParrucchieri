import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import itLocale from '@fullcalendar/core/locales/it';
import { NavbarComponent } from '../navbar.component/navbar.component';
import { AiChatDrawerComponent } from '../ai-chat-drawer.component/ai-chat-drawer.component';

@Component({
  selector: 'app-appuntamenti',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, NavbarComponent, AiChatDrawerComponent],
  templateUrl: './appuntamenti.component.html',
  styleUrls: ['./appuntamenti.component.css']
})
export class AppuntamentiComponent {

  events: EventInput[] = [
    { title: 'Taglio & Piega', start: '2026-03-26T10:00:00', end: '2026-03-26T11:00:00' },
    { title: 'Trattamento Viso', start: '2026-03-27T15:30:00', end: '2026-03-27T17:00:00' },
  ];

  calendarOptions: CalendarOptions = {
    plugins: [timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    locale: itLocale,
    firstDay: 1,
    allDaySlot: false,
    slotMinTime: '08:00:00',
    slotMaxTime: '22:00:00', 
    slotDuration: '00:30:00',
    slotLabelInterval: '00:30',
    
    // FIX VISIVI
    expandRows: true,
    height: 'auto',
    nowIndicator: true,
    selectable: true,
    eventOverlap: false, // Evita che gli eventi si stringano tra loro
    slotEventOverlap: false,
    
    // Forza l'altezza minima dell'evento
    eventMinHeight: 40, 
    
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'timeGridWeek,timeGridDay'
    },
    
    buttonText: {
      today: 'Oggi',
      week: 'Settimana',
      day: 'Giorno'
    },
    
    slotLabelFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    
    dayHeaderFormat: { weekday: 'short', day: 'numeric', omitCommas: true },
    events: this.events
  };
}