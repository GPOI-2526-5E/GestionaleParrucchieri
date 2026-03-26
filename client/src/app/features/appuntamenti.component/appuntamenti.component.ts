import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DateSelectArg, EventInput } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { NavbarComponent } from '../navbar.component/navbar.component';

@Component({
  selector: 'app-appuntamenti',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, NavbarComponent],
  templateUrl: './appuntamenti.component.html',
  styleUrls: ['./appuntamenti.component.css']
})
export class AppuntamentiComponent {

  // Esempio di eventi già prenotati
  events: EventInput[] = [
    { title: 'Appuntamento 1', start: '2026-03-26T09:00:00', end: '2026-03-26T10:00:00' },
    { title: 'Appuntamento 2', start: '2026-03-27T14:00:00', end: '2026-03-27T15:30:00' },
  ];

  calendarOptions: CalendarOptions = {
    plugins: [timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek', // visualizzazione settimanale
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: ''
    },
    slotMinTime: '08:00:00',      // fascia oraria minima
    slotMaxTime: '18:00:00',      // fascia oraria massima
    slotDuration: '00:30:00',     // ogni riga = 30 minuti
    allDaySlot: false,            // togli la riga "All day"
    selectable: true,
    selectMirror: true,
    events: this.events,
    select: this.handleDateSelect.bind(this),
    // mostra 7 giorni alla volta
    visibleRange: this.getVisibleWeek.bind(this)
  };

  // funzione per mostrare sempre 7 giorni
  getVisibleWeek(currentDate: Date) {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1); // inizio lunedì
    const end = new Date(start);
    end.setDate(start.getDate() + 7); // 7 giorni
    return { start, end };
  }

  handleDateSelect(selectInfo: DateSelectArg) {
    const start = selectInfo.startStr;
    const end = selectInfo.endStr;
    alert(`Hai selezionato la fascia: ${start} - ${end}`);
    // qui puoi aprire un modale per prenotare la fascia
  }

}