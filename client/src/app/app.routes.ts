import { Routes } from '@angular/router';
import { HomeBodyComponent } from './features/home-body.component/home-body.component';
import { ProductsListComponent } from './features/prodotti/products-list.component/products-list.component';
import { ProductDetailsComponent } from './features/prodotti/product-details.component/product-details.component';
import { ServicesListComponent } from './features/servizi/services-list.component/services-list.component';
import { ServiceDetailsComponent } from './features/servizi/service-details.component/service-details.component';
import { CartComponent } from './features/cart.component/cart.component';
import { LoginComponent } from './features/login.component/login.component';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'home', component: HomeBodyComponent },
    { path: 'products', component: ProductsListComponent },
    { path: 'product/:id', component: ProductDetailsComponent },
    { path: 'services', component: ServicesListComponent },
    { path: 'service/:id', component: ServiceDetailsComponent },
    { path: 'cart', component: CartComponent },
    { path: 'login', component: LoginComponent},
    { path: '**', redirectTo: '/home' }
];