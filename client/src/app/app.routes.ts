import { Routes } from '@angular/router';
import { ProductsListComponent } from './features/products/products-list.component/products-list.component';
import { HomeBodyComponent } from './features/home-body.component/home-body.component';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'home', component: HomeBodyComponent },
    { path: 'products', component: ProductsListComponent }
];