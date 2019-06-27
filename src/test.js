'use strict';
let bullets = [];

const updateCounter = document.createElement('div');
const renderCounter = document.createElement('div');
document.body.appendChild(updateCounter);
document.body.appendChild(renderCounter);

function setup() {
	createCanvas(640, 480);
	colorMode(HSB, 100);
	angleMode(DEGREES);
	noStroke();
	for(let i = 0; i < 300; i++){ bullets.push(new bullet()); }
	setting();
}

function draw() {
  let start = performance.now(); // 時間表示。
	background(70, 30, 100);
	translate(width / 2, height / 2);
  bullets.forEach((b) => {b.update();});
	let end = performance.now();
  let timeStr = (end - start).toPrecision(4);
  updateCounter.innerText = `${timeStr}ms`;
  start = performance.now();
  bullets.forEach((b) => { fill(0); b.render();});
	end = performance.now();
	timeStr = (end - start).toPrecision(4);
	renderCounter.innerText = `${timeStr}ms`;
}

class bullet{
	constructor(){
		this.x = 0;
		this.y = 0;
		this.t = 0;
		this.move = undefined;
		this.visible = true;
	}
	setPos(x, y){
		this.x = x;
		this.y = y;
	}
	setMove(newMove){
		this.move = newMove;
		this.t = 0;
	}
	update(){
		if(this.move === undefined){ return; }
		this.posUpdate(this.move.type, this.move.param);
		if(abs(this.x) > width || abs(this.y) > height){ this.sleep(); }
	}
	posUpdate(type, param){
		switch(type){
			case 0: this.x += param.vx; this.y += param.vy; return;
			case 1: this.x += param.vx + this.t * param.ax; this.y += param.vy + this.t * param.ay; this.t++; return;
		}
	}
	sleep(){
		this.move = undefined;
		this.visible = false;
	}
	render(){
		if(!this.visible){ return; };
		ellipse(this.x, this.y, 10, 10);
	}
}

function setting(){
	for(let i = 0; i < 100; i++){
		bullets[i].setPos(0, 0);
		bullets[i].setMove({type:0, param:{vx: 3 * cos(i * 3.6), vy: 3 * sin(i * 3.6)}});
		bullets[i + 100].setPos(0, 0);
		bullets[i + 100].setMove({type:0, param:{vx: 4 * cos(i * 3.6), vy: 4 * sin(i * 3.6)}});
		bullets[i + 200].setPos(0, 0);
		bullets[i + 200].setMove({type:0, param:{vx: 5 * cos(i * 3.6), vy: 5 * sin(i * 3.6)}});
	}
}
