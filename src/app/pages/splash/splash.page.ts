import { Component, OnInit } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';

import {
IonContent
} from '@ionic/angular/standalone';

@Component({

selector:'app-splash',

templateUrl:'./splash.page.html',

styleUrls:[
'./splash.page.scss'
],

standalone:true,

imports:[
IonContent,
CommonModule,
FormsModule
]

})

export class SplashPage
implements OnInit{

constructor(
private router:Router
){}

ngOnInit(){

setTimeout(()=>{

this.router.navigate(
['/home']
);

},2500);

}

}