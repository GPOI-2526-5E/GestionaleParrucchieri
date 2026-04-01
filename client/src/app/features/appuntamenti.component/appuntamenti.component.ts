import { Component, OnInit, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import itLocale from '@fullcalendar/core/locales/it';
import { NavbarComponent } from '../navbar.component/navbar.component';
import { AiChatDrawerComponent } from '../ai-chat-drawer.component/ai-chat-drawer.component';
import { FormsModule } from '@angular/forms';
import { UtentiService } from '../../services/utentiService';
import { Utente } from "../../models/utente.model";
import { AppuntamentoService } from "../../services/appuntamentoService";
import { AuthService } from '../../services/auth';
import { HttpHeaders, HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-appuntamenti',
  standalone: true,
  imports: [
    CommonModule,
    FullCalendarModule,
    NavbarComponent,
    AiChatDrawerComponent,
    FormsModule
  ],
  templateUrl: './appuntamenti.component.html',
  styleUrls: ['./appuntamenti.component.css']
})
export class AppuntamentiComponent implements OnInit {

  private api = 'http://localhost:3000/api/auth';

  selectedOperator: number | null = null;
  operatorSelectOpen = false;
  operatori: Utente[] = [];
  user: any = null;

  events: EventInput[] = [];

  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;

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
    displayEventTime: true,
    displayEventEnd: true,
    expandRows: true,
    height: 'auto',
    nowIndicator: true,
    selectable: true,
    eventOverlap: false,
    slotEventOverlap: false,
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
    slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    dayHeaderFormat: { weekday: 'short', day: 'numeric', omitCommas: true },
    events: []
  };

  constructor(
    private utenteService: UtentiService,
    private appuntamentoService: AppuntamentoService,
    private auth: AuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.getLoggedUser();

    this.utenteService.getOperatori().subscribe({
      next: (operatori) => {
        this.operatori = operatori;

        if (this.operatori.length > 0) {
          this.selectedOperator = this.operatori[0].idUtente;
        }

        this.cdr.detectChanges();
      },
      error: (err) => console.error("Errore caricando operatori:", err)
    });
  }

  getLoggedUser() {
    const headers = this.getAuthHeaders();

    this.http.get<any>(`${this.api}/me`, { headers })
      .subscribe({
        next: (res) => {
          if (!res) return;

          this.user = res;
          console.log("Utente loggato:", this.user);

          if (this.selectedOperator) {
            this.onOperatorChange(null);
          }

          this.cdr.detectChanges();
        },
        error: (err) => console.error('Errore recupero utente:', err)
      });
  }

  onOperatorChange(event: any) {
    this.closeOperatorSelect();

    if (!this.selectedOperator) return;

    this.appuntamentoService.getAppuntamenti(this.selectedOperator)
      .subscribe({
        next: (eventi) => {
          this.events = eventi.map(a => {
            const isMyAppointment = a.idCliente && this.user?.idUtente && a.idCliente === this.user.idUtente;
            return {
              title: isMyAppointment ? 'Tuo appuntamento' : '',
              start: a.dataOraInizio,
              end: a.dataOraFine,
              classNames: [isMyAppointment ? 'my-appointment' : 'other-appointment']
            };
          });

          const calendarApi = this.calendarComponent.getApi();
          calendarApi.removeAllEvents();
          calendarApi.addEventSource(this.events);

          console.log("eventi aggiornati:", this.events);
        },
        error: (err) => console.error("Errore caricando appuntamenti:", err)
      });
  }

  get selectedOperatorLabel(): string {
    const selected = this.operatori.find(
      (operatore) => operatore.idUtente === this.selectedOperator
    );

    if (!selected) {
      return 'Seleziona operatore';
    }

    return `${selected.nome} ${selected.cognome}`;
  }

  get availableOperators(): Utente[] {
    return this.operatori.filter(
      (operatore) => operatore.idUtente !== this.selectedOperator
    );
  }

  toggleOperatorSelect(): void {
    this.operatorSelectOpen = !this.operatorSelectOpen;
  }

  selectOperator(operatorId: number): void {
    if (this.selectedOperator === operatorId) {
      this.closeOperatorSelect();
      return;
    }

    this.selectedOperator = operatorId;
    this.onOperatorChange(null);
  }

  closeOperatorSelect(): void {
    this.operatorSelectOpen = false;
  }

  onOperatorTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleOperatorSelect();
      return;
    }

    if (event.key === 'Escape') {
      this.closeOperatorSelect();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.operatorSelectOpen = true;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;

    if (target?.closest('.appointments-select-wrapper')) {
      return;
    }

    this.closeOperatorSelect();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
