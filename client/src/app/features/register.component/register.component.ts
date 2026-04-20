import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ChangeDetectorRef } from '@angular/core';
import { IntlTelInputComponent } from 'intl-tel-input/angularWithUtils';

interface CalendarPickerDay {
  date: Date;
  label: number;
  currentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IntlTelInputComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {

  userData = {
    nome: '',
    cognome: '',
    email: '',
    password: '',
    telefono: '',
    data_nascita: '',
    ruolo: 'cliente'
  };

  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  isSuccess = false;
  isPhoneValid = false;
  alertMessage: string | null = null;
  alertType: 'success' | 'error' | 'warning' = 'error';
  birthDatePickerOpen = false;
  birthDatePickerClosing = false;
  birthDatePickerMonth = new Date();
  birthDatePickerDays: CalendarPickerDay[] = [];
  readonly calendarPickerWeekdays = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'];
  readonly calendarPickerMonthFormatter = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' });
  private birthDatePickerCloseTimeout: ReturnType<typeof setTimeout> | null = null;

  initTelOptions = {
    initialCountry: 'auto' as const,
    geoIpLookup: (
      success: (iso2: any) => void,
      failure: () => void
    ) => {
      fetch('https://ipapi.co/json/')
        .then((res) => res.json())
        .then((data) => {
          const code = String(data?.country_code || 'it').toLowerCase();
          success(code as any);
        })
        .catch(() => {
          success('it' as any);
          failure();
        });
    },
    preferredCountries: ['it', 'gb', 'fr', 'de', 'es', 'us'],
    separateDialCode: true,
    nationalMode: false,
    strictMode: true,
    formatOnDisplay: true,
    autoPlaceholder: 'polite' as const
  };

  constructor(public auth: AuthService, private router: Router,
    private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.syncBirthDatePickerMonth(this.parseInputDate(this.userData.data_nascita) ?? new Date());
  }


  isPasswordMatch(): boolean {
    return this.userData.password === this.confirmPassword && this.confirmPassword.length > 0;
  }

  getPasswordErrors(): string[] {
    const errors: string[] = [];

    if (!this.userData.password || this.userData.password.length < 5) {
      errors.push('La password deve avere almeno 5 caratteri');
    }

    if (this.confirmPassword && this.userData.password !== this.confirmPassword) {
      errors.push('Le password non coincidono');
    }

    return errors;
  }

  getPasswordChecklist() {
    return [
      {
        label: 'Almeno 5 caratteri',
        valid: this.userData.password.length >= 5
      },
      {
        label: 'Almeno una lettera maiuscola',
        valid: /[A-Z]/.test(this.userData.password)
      },
      {
        label: 'Almeno un numero o carattere speciale',
        valid: /[0-9!@#$%^&*(),.?":{}|<>]/.test(this.userData.password)
      },
      {
        label: 'Le password coincidono',
        valid:
          this.userData.password.length > 0 &&
          this.confirmPassword.length > 0 &&
          this.userData.password === this.confirmPassword
      }
    ];
  }

  isPasswordValid(): boolean {
    return this.getPasswordChecklist().every(item => item.valid);
  }

  isValidPhone(): boolean {
    return this.isPhoneValid && this.userData.telefono.trim() !== '';
  }

  onPhoneNumberChange(phoneNumber: string): void {
    this.userData.telefono = phoneNumber || '';
  }

  onPhoneValidityChange(isValid: boolean): void {
    this.isPhoneValid = isValid;
  }

  isAdult(): boolean {
    if (!this.userData.data_nascita) return false;

    const today = new Date();
    const birth = new Date(this.userData.data_nascita);

    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age >= 18;
  }

  isFormValid(): boolean {
    return (
      this.userData.nome.trim() !== '' &&
      this.userData.cognome.trim() !== '' &&
      this.userData.email.trim() !== '' &&

      this.isPasswordValid() &&

      this.isValidPhone() &&
      this.isAdult()
    );
  }

  register() {
    if (!this.isFormValid()) return;

    this.isLoading = true;
    this.isSuccess = false; 
    this.alertMessage = '';  
    this.alertType = 'success';

    this.auth.register(this.userData).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSuccess = true;
        this.alertMessage = 'Registrazione completata e accesso effettuato. Stai per essere reindirizzato alla home...';
        this.alertType = 'success';

        this.cdr.detectChanges(); 
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 1500);
      },
      error: (err) => {
        this.isLoading = false;
        this.isSuccess = false;
        this.alertMessage = err.error?.message || 'Errore nella registrazione';
        this.alertType = 'error';

        this.cdr.detectChanges(); 
        setTimeout(() => {
          this.alertMessage = null;
          this.cdr.detectChanges();
        }, 5000);
      }
    });
  }

  goBack() {
    this.router.navigate(['/login']);
  }

  get birthDateDisplayValue(): string {
    const date = this.parseInputDate(this.userData.data_nascita);

    if (!date) {
      return 'gg/mm/aaaa';
    }

    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  get birthDatePickerMonthLabel(): string {
    const label = this.calendarPickerMonthFormatter.format(this.birthDatePickerMonth);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  toggleBirthDatePicker(): void {
    if (this.birthDatePickerOpen) {
      this.closeBirthDatePicker();
      return;
    }

    if (this.birthDatePickerCloseTimeout) {
      clearTimeout(this.birthDatePickerCloseTimeout);
      this.birthDatePickerCloseTimeout = null;
    }

    this.birthDatePickerClosing = false;
    this.birthDatePickerOpen = true;
    this.syncBirthDatePickerMonth(this.parseInputDate(this.userData.data_nascita) ?? new Date());
  }

  closeBirthDatePicker(): void {
    if (!this.birthDatePickerOpen || this.birthDatePickerClosing) {
      return;
    }

    this.birthDatePickerClosing = true;
    this.birthDatePickerCloseTimeout = setTimeout(() => {
      this.birthDatePickerOpen = false;
      this.birthDatePickerClosing = false;
      this.birthDatePickerCloseTimeout = null;
      this.cdr.detectChanges();
    }, 180);
  }

  previousBirthDatePickerMonth(): void {
    const next = new Date(this.birthDatePickerMonth);
    next.setMonth(next.getMonth() - 1, 1);
    this.syncBirthDatePickerMonth(next);
  }

  nextBirthDatePickerMonth(): void {
    const next = new Date(this.birthDatePickerMonth);
    next.setMonth(next.getMonth() + 1, 1);
    this.syncBirthDatePickerMonth(next);
  }

  selectBirthDatePickerDay(day: CalendarPickerDay): void {
    this.userData.data_nascita = this.formatDateForInput(day.date);
    this.syncBirthDatePickerMonth(day.date);
    this.closeBirthDatePicker();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;

    if (!target?.closest('.birthdate-picker')) {
      this.closeBirthDatePicker();
    }
  }

  private syncBirthDatePickerMonth(baseDate: Date): void {
    this.birthDatePickerMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    this.birthDatePickerDays = this.buildCalendarPickerDays(this.birthDatePickerMonth);
  }

  private buildCalendarPickerDays(monthDate: Date): CalendarPickerDay[] {
    const firstDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const start = new Date(firstDayOfMonth);
    const firstWeekday = (firstDayOfMonth.getDay() + 6) % 7;
    start.setDate(start.getDate() - firstWeekday);

    const selectedValue = this.userData.data_nascita;
    const todayValue = this.formatDateForInput(new Date());
    const days: CalendarPickerDay[] = [];

    for (let i = 0; i < 42; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      const currentValue = this.formatDateForInput(current);

      days.push({
        date: current,
        label: current.getDate(),
        currentMonth: current.getMonth() === monthDate.getMonth(),
        isToday: currentValue === todayValue,
        isSelected: currentValue === selectedValue
      });
    }

    return days;
  }

  private parseInputDate(value: string): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getPasswordStatus(): { valid: boolean; message: string } {

    if (!this.userData.password && !this.confirmPassword) {
      return { valid: false, message: '' };
    }

    if (this.userData.password.length < 6) {
      return { valid: false, message: 'La password deve avere almeno 6 caratteri' };
    }

    if (this.confirmPassword.length === 0) {
      return { valid: false, message: 'Conferma la password' };
    }

    if (this.userData.password !== this.confirmPassword) {
      return { valid: false, message: 'Le password non coincidono' };
    }

    return { valid: true, message: 'Password corretta ✓' };
  }
}
