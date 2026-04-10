import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../navbar.component/navbar.component';
import { UtentiService } from '../../services/utentiService';
import { AppuntamentoService } from '../../services/appuntamentoService';
import { Utente } from '../../models/utente.model';
import { AuthService } from '../../services/auth';

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
  minDateTime = '';

  constructor(
    private utentiService: UtentiService,
    private appuntamentoService: AppuntamentoService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  form = {
    idOperatore: null as number | null,
    dataOraInizio: '',
    dataOraFine: '',
    stato: 'prenotato',
    note: ''
  };

  ngOnInit(): void {
    this.minDateTime = this.getCurrentDateTimeLocal();

    this.utentiService.getOperatori().subscribe({
      next: (operatori) => {
        this.operatori = operatori;

        if (!this.form.idOperatore && this.operatori.length > 0) {
          this.form.idOperatore = this.operatori[0].idUtente;
        }
      },
      error: (err: unknown) => {
        console.error(err);
      }
    });

    this.route.queryParamMap.subscribe((params) => {
      const selectedDate = params.get('data');

      if (selectedDate) {
        this.form.dataOraInizio = this.toDateTimeLocalValue(selectedDate);
      }
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
}
