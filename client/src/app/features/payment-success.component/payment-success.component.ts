import { Component, OnInit } from '@angular/core';
import { NavbarComponent } from '../navbar.component/navbar.component';

@Component({
  selector: 'app-payment-success.component',
  imports: [NavbarComponent],
  templateUrl: './payment-success.component.html',
  styleUrl: './payment-success.component.css',
})
export class PaymentSuccessComponent implements OnInit {

  ngOnInit() {
    this.home();
  }

  home() {
    setTimeout(() => {
      window.location.href = '/home';
    }, 8000);
  }
}


