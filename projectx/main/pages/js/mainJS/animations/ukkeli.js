'use strict';

class Ukkeli{
    constructor(ctx, kuvat, x=0, y=0){
        this.konteksti = ctx;
        this.x = x;
        this.y = y;
        this.kuvat=kuvat;
        this.aktiivisetKuvat= this.kuvat.ALAS;
        this.kuvanro=0;
        this.rivinro=0;
    }

    drawStill(x=this.x, y=this.y, isBot){
        let pala = this.aktiivisetKuvat[this.kuvanro];
        if(isBot) this.konteksti.filter = "invert(1)";
        this.konteksti.drawImage(this.kuvat.kuva,
            //spritestä otettava pala
            pala.x,pala.y, pala.leveys,pala.korkeus,
            //mihin kohtaan piirretään kanvakselle
            x,y, pala.leveys,pala.korkeus);
        this.konteksti.filter = "invert(0)";
    }

    piirra(x=this.x, y=this.y, isBot){
        console.log((isBot ? "bot: " : "player: "), this.kuvanro);
        let pala = this.aktiivisetKuvat[this.kuvanro];
        // if(x !== this.x || y !== this.y) 
        this.kuvanro=++this.kuvanro%this.aktiivisetKuvat.length;
        if(isBot) this.konteksti.filter = "invert(1)";
        this.konteksti.drawImage(this.kuvat.kuva,
            //spritestä otettava pala
            pala.x,pala.y, pala.leveys,pala.korkeus,
            //mihin kohtaan piirretään kanvakselle
            x,y, pala.leveys,pala.korkeus);
        this.konteksti.filter = "invert(0)";
    }

    siirryAlas(dy){
        if (this.rivinro != 0) {
            this.kuvanro = 0;
            this.rivinro = 0;
        }
        this.y+=Math.abs(dy);
        this.aktiivisetKuvat=this.kuvat.ALAS;
    }

    siirryYlos(dy) {
        if(this.rivinro!=1) {
            this.kuvanro = 0;
            this.rivinro = 1;
        }
        this.y -= Math.abs(dy);
        this.aktiivisetKuvat = this.kuvat.YLOS;
    }

    siirryVasen(dx) {
        if (this.rivinro != 2) {
            this.kuvanro = 0;
            this.rivinro = 2;
        }
        this.x -= Math.abs(dx);
        this.aktiivisetKuvat = this.kuvat.VASEN;
    }

    siirryOikea(dx) {
        if (this.rivinro != 3) {
            this.kuvanro = 0;
            this.rivinro = 3;
        }
        this.x += Math.abs(dx);
        this.aktiivisetKuvat = this.kuvat.OIKEA;
    }

}