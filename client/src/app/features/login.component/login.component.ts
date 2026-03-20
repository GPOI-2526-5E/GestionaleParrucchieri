import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login.component',
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  standalone: true
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  rememberMe: boolean = false;

  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private auth: AuthService,
    private route: Router
  ) {}

  ngOnInit(): void {
    const savedEmail = localStorage.getItem('rememberedEmail');

    if (savedEmail) {
      this.email = savedEmail;
      this.rememberMe = true;
    }
  }

  goBack(): void {
    window.history.back();
  }

  login(): void {
    if (!this.email || !this.password) {
      this.errorMessage = 'Inserisci email e password.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.auth.saveToken(res.token);

        if (this.rememberMe) {
          localStorage.setItem('rememberedEmail', this.email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        this.route.navigate(['/products']);
      },
      error: (err) => {
        console.error('Errore login:', err);
        this.errorMessage = 'Email o password non validi.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
}