import { Component } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login.component',
  imports: [],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  standalone: true
})
export class LoginComponent {
  email = '';
  password = '';

  constructor(private auth: AuthService, private route: Router){

  }
  login(){
    console.log(this.auth.login(this.email, this.password));

    this.auth.login(this.email, this.password)
    .subscribe(//funzione che intercetta la risposta nel server
      res => {
        this.auth.saveToken(res.token);
        this.route.navigate(['/']);
      }
    )
  }
}
