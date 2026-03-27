import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import itLocale from '@fullcalendar/core/locales/it';
import { NavbarComponent } from '../navbar.component/navbar.component';
import { AiChatDrawerComponent } from '../ai-chat-drawer.component/ai-chat-drawer.component';
import { FormsModule } from '@angular/forms';
import { UtentiService } from '../../services/utentiService';
import { Utente } from "../../models/utente.model";
import { ChangeDetectorRef } from '@angular/core';
import { AppuntamentoService } from "../../services/appuntamentoService";

@Component({
  selector: 'app-appuntamenti',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, NavbarComponent, AiChatDrawerComponent, FormsModule],
  templateUrl: './appuntamenti.component.html',
  styleUrls: ['./appuntamenti.component.css']
})
export class AppuntamentiComponent {

  selectedOperator: number | null = null;
  operatori: Utente[] | null = null;

  constructor(
    private utenteService: UtentiService,
    private cdr: ChangeDetectorRef,
    private appuntamentoService: AppuntamentoService
  ) { }



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
    slotLabelInterval: '01:00',

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

  ngOnInit() {
    this.utenteService.getOperatori().subscribe({
      next: (operatori) => {
        this.operatori = operatori;
        console.log("Operatori caricati nel componente:", this.operatori);

        if (this.operatori.length > 0) {
          this.selectedOperator = this.operatori[0].idUtente;
        }

        // Forza Angular a rilevare i cambiamenti e aggiornare la vista
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Errore caricando operatori:", err)
    });
  }

  onOperatorChange(event: any) {

    this.appuntamentoService.getAppuntamenti(this.selectedOperator!).subscribe({
      next: (eventi) => {
        // Trasforma le date in eventi per FullCalendar
        this.events = eventi.map(a => ({
          title: `Appuntamento con cliente ${a.idCliente}`,
          start: a.dataOraInizio
        }));
        console.log('appuntamenti');

        // Aggiorna il calendario
        this.calendarOptions.events = this.events;
      },
      error: (err) => console.error("Errore caricando appuntamenti:", err)
    });
  }
}