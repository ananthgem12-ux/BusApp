import { Component, OnInit } from '@angular/core';

import {
  IonContent
} from '@ionic/angular/standalone';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  Router
} from '@angular/router';

@Component({

  selector: 'app-booking',

  templateUrl: './booking.page.html',

  styleUrls: [
    './booking.page.scss'
  ],

  standalone: true,

  imports: [
    IonContent,
    CommonModule,
    FormsModule
  ]

})

export class BookingPage implements OnInit {

  routesCache: Record<string, any> = {};
  customBusData: Record<string, any> = {};
  globalCustomStops: string[] = [];
  globalCustomRates: Record<string, number> = {};
  isLoading = false;

  showSourceSelect = true;
  showDestSelect = true;
  sourceSearchQuery = '';
  destSearchQuery = '';
  isEditingBus = false;

  busList = [
    '555S',
    '570S',
    'MAA2',
    '19',
    '102P',
    '102Xct'
  ];

  busTypes = [
    'Ordinary',
    'Delux',
    'AC'
  ];

  
  busType = 'Delux';

  get busImage() {
    if (this.busType === 'AC') {
      return 'assets/bus_red_1.png';
    } else if (this.busType === 'Delux') {
      return 'assets/bus_blue.png';
    } else if (this.busType === 'Ordinary') {
      return 'assets/bus_pink.png';
    } else {
      return 'assets/bus_white_.png';
    }
  }
  busNo = '570S';
  source = 'M.G.R.KOYAMBEDU';
  destination = 'KELAMBAKKAM';
  showSource = false;
  showDestination = false;

  sourceStops = [
    'Navalur',
    'Kelambakkam',
    'Perungudi',
    'Sholinganallur'
  ];

  destinationStops = [
    'Siruseri I.T.Park',
    'SIPCOT',
    'Tidel Park',
    'OMR'
  ];

  constructor(
    private router: Router
  ) {

    const state = history.state;

    this.ticketCode =
      state.ticket || '';

    this.loadCustomBusData();
  }

  loadCustomBusData() {
    try {
      const stored = localStorage.getItem('custom_bus_data');
      if (stored) {
        this.customBusData = JSON.parse(stored);
      }
      const globalStops = localStorage.getItem('global_custom_stops');
      if (globalStops) {
        this.globalCustomStops = JSON.parse(globalStops);
      }
      const globalRates = localStorage.getItem('global_custom_rates');
      if (globalRates) {
        this.globalCustomRates = JSON.parse(globalRates);
      }
    } catch (e) {
      console.error('Failed to load custom bus data', e);
    }
  }

  saveCustomBusData() {
    try {
      localStorage.setItem('custom_bus_data', JSON.stringify(this.customBusData));
      localStorage.setItem('global_custom_stops', JSON.stringify(this.globalCustomStops));
      localStorage.setItem('global_custom_rates', JSON.stringify(this.globalCustomRates));
    } catch (e) {}
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  async ngOnInit() {
    // Logic moved to ionViewWillEnter to handle Ionic page caching
  }

  async ionViewWillEnter() {
    const state = history.state;
    if (state && state.ticket !== undefined) {
      this.ticketCode = state.ticket || '';
    }

    const otp = this.ticketCode.trim().toUpperCase();
    let mappedBus = null;
    
    if (otp) {
      try {
        const otpMapStr = localStorage.getItem('otp_bus_map');
        if (otpMapStr) {
          const otpMap = JSON.parse(otpMapStr);
          if (otpMap[otp]) {
            mappedBus = otpMap[otp];
          }
        }
      } catch(e) {}
    }

    if (mappedBus) {
      this.busNo = mappedBus;
    } else {
      const lastUsedBus = localStorage.getItem('last_used_bus');
      if (lastUsedBus) {
        this.busNo = lastUsedBus;
      }
    }
    
    await this.loadRoutes();
  }

  async loadRoutes() {
    try {
      let cachedData: Record<string, any> = {};
      const cached = localStorage.getItem('mtc_routes');
      if (cached) {
        cachedData = JSON.parse(cached);
      }

      try {
        const res = await fetch('assets/default_routes.json');
        const defaultRoutes = await res.json();
        this.routesCache = {
          ...defaultRoutes,
          ...cachedData
        };
      } catch (err) {
        console.error('Failed to load default_routes.json, using localStorage cache only:', err);
        this.routesCache = cachedData;
      }

      localStorage.setItem('mtc_routes', JSON.stringify(this.routesCache));

      let usedBuses: string[] = [];
      try {
        const stored = localStorage.getItem('active_tickets');
        if (stored) {
          const tickets = JSON.parse(stored);
          tickets.forEach((t: any) => {
            if (t.bus) usedBuses.push(t.bus.toUpperCase());
          });
        }
      } catch (e) {
        console.error('Failed to parse active_tickets for busList:', e);
      }

      const keys = Object.keys(this.routesCache);
      if (keys.length > 0) {
        this.busList = Array.from(new Set([...this.busList, ...keys, ...usedBuses]));
      } else {
        this.busList = Array.from(new Set([...this.busList, ...usedBuses]));
      }

      this.updateStopsForBus();
    } catch (e) {
      console.error('Error in loadRoutes:', e);
    }
  }

  async onBusNoChange() {
    this.userOverridePrice = null;
    const route = this.busNo.trim().toUpperCase();
    if (!route) return;

    if (this.routesCache[route]) {
      this.updateStopsForBus();
    } else {
      this.isLoading = true;
      try {
        const data = await this.fetchRouteFromWeb(route);
        if (data) {
          this.routesCache[route] = data;
          localStorage.setItem('mtc_routes', JSON.stringify(this.routesCache));
          if (!this.busList.includes(route)) {
            this.busList.push(route);
          }
          this.updateStopsForBus();
        } else {
          console.warn(`Could not fetch route stages for ${route} from MTC.`);
        }
      } catch (e) {
        console.error('Failed to fetch route:', e);
      } finally {
        this.isLoading = false;
      }
    }
  }

  updateStopsForBus() {
    const route = this.busNo.trim().toUpperCase();
    let stops: string[] = [];
    let defaultSource = 'M.G.R.KOYAMBEDU';
    let defaultDest = 'KELAMBAKKAM';

    const data = this.routesCache[route];
    if (data && data.stages && data.stages.length > 0) {
      stops = data.stages.map((s: any) => s.stage_name);
      defaultSource = data.stages[0].stage_name || data.origin || stops[0];
      defaultDest = data.stages[data.stages.length - 1].stage_name || data.destination || stops[stops.length - 1];
    }

    const customData = this.customBusData[route] || { customStops: [] };
    const routeCustomStops = customData.customStops || [];
    
    // Merge standard stops with both route-specific and global custom stops
    const allStops = Array.from(new Set([...stops, ...routeCustomStops, ...this.globalCustomStops]));
    
    if (allStops.length > 0) {
      this.sourceStops = allStops;
      this.destinationStops = allStops;
    }

    this.source = customData.lastSource || defaultSource;
    this.destination = customData.lastDestination || defaultDest;
  }

  async fetchRouteFromWeb(routeNo: string): Promise<any> {
    const cleanRoute = routeNo.trim().toUpperCase();
    if (!cleanRoute) return null;

    let data = await this.doFetchAndParse(cleanRoute);
    
    // Fuzzy fallback 1: if ends with 'S' and fails, try without 'S'
    if (!data && cleanRoute.endsWith('S') && cleanRoute.length > 1) {
      const fallbackRoute = cleanRoute.slice(0, -1);
      data = await this.doFetchAndParse(fallbackRoute);
      if (data) {
        data.route_no = cleanRoute;
      }
    }

    // Fuzzy fallback 2: if ends with 'CT' and fails, try without 'CT'
    if (!data && cleanRoute.endsWith('CT') && cleanRoute.length > 2) {
      const fallbackRoute = cleanRoute.slice(0, -2);
      data = await this.doFetchAndParse(fallbackRoute);
      if (data) {
        data.route_no = cleanRoute;
      }
    }

    return data;
  }

  async doFetchAndParse(routeNo: string): Promise<any> {
    const encodedRoute = encodeURIComponent(routeNo);
    const url = `https://mtcbus.tn.gov.in/Home/routewiseinfo?selroute=${encodedRoute}&submit=`;
    
    let html = '';
    try {
      const { CapacitorHttp } = await import('@capacitor/core');
      const response = await CapacitorHttp.get({
        url: url,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      html = response.data;
    } catch (e) {
      console.log('CapacitorHttp failed/unavailable, trying standard fetch:', e);
      const response = await fetch(url);
      html = await response.text();
    }

    if (!html) return null;

    const routeMatch = html.match(/<ul class="route">([\s\S]*?)<\/ul>/);
    const stages: { sequence: number; stage_name: string }[] = [];
    if (routeMatch) {
      const itemRegex = /<li><span>(\d+)<\/span>\s*([\s\S]*?)\s*<\/li>/g;
      let match;
      while ((match = itemRegex.exec(routeMatch[1])) !== null) {
        stages.push({
          sequence: parseInt(match[1], 10),
          stage_name: match[2].replace(/\s+/g, ' ').trim()
        });
      }
    }

    let origin = '';
    let destination = '';
    
    const originMatch = html.match(/<span class="color-brown">Origin<\/span>\s*<h5>([\s\S]*?)<\/h5>/);
    if (originMatch) {
      origin = originMatch[1].replace(/\s+/g, ' ').trim();
    }

    const destMatch = html.match(/<span class="color-dblue">Destination<\/span>\s*<h5>([\s\S]*?)<\/h5>/);
    if (destMatch) {
      destination = destMatch[1].replace(/\s+/g, ' ').trim();
    }

    if (stages.length === 0 && !origin && !destination) {
      return null;
    }

    return {
      route_no: routeNo,
      origin: origin,
      destination: destination,
      stages_count: stages.length,
      stages: stages
    };
  }



  /* PRICE */

  private readonly deluxFares = [
    0, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29,
    31, 31, 33, 33, 35, 35, 37, 37, 39, 39,
    41, 41, 43, 43, 45, 45, 47, 47, 49, 49
  ];

  private readonly acFares = [
    0, 15, 15, 20, 20, 20, 30, 30, 30, 40, 40,
    40, 40, 40, 40, 50, 50, 50, 50, 60, 60,
    60, 60, 60, 70, 70, 70, 70, 80, 80, 80
  ];

  private readonly ordinaryFares = [
    0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    15, 15, 16, 16, 17, 17, 18, 18, 19, 19,
    20, 20, 21, 21, 22, 22, 23, 23, 24, 24
  ];

  userOverridePrice: number | null = null;

  get calculatedFare(): number {
    const route = this.busNo.trim().toUpperCase();
    const key = `${this.source}|${this.destination}`;
    
    // 1. Check global custom rates first
    if (this.globalCustomRates[key] !== undefined) {
      return this.globalCustomRates[key];
    }

    // 2. Check route-specific custom rates
    const customData = this.customBusData[route];
    if (customData && customData.customRates) {
      if (customData.customRates[key] !== undefined) {
        return customData.customRates[key];
      }
    }

    const data = this.routesCache[route];
    if (!data || !data.stages || data.stages.length === 0) {
      if (this.busType.toLowerCase() === 'ac') return 15;
      if (this.busType.toLowerCase() === 'ordinary') return 5;
      return 13;
    }

    const sourceIdx = data.stages.findIndex((s: any) => s.stage_name === this.source);
    const destIdx = data.stages.findIndex((s: any) => s.stage_name === this.destination);

    if (sourceIdx === -1 || destIdx === -1) {
      if (this.busType.toLowerCase() === 'ac') return 15;
      if (this.busType.toLowerCase() === 'ordinary') return 5;
      return 13;
    }

    const stagesCount = Math.max(1, Math.abs(sourceIdx - destIdx));
    
    let fareArray = this.deluxFares;
    if (this.busType.toLowerCase() === 'ac') {
      fareArray = this.acFares;
    } else if (this.busType.toLowerCase() === 'ordinary') {
      fareArray = this.ordinaryFares;
    }

    if (stagesCount >= fareArray.length) {
      return fareArray[fareArray.length - 1];
    }
    return fareArray[stagesCount];
  }

  get ticketPrice(): number {
    if (this.userOverridePrice !== null) {
      return this.userOverridePrice;
    }
    return this.calculatedFare;
  }

  /* PERSON */

  persons = 1;

  /* TICKET CODE */

  ticketCode = '';



  /* SELECT STOPS */

  filteredSourceStops() {
    const query = this.sourceSearchQuery.trim();
    if (!query) {
      return this.sourceStops;
    }
    const lowerQuery = query.toLowerCase();
    const matches = this.sourceStops.filter(stop => stop.toLowerCase().includes(lowerQuery));
    const exactMatch = this.sourceStops.some(stop => stop.toLowerCase() === lowerQuery);
    if (!exactMatch) {
      return [query, ...matches];
    }
    return matches;
  }

  filteredDestStops() {
    const query = this.destSearchQuery.trim();
    if (!query) {
      return this.destinationStops;
    }
    const lowerQuery = query.toLowerCase();
    const matches = this.destinationStops.filter(stop => stop.toLowerCase().includes(lowerQuery));
    const exactMatch = this.destinationStops.some(stop => stop.toLowerCase() === lowerQuery);
    if (!exactMatch) {
      return [query, ...matches];
    }
    return matches;
  }

  selectSourceStop(stop: string) {
    this.source = stop;
    this.showSourceSelect = false;
    this.sourceSearchQuery = '';
    this.userOverridePrice = null;
  }

  selectDestStop(stop: string) {
    this.destination = stop;
    this.showDestSelect = false;
    this.destSearchQuery = '';
    this.userOverridePrice = null;
  }

  toggleSourceSelect() {
    this.showSourceSelect = !this.showSourceSelect;
  }

  toggleDestSelect() {
    this.showDestSelect = !this.showDestSelect;
  }

  previousBusNo = '570S';

  clearBusInput() {
    this.previousBusNo = this.busNo;
    this.busNo = '';
  }

  toggleEditingBus() {
    this.isEditingBus = !this.isEditingBus;
    if (!this.isEditingBus) {
      if (!this.busNo || !this.busNo.trim()) {
        this.busNo = this.previousBusNo;
      }
    }
  }

  selectBus(bus: string) {
    this.busNo = bus;
    this.onBusNoChange();
    this.isEditingBus = false;
  }

  filteredBusList() {
    const query = (this.busNo || '').trim().toLowerCase();
    if (!query) return this.busList;
    return this.busList.filter(b => b.toLowerCase().includes(query));
  }

  swapRouteDirection() {
    const route = this.busNo.trim().toUpperCase();
    const data = this.routesCache[route];
    if (data && data.stages) {
      data.stages = [...data.stages].reverse();
      const oldOrigin = data.origin;
      data.origin = data.destination;
      data.destination = oldOrigin;
      data.stages.forEach((s: any, idx: number) => {
        s.sequence = idx + 1;
      });
      this.updateStopsForBus();
    }
  }

  /* PERSON */

  increase() {

    this.persons++;

  }

  decrease() {

    if (
      this.persons > 1
    ) {

      this.persons--;

    }

  }

  /* TOTAL */

  get total() {

    return (
      this.ticketPrice
      *
      this.persons
    );

  }

  /* BOOK */

  showPriceEdit = false;
  editingPrice = 13;

  /* BOOK WITH LONG PRESS TO EDIT PRICE */
  private bookPressTimer: any;
  private isLongPress = false;
  private lastTouchTime = 0;

  onBookPressStart(event: Event) {
    if (event.type === 'mousedown' && Date.now() - this.lastTouchTime < 1000) {
      return;
    }
    if (event.type === 'touchstart') {
      this.lastTouchTime = Date.now();
    }
    this.isLongPress = false;
    if (this.bookPressTimer) {
      clearTimeout(this.bookPressTimer);
    }
    this.bookPressTimer = setTimeout(() => {
      this.isLongPress = true;
      this.changeTicketPrice();
      this.bookPressTimer = null;
    }, 850);
  }

  onBookPressEnd(event: Event) {
    if (event.type === 'mouseup' && Date.now() - this.lastTouchTime < 1000) {
      return;
    }
    if (event.type === 'touchend') {
      this.lastTouchTime = Date.now();
    }
    if (this.bookPressTimer) {
      clearTimeout(this.bookPressTimer);
      this.bookPressTimer = null;
    }
  }

  onBookClick(event: Event) {
    if (this.isLongPress) {
      event.preventDefault();
      event.stopPropagation();
      this.isLongPress = false;
      return;
    }
    this.book();
  }

  changeTicketPrice() {
    this.editingPrice = this.ticketPrice;
    this.showPriceEdit = true;
  }

  savePrice() {
    const price = parseFloat(this.editingPrice.toString());
    if (!isNaN(price) && price >= 0) {
      this.userOverridePrice = price;
    }
    this.showPriceEdit = false;
  }

  cancelPriceEdit() {
    this.showPriceEdit = false;
  }

  book() {

    const route = this.busNo.trim().toUpperCase();
    localStorage.setItem('last_used_bus', route);

    const otp = this.ticketCode.trim().toUpperCase();
    if (otp) {
      try {
        const otpMapStr = localStorage.getItem('otp_bus_map');
        const otpMap = otpMapStr ? JSON.parse(otpMapStr) : {};
        otpMap[otp] = route;
        localStorage.setItem('otp_bus_map', JSON.stringify(otpMap));
      } catch(e) {}
    }

    let customData = this.customBusData[route] || { customStops: [], customRates: {} };
    customData.lastSource = this.source;
    customData.lastDestination = this.destination;
    
    if (!customData.customStops) customData.customStops = [];
    if (!customData.customRates) customData.customRates = {};

    // Save stops globally so they appear on all buses
    if (!this.sourceStops.includes(this.source) && !this.globalCustomStops.includes(this.source)) {
      this.globalCustomStops.push(this.source);
    }
    if (!this.destinationStops.includes(this.destination) && !this.globalCustomStops.includes(this.destination)) {
      this.globalCustomStops.push(this.destination);
    }

    // Save rates globally for both directions
    const key1 = `${this.source}|${this.destination}`;
    const key2 = `${this.destination}|${this.source}`;
    
    this.globalCustomRates[key1] = this.ticketPrice;
    this.globalCustomRates[key2] = this.ticketPrice;
    
    // Also save to route specific for fallback safety
    customData.customRates[key1] = this.ticketPrice;
    customData.customRates[key2] = this.ticketPrice;

    this.customBusData[route] = customData;
    this.saveCustomBusData();

    this.router.navigate(

      [
        '/ticket-generation'
      ],

      {

        state: {

          bus:
            this.busNo,

          type:
            this.busType,  

          source:
            this.source,

          destination:
            this.destination,

          price:
            this.total,

          persons:
            this.persons,

          ticket:
            this.ticketCode

        }

      }

    );

  }

}