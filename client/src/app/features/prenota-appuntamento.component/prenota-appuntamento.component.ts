import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../navbar.component/navbar.component';
import { UtentiService } from '../../services/utentiService';
import { AppuntamentoService } from '../../services/appuntamentoService';
import { Utente } from '../../models/utente.model';
import { Servizio } from '../../models/servizio.model';
import { AuthService } from '../../services/auth';
import { ServiziService } from '../../services/servizio';

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
  minDateTime = '';
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

    this.utentiService.getOperatori().subscribe({
      next: (operatori) => {
        this.operatori = operatori;

        this.route.queryParamMap.subscribe((params) => {
          const selectedDate = params.get('data');
          const selectedOperator = params.get('operatore');

          if (selectedDate) {
            this.form.dataOraInizio = this.toDateTimeLocalValue(selectedDate);
          }

          if (selectedOperator) {
            this.form.idOperatore = Number(selectedOperator);
          }

          // fallback se non arriva niente dai params
          if (!this.form.idOperatore && this.operatori.length > 0) {
            this.form.idOperatore = this.operatori[0].idUtente;
          }

          this.cdr.detectChanges();
        });
      },
      error: (err) => console.error(err)
    });

    this.servizioService.getServizi().subscribe({
      next: (servizi) => {
        this.servizi = servizi;

        this.route.queryParamMap.subscribe((params) => {
          const selectedServizio = params.get('servizio');

          if (selectedServizio) {
            this.form.idServizio = Number(selectedServizio);
          }

          // fallback se non arriva niente dai params
          if (!this.form.idServizio && this.servizi.length > 0) {
            this.form.idServizio = this.servizi[0].idServizio;
          }

          if (this.form.dataOraInizio && this.form.idServizio) {
            this.onServizioChange();
          }

          this.cdr.detectChanges();
        });
      },
      error: (err) => console.error(err)
    });
  }

  prenotaAppuntamento(): void {
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
      idCliente
    };

    console.log('Invio:', payload);

    this.appuntamentoService.creaAppuntamento(payload)
      .subscribe({
        next: () => {
          alert('Appuntamento prenotato!');
          this.router.navigate(['/appuntamenti']);
        },
        error: (err: unknown) => {
          console.error(err);
          alert('Errore prenotazione');
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
    const end = new Date(this.form.dataOraFine);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
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

    const durata = servizio.durata;
    //console.log(servizio.durata)

    const start = new Date(this.form.dataOraInizio);

    if (Number.isNaN(start.getTime())) return;

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + durata);

    this.form.dataOraFine = this.formatTime(end);

    this.cdr.detectChanges();
  }

  private formatTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
