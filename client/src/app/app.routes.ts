import { Routes } from '@angular/router';
import { HomeBodyComponent } from './features/home-body.component/home-body.component';
import { ProductsListComponent } from './features/prodotti/products-list.component/products-list.component';
import { ProductDetailsComponent } from './features/prodotti/product-details.component/product-details.component';
import { ServicesListComponent } from './features/servizi/services-list.component/services-list.component';
import { ServiceDetailsComponent } from './features/servizi/service-details.component/service-details.component';
import { CartComponent } from './features/cart.component/cart.component';
import { PaymentComponent } from './features/payment.component/payment.component';
import { PaymentSuccessComponent } from './features/payment-success.component/payment-success.component';
import { LoginComponent } from './features/login.component/login.component';
import { RegisterComponent } from './features/register.component/register.component';
import { InfoUtenteComponent } from './features/info-utente.component/info-utente.component';
import { AppuntamentiComponent } from './features/appuntamenti.component/appuntamenti.component';
import { PasswordDimenticataComponent } from './features/password-dimenticata.component/password-dimenticata.component';
import { ResetPasswordComponent } from './features/reset-password.component/reset-password.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'home', component: HomeBodyComponent },
    { path: 'products', component: ProductsListComponent },
    { path: 'product/:id', component: ProductDetailsComponent },
    { path: 'services', component: ServicesListComponent },
    { path: 'service/:id', component: ServiceDetailsComponent },
    { path: 'cart', component: CartComponent },
    { path: 'payment', component: PaymentComponent },
    { path: 'payment-success', component: PaymentSuccessComponent },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'account', component: InfoUtenteComponent, canActivate: [authGuard] },
    { path: 'appointments', component: AppuntamentiComponent, canActivate: [authGuard] },
    { path: 'forgot-password', component: PasswordDimenticataComponent },
    { path: 'reset-password', component: ResetPasswordComponent },
    { path: '**', redirectTo: '/home' }
];
