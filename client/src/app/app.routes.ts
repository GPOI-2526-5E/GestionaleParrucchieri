import { Routes } from '@angular/router';
import { HomeBodyComponent } from './features/home-body.component/home-body.component';
import { ProductsListComponent } from './features/prodotti/products-list.component/products-list.component';
import { ServicesListComponent } from './features/servizi/services-list.component/services-list.component';
import { ServiceDetailsComponent } from './features/servizi/service-details.component/service-details.component';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'home', component: HomeBodyComponent },
    { path: 'products', component: ProductsListComponent },
    { path: 'services', component: ServicesListComponent },
    { path: 'service/:id', component: ServiceDetailsComponent },
    { path: '**', redirectTo: '/home' }
];