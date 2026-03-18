import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface LockerOption {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  address: string;
  postalCode: string;
  province?: string;
  note?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LockerService {
  constructor() {}

  getLockersAroundFossano(): Observable<LockerOption[]> {
    const lockers: LockerOption[] = [
      {
        id: 'fossano-1',
        name: 'Locker Fossano Centro',
        city: 'Fossano',
        lat: 44.5505,
        lng: 7.7264,
        address: 'Via Roma 12',
        postalCode: '12045',
        province: 'CN',
        note: 'Vicino al centro storico'
      },
      {
        id: 'fossano-2',
        name: 'Locker Fossano Stazione',
        city: 'Fossano',
        lat: 44.5488,
        lng: 7.7312,
        address: 'Piazza Stazione 3',
        postalCode: '12045',
        province: 'CN',
        note: 'Davanti alla stazione'
      },
      {
        id: 'fossano-3',
        name: 'Locker Fossano Piazza Castello',
        city: 'Fossano',
        lat: 44.5517,
        lng: 7.7239,
        address: 'Piazza Castello 1',
        postalCode: '12045',
        province: 'CN',
        note: 'A pochi passi dal castello'
      },
      {
        id: 'fossano-4',
        name: 'Locker Fossano Via Torino',
        city: 'Fossano',
        lat: 44.5570,
        lng: 7.7188,
        address: 'Via Torino 45',
        postalCode: '12045',
        province: 'CN',
        note: 'Zona nord'
      },
      {
        id: 'fossano-5',
        name: 'Locker Fossano Sud',
        city: 'Fossano',
        lat: 44.5438,
        lng: 7.7277,
        address: 'Via Marene 28',
        postalCode: '12045',
        province: 'CN',
        note: 'Zona sud della città'
      },
      {
        id: 'savigliano-1',
        name: 'Locker Savigliano Centro',
        city: 'Savigliano',
        lat: 44.6470,
        lng: 7.6559,
        address: 'Corso Roma 18',
        postalCode: '12038',
        province: 'CN',
        note: 'Vicino alla piazza principale'
      },
      {
        id: 'bra-1',
        name: 'Locker Bra Centro',
        city: 'Bra',
        lat: 44.6977,
        lng: 7.8544,
        address: 'Via Vittorio Emanuele 22',
        postalCode: '12042',
        province: 'CN',
        note: 'In centro'
      },
      {
        id: 'cuneo-1',
        name: 'Locker Cuneo Centro',
        city: 'Cuneo',
        lat: 44.3845,
        lng: 7.5427,
        address: 'Corso Nizza 54',
        postalCode: '12100',
        province: 'CN',
        note: 'Zona centrale'
      }
    ];

    return of(lockers);
  }
}