import { Component, OnInit, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import itLocale from '@fullcalendar/core/locales/it';
import { NavbarComponent } from '../navbar.component/navbar.component';
import { FormsModule } from '@angular/forms';
import { UtentiService } from '../../services/utentiService';
import { Utente } from "../../models/utente.model";
import { AppuntamentoService } from "../../services/appuntamentoService";
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface OpeningInterval {
  start: string;
  end: string;
}

interface DailySchedule {
  name: string;
  intervals: OpeningInterval[];
}

@Component({
  selector: 'app-appuntamenti',
  standalone: true,
  imports: [
    CommonModule,
    FullCalendarModule,
    NavbarComponent,
    FormsModule
  ],
  templateUrl: './appuntamenti.component.html',
  styleUrls: ['./appuntamenti.component.css']
})
export class AppuntamentiComponent implements OnInit {

  private api = 'http://localhost:3000/api/auth';
  private readonly openingSchedule: Record<number, DailySchedule> = {
    0: { name: 'Domenica', intervals: [] },
    1: { name: 'Lunedi', intervals: [] },
    2: { name: 'Martedi', intervals: [{ start: '08:00', end: '12:30' }, { start: '14:00', end: '19:30' }] },
    3: { name: 'Mercoledi', intervals: [{ start: '13:00', end: '21:30' }] },
    4: { name: 'Giovedi', intervals: [{ start: '08:00', end: '12:30' }, { start: '14:00', end: '19:30' }] },
    5: { name: 'Venerdi', intervals: [{ start: '07:00', end: '19:30' }] },
    6: { name: 'Sabato', intervals: [{ start: '07:00', end: '18:00' }] }
  };
  readonly openingScheduleList: DailySchedule[] = [
    this.openingSchedule[1],
    this.openingSchedule[2],
    this.openingSchedule[3],
    this.openingSchedule[4],
    this.openingSchedule[5],
    this.openingSchedule[6],
    this.openingSchedule[0]
  ];

  selectedOperator: number | null = null;
  operatorSelectOpen = false;
  operatori: Utente[] = [];
  user: any = null;
  showError = false;
  shakeAnimation = false;
  errorMessage = '';
  private alertTimeout: ReturnType<typeof setTimeout> | null = null;

  events: EventInput[] = [];
  private availabilityMaskEvents: EventInput[] = [];
  private visibleRangeStart: Date | null = null;
  private visibleRangeEnd: Date | null = null;

  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;

  calendarOptions: CalendarOptions = {
    plugins: [timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    locale: itLocale,
    firstDay: 1,
    allDaySlot: false,
    slotMinTime: '07:00:00',
    slotMaxTime: '21:30:00',
    slotDuration: '00:30:00',
    slotLabelInterval: '00:30',
    displayEventTime: true,
    displayEventEnd: true,
    expandRows: false,
    height: '72vh',
    nowIndicator: true,
    stickyHeaderDates: true,
    selectable: true,
    businessHours: [
      { daysOfWeek: [2, 4], startTime: '08:00', endTime: '12:30' },
      { daysOfWeek: [2, 4], startTime: '14:00', endTime: '19:30' },
      { daysOfWeek: [3], startTime: '13:00', endTime: '21:30' },
      { daysOfWeek: [5], startTime: '07:00', endTime: '19:30' },
      { daysOfWeek: [6], startTime: '07:00', endTime: '18:00' }
    ],
    datesSet: this.handleDatesSet.bind(this),
    dateClick: this.handleDateClick.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventOverlap: false,
    slotEventOverlap: false,
    eventMinHeight: 44,
    eventShortHeight: 0,
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
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit() {
    this.getLoggedUser();

    this.utenteService.getOperatori().subscribe({
      next: (operatori) => {
        this.operatori = operatori;

        if (this.operatori.length > 0) {
          this.selectedOperator = this.operatori[0].idUtente;
          this.onOperatorChange(null);
        }

        this.cdr.detectChanges();
      },
      error: (err) => console.error("Errore caricando operatori:", err)
    });


  }

  handleDateClick(arg: any) {
    const clickedDate = arg.date instanceof Date ? arg.date : new Date(arg.date);

    if (!this.isBookableDateTime(clickedDate)) {
      this.showAlert(this.getInvalidSlotMessage(clickedDate));
      return;
    }

    this.router.navigate(['/prenotazione'], {
      queryParams: { data: arg.dateStr, operatore: this.selectedOperator}
    });
  }

  handleEventClick(arg: any) {
    if (arg.event?.display === 'background') {
      const startDate = arg.event.start instanceof Date
        ? arg.event.start
        : new Date(arg.event.start);

      this.showAlert(this.getInvalidSlotMessage(startDate));
      return;
    }

    this.router.navigate(['/dettaglio-appuntamento'], {
      queryParams: {
        start: arg.event.start?.toISOString(),
        end: arg.event.end?.toISOString()
      }
    })
  }

  getLoggedUser() {
      this.http.get<any>(`${this.api}/me`)
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
          error: () => {
            // Utente non loggato: il calendario resta visibile, ma senza evidenziare "Tuo appuntamento".
            this.user = null;
            this.cdr.detectChanges();
          }
        });
    }

  onOperatorChange(event: any) {
      this.closeOperatorSelect();

      if(!this.selectedOperator) return;

    this.appuntamentoService.getAppuntamenti(this.selectedOperator)
      .subscribe({
        next: (eventi) => {
          console.log(eventi);
          // Mostriamo il titolo solo per gli appuntamenti del cliente loggato:
          // gli altri slot restano prenotati ma senza dettagli sensibili.
          this.events = eventi.map(a => {
            const isMyAppointment = a.idCliente && this.user?.idUtente && a.idCliente === this.user.idUtente;
            return {
              title: isMyAppointment ? `${a.note}` : '',
              start: a.dataOraInizio,
              end: a.dataOraFine,
              classNames: [isMyAppointment ? 'my-appointment' : 'other-appointment']
            };
          });
          this.refreshCalendarEvents();
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

  private showAlert(message: string): void {
    this.errorMessage = message;
    this.showError = true;
    this.shakeAnimation = false;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.shakeAnimation = true;
      this.cdr.detectChanges();
    }, 10);

    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }

    this.alertTimeout = setTimeout(() => {
      this.showError = false;
      this.cdr.detectChanges();
    }, 2600);
  }

  private handleDatesSet(arg: { start: Date; end: Date }): void {
    this.visibleRangeStart = arg.start;
    this.visibleRangeEnd = arg.end;
    this.refreshCalendarEvents();
  }

  private refreshCalendarEvents(): void {
    if (!this.calendarComponent) {
      return;
    }

    this.availabilityMaskEvents = this.buildAvailabilityMaskEvents();

    const calendarApi = this.calendarComponent.getApi();
    calendarApi.removeAllEvents();
    calendarApi.addEventSource([
      ...this.availabilityMaskEvents,
      ...this.events
    ]);
  }

  private isBookableDateTime(date: Date): boolean {
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    if (this.isPastSlot(date)) {
      return false;
    }

    return this.isWithinOpeningHours(date);
  }

  private isPastSlot(date: Date): boolean {
    const now = new Date();

    if (date.toDateString() !== now.toDateString()) {
      return date < now;
    }

    return date < now;
  }

  private isWithinOpeningHours(date: Date): boolean {
    const daySchedule = this.openingSchedule[date.getDay()];

    if (!daySchedule || daySchedule.intervals.length === 0) {
      return false;
    }

    const minutes = date.getHours() * 60 + date.getMinutes();

    return daySchedule.intervals.some((interval) => {
      const start = this.timeToMinutes(interval.start);
      const end = this.timeToMinutes(interval.end);
      return minutes >= start && minutes < end;
    });
  }

  private getInvalidSlotMessage(date: Date): string {
    if (date < new Date()) {
      return 'Non puoi prenotare in un orario gia passato.';
    }

    const daySchedule = this.openingSchedule[date.getDay()];

    if (!daySchedule || daySchedule.intervals.length === 0) {
      return 'Il salone e chiuso in questo giorno.';
    }

    return `Puoi prenotare solo negli orari di apertura del ${daySchedule.name}.`;
  }

  private timeToMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private buildAvailabilityMaskEvents(): EventInput[] {
    if (!this.visibleRangeStart || !this.visibleRangeEnd) {
      return [];
    }

    const maskEvents: EventInput[] = [];
    const viewStart = new Date(this.visibleRangeStart);
    const viewEnd = new Date(this.visibleRangeEnd);
    const now = new Date();

    for (const day = new Date(viewStart); day < viewEnd; day.setDate(day.getDate() + 1)) {
      const currentDay = new Date(day);
      const slotStart = this.withTime(currentDay, '07:00');
      const slotEnd = this.withTime(currentDay, '22:00');
      const daySchedule = this.openingSchedule[currentDay.getDay()];

      if (this.startOfDay(currentDay) < this.startOfDay(now)) {
        maskEvents.push(this.createMaskEvent(slotStart, slotEnd, ['invalid-slot-background', 'is-past-slot']));
        continue;
      }

      if (!daySchedule || daySchedule.intervals.length === 0) {
        maskEvents.push(this.createMaskEvent(slotStart, slotEnd, ['invalid-slot-background']));
        continue;
      }

      let cursor = new Date(slotStart);

      for (const interval of daySchedule.intervals) {
        const intervalStart = this.withTime(currentDay, interval.start);
        const intervalEnd = this.withTime(currentDay, interval.end);

        if (cursor < intervalStart) {
          maskEvents.push(this.createMaskEvent(cursor, intervalStart, ['invalid-slot-background']));
        }

        cursor = new Date(intervalEnd);
      }

      if (cursor < slotEnd) {
        maskEvents.push(this.createMaskEvent(cursor, slotEnd, ['invalid-slot-background']));
      }

      if (currentDay.toDateString() === now.toDateString()) {
        const pastEnd = new Date(now);

        if (pastEnd > slotStart) {
          maskEvents.push(this.createMaskEvent(slotStart, pastEnd, ['invalid-slot-background', 'is-past-slot']));
        }
      }
    }

    return maskEvents;
  }

  private createMaskEvent(start: Date, end: Date, classNames: string[]): EventInput {
    return {
      start,
      end,
      display: 'background',
      overlap: false,
      classNames
    };
  }

  private withTime(baseDate: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  private startOfDay(date: Date): Date {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    return day;
  }
}
