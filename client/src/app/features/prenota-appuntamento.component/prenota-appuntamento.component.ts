import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../navbar.component/navbar.component';
import { UtentiService } from '../../services/utentiService';
import { AppuntamentoService } from '../../services/appuntamentoService';
import { Appuntamento } from '../../models/appuntamento.model';
import { Utente } from '../../models/utente.model';
import { Servizio } from '../../models/servizio.model';
import { AuthService } from '../../services/auth';
import { ServiziService } from '../../services/servizio';
import { forkJoin } from 'rxjs';

interface OpeningInterval {
  start: string;
  end: string;
}

interface DailySchedule {
  name: string;
  intervals: OpeningInterval[];
}

@Component({
  selector: 'app-prenota-appuntamento.component',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NavbarComponent
  ],
  templateUrl: './prenota-appuntamento.component.html',
  styleUrl: './prenota-appuntamento.component.css',
})
export class PrenotaAppuntamentoComponent implements OnInit {
  operatori: Utente[] = [];
  servizi: Servizio[] = [];
  appuntamentiOperatore: Appuntamento[] = [];
  minDateTime = '';
  availabilityMessage = '';
  bookingAlertMessage = '';
  bookingAlertType: 'success' | 'error' | null = null;
  isOperatoreOpen = false;
  isServizioOpen = false;
  private selectedServizioFromQuery: number | null = null;
  private readonly openingSchedule: Record<number, DailySchedule> = {
    0: { name: 'Domenica', intervals: [] },
    1: { name: 'Lunedi', intervals: [] },
    2: { name: 'Martedi', intervals: [{ start: '08:00', end: '12:30' }, { start: '14:00', end: '19:30' }] },
    3: { name: 'Mercoledi', intervals: [{ start: '13:00', end: '21:30' }] },
    4: { name: 'Giovedi', intervals: [{ start: '08:00', end: '12:30' }, { start: '14:00', end: '19:30' }] },
    5: { name: 'Venerdi', intervals: [{ start: '07:00', end: '19:30' }] },
    6: { name: 'Sabato', intervals: [{ start: '07:00', end: '18:00' }] }
  };

  constructor(
    private utentiService: UtentiService,
    private appuntamentoService: AppuntamentoService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private servizioService: ServiziService
  ) { }

  form = {
    idOperatore: null as number | null,
    idServizio: null as number | null,
    dataOraInizio: '',
    dataOraFine: ''
  };

  ngOnInit(): void {
    this.minDateTime = this.getCurrentDateTimeLocal();

    this.route.queryParamMap.subscribe((params) => {
      const selectedDate = params.get('data');
      const selectedOperator = params.get('operatore');
      const selectedServizio = params.get('servizio');

      if (selectedDate) {
        this.form.dataOraInizio = this.toDateTimeLocalValue(selectedDate);
      }

      if (selectedServizio) {
        const parsedServizio = Number(selectedServizio);
        this.selectedServizioFromQuery = Number.isFinite(parsedServizio) ? parsedServizio : null;
      } else {
        this.selectedServizioFromQuery = null;
      }

      if (selectedOperator) {
        const parsedOperatore = Number(selectedOperator);
        this.form.idOperatore = Number.isFinite(parsedOperatore) ? parsedOperatore : null;
      }

      if (this.operatori.length > 0) {
        this.loadServiziDisponibili();
        this.cdr.detectChanges();
      }
    });

    this.utentiService.getOperatori().subscribe({
      next: (operatori) => {
        this.operatori = operatori;
        if (!this.form.idOperatore && this.operatori.length > 0) {
          this.form.idOperatore = this.operatori[0].idUtente;
        }

        this.loadServiziDisponibili();
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err)
    });
  }

  onOperatoreChange(): void {
    this.isOperatoreOpen = false;
    this.loadServiziDisponibili();
  }

  toggleOperatoreDropdown(): void {
    this.isOperatoreOpen = !this.isOperatoreOpen;
    if (this.isOperatoreOpen) {
      this.isServizioOpen = false;
    }
  }

  toggleServizioDropdown(): void {
    if (this.servizi.length === 0) {
      return;
    }

    this.isServizioOpen = !this.isServizioOpen;
    if (this.isServizioOpen) {
      this.isOperatoreOpen = false;
    }
  }

  selectOperatore(idOperatore: number): void {
    this.form.idOperatore = idOperatore;
    this.onOperatoreChange();
  }

  selectServizio(idServizio: number): void {
    const servizio = this.servizi.find((item) => item.idServizio === idServizio);

    if (!servizio || this.isServiceDisabled(servizio)) {
      return;
    }

    this.form.idServizio = idServizio;
    this.isServizioOpen = false;
    this.onServizioChange();
  }

  getSelectedOperatoreLabel(): string {
    const operatore = this.operatori.find((item) => item.idUtente === this.form.idOperatore);
    return operatore ? `${operatore.nome} ${operatore.cognome}` : 'Seleziona operatore';
  }

  getSelectedServizioLabel(): string {
    const servizio = this.servizi.find((item) => item.idServizio === this.form.idServizio);
    return servizio ? `${servizio.nome} | ${servizio.prezzo} €` : 'Seleziona servizio';
  }

  isServiceDisabled(servizio: Servizio): boolean {
    return !!this.form.dataOraInizio && !this.isServiceAvailableForSelectedSlot(servizio);
  }

  getSelectedServizioNome(): string {
    const servizio = this.servizi.find((s) => s.idServizio === this.form.idServizio);
    return servizio?.nome ?? '';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.booking-dropdown')) {
      this.isOperatoreOpen = false;
      this.isServizioOpen = false;
    }
  }

  prenotaAppuntamento(): void {
    this.bookingAlertMessage = '';
    this.bookingAlertType = null;

    if (!this.isOraFineSuccessiva()) {
      alert('L\'orario di fine deve essere successivo all\'orario di inizio.');
      return;
    }

    const token = this.authService.getToken();
    const payloadBase64 = token?.split('.')[1];

    if (!payloadBase64) {
      alert('Sessione non valida. Effettua di nuovo il login.');
      return;
    }

    const decodedPayload = JSON.parse(atob(payloadBase64)) as { userId?: number };
    const idCliente = decodedPayload.userId;
    const note = this.getSelectedServizioNome();

    if (!idCliente) {
      alert('Impossibile identificare l\'utente. Effettua di nuovo il login.');
      return;
    }

    const validationMessage = this.validateAppointmentWindow();

    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    const payload = {
      ...this.form,
      idCliente,
      note
    };

    console.log('Invio:', payload);

    this.appuntamentoService.creaAppuntamento(payload)
      .subscribe({
        next: () => {
          this.bookingAlertType = 'success';
          this.bookingAlertMessage = 'Appuntamento prenotato con successo';
          this.cdr.detectChanges();

          setTimeout(() => {
            this.router.navigate(['/appointments']);
          }, 1500);
        },
        error: (err: unknown) => {
          console.error(err);
          this.bookingAlertType = 'error';
          this.bookingAlertMessage = 'Prenotazione dell\'appuntamento non riuscita';
          this.cdr.detectChanges();
        }
      });
  }

  private toDateTimeLocalValue(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const pad = (part: number) => part.toString().padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private getCurrentDateTimeLocal(): string {
    return this.toDateTimeLocalValue(new Date().toISOString());
  }

  private isOraFineSuccessiva(): boolean {
    if (!this.form.dataOraInizio || !this.form.dataOraFine) {
      return true;
    }

    const oraInizio = this.extractMinutesFromDateTime(this.form.dataOraInizio);
    const oraFine = this.extractMinutesFromDateTime(this.form.dataOraFine);

    if (oraInizio === null || oraFine === null) {
      return true;
    }

    return oraFine > oraInizio;
  }

  private extractMinutesFromDateTime(value: string): number | null {
    const timePart = value.split('T')[1];

    if (!timePart) {
      return null;
    }

    const [hours, minutes] = timePart.split(':').map(Number);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }

    return hours * 60 + minutes;
  }

  private validateAppointmentWindow(): string | null {
    const start = new Date(this.form.dataOraInizio);
    const end = this.getNormalizedEndDate();

    if (Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) {
      return 'Inserisci una data di inizio e una di fine valide.';
    }

    if (start < new Date()) {
      return 'Non puoi prenotare in un orario gia passato.';
    }

    if (end <= start) {
      return 'L\'orario di fine deve essere successivo all\'inizio.';
    }

    if (!this.isWithinOpeningHours(start, end)) {
      const daySchedule = this.openingSchedule[start.getDay()];

      if (!daySchedule || daySchedule.intervals.length === 0) {
        return 'Il salone e chiuso nel giorno selezionato.';
      }

      return `Puoi prenotare solo negli orari di apertura del ${daySchedule.name}.`;
    }

    return null;
  }

  private isWithinOpeningHours(start: Date, end: Date): boolean {
    if (start.toDateString() !== end.toDateString()) {
      return false;
    }

    const daySchedule = this.openingSchedule[start.getDay()];

    if (!daySchedule || daySchedule.intervals.length === 0) {
      return false;
    }

    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();

    return daySchedule.intervals.some((interval) => {
      const intervalStart = this.timeToMinutes(interval.start);
      const intervalEnd = this.timeToMinutes(interval.end);
      return startMinutes >= intervalStart && endMinutes <= intervalEnd;
    });
  }

  private timeToMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  onServizioChange(): void {
    if (!this.form.idServizio || !this.form.dataOraInizio) return;

    const servizio = this.servizi.find(
      s => s.idServizio === this.form.idServizio
    );

    if (!servizio) return;

    const end = this.calculateServiceEnd(servizio);

    if (!end) return;

    if (!this.isServiceAvailableForSelectedSlot(servizio)) {
      this.form.idServizio = null;
      this.form.dataOraFine = '';
      this.availabilityMessage =
        'Questo servizio non puo essere prenotato in questo slot perche l\'operatore ha gia un altro appuntamento in sovrapposizione.';
      this.cdr.detectChanges();
      return;
    }

    this.availabilityMessage = '';
    this.form.dataOraFine = this.formatTime(end);

    this.cdr.detectChanges();
  }

  private loadServiziDisponibili(): void {
    if (!this.form.idOperatore) {
      this.servizi = [];
      this.appuntamentiOperatore = [];
      this.form.idServizio = null;
      this.form.dataOraFine = '';
      this.availabilityMessage = '';
      this.isServizioOpen = false;
      this.cdr.detectChanges();
      return;
    }

    forkJoin({
      servizi: this.servizioService.getServiziPrenotabiliByOperatore(this.form.idOperatore),
      appuntamenti: this.appuntamentoService.getAppuntamenti(this.form.idOperatore)
    }).subscribe({
      next: ({ servizi, appuntamenti }) => {
        this.appuntamentiOperatore = appuntamenti;
        this.servizi = servizi;
        const firstAvailableService = this.servizi.find((servizio) => !this.isServiceDisabled(servizio)) ?? null;

        const queryServiceId = this.selectedServizioFromQuery;
        const hasQueryService =
          queryServiceId != null &&
          this.servizi.some(
            (servizio) => servizio.idServizio === queryServiceId && !this.isServiceDisabled(servizio)
          );

        if (hasQueryService) {
          this.form.idServizio = queryServiceId;
        } else if (!this.servizi.some((servizio) => servizio.idServizio === this.form.idServizio)) {
          this.form.idServizio = firstAvailableService?.idServizio ?? null;
        } else {
          const selectedService = this.servizi.find((servizio) => servizio.idServizio === this.form.idServizio);
          if (selectedService && this.isServiceDisabled(selectedService)) {
            this.form.idServizio = firstAvailableService?.idServizio ?? null;
          }
        }

        this.selectedServizioFromQuery = null;

        if (this.form.dataOraInizio && this.form.idServizio) {
          this.onServizioChange();
        } else if (!this.form.idServizio) {
          this.form.dataOraFine = '';
        }

        this.isServizioOpen = false;
        this.updateAvailabilityMessage();

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.servizi = [];
        this.appuntamentiOperatore = [];
        this.form.idServizio = null;
        this.form.dataOraFine = '';
        this.availabilityMessage = '';
        this.isServizioOpen = false;
        this.cdr.detectChanges();
      }
    });
  }

  private isServiceAvailableForSelectedSlot(servizio: Servizio): boolean {
    const start = new Date(this.form.dataOraInizio);
    const end = this.calculateServiceEnd(servizio);

    if (Number.isNaN(start.getTime()) || !end) {
      return true;
    }

    return !this.appuntamentiOperatore.some((appuntamento) => {
      const appointmentStart = new Date(appuntamento.dataOraInizio);
      const appointmentEnd = new Date(appuntamento.dataOraFine);

      if (Number.isNaN(appointmentStart.getTime()) || Number.isNaN(appointmentEnd.getTime())) {
        return false;
      }

      return start < appointmentEnd && end > appointmentStart;
    });
  }

  private calculateServiceEnd(servizio: Servizio): Date | null {
    const start = new Date(this.form.dataOraInizio);

    if (Number.isNaN(start.getTime())) {
      return null;
    }

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + Number(servizio.durata || 0));
    return end;
  }

  private getNormalizedEndDate(): Date | null {
    if (!this.form.dataOraInizio || !this.form.dataOraFine) {
      return null;
    }

    const endValue = this.form.dataOraFine.includes('T')
      ? this.form.dataOraFine
      : `${this.form.dataOraInizio.split('T')[0]}T${this.form.dataOraFine}`;

    const end = new Date(endValue);
    return Number.isNaN(end.getTime()) ? null : end;
  }

  private updateAvailabilityMessage(): void {
    if (!this.form.dataOraInizio) {
      this.availabilityMessage = '';
      return;
    }

    if (this.servizi.length === 0) {
      this.availabilityMessage =
        'Nessun servizio e disponibile in questo orario per l\'operatore selezionato.';
      return;
    }

    this.availabilityMessage = '';
  }

  private formatTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
