import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth'; // Assicurati che il percorso sia corretto

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  // Campi basati sul tuo DB
  userData = {
    nome: '',
    cognome: '',
    email: '',
    password: '',
    telefono: '',
    data_nascita: '',
    ruolo: 'cliente' // Valore predefinito dell'ENUM
  };

  constructor(public auth: AuthService, private router: Router) {}

  register() {
    console.log('Dati inviati:', this.userData);
    
    // Qui chiamerai il metodo del service (che dovrai creare)
    // this.auth.register(this.userData).subscribe(...)
  }
}