// サンプルコードを参考にして青500と赤500の衝突判定
// 衝突した時の反応は色が薄い赤、青から濃い赤、青になるものとする
// 500×500なので総当たりだと250000になる（1000同士の総当たりだと500×999だからそれよりは小さいね）
// p5.jsで書いてみたい。

// colliderのupdateを追加しました。
// とりあえずマシにはなったかな・・はぁ、疲れた

// bgLayerもなくしたらこっちの方が速くなった・・？

'use strict';
let all;
let hueSet = [];
let clickPosX;
let clickPosY;
let keyFlag;
let myCanvas;

let collisionCount;

const IDLE = 0;
const PRE = 1;
const ACT = 2;

const PATTERN_NUM = 3; // パターン増やすときはここを変えてね。
const INITIAL_PATTERN_INDEX = 2; // 最初に現れるパターン。調べたいパターンを先に見たいときにどうぞ。

// 時間表示の設置。
const timeCounter = document.createElement('div');
const updateCounter = document.createElement('div');
const renderCounter = document.createElement('div');
const collisionCounter = document.createElement('div');
document.body.appendChild(timeCounter);
document.body.appendChild(updateCounter);
document.body.appendChild(renderCounter);
document.body.appendChild(collisionCounter);

function setup(){
  myCanvas = createCanvas(640, 480);
  colorMode(HSB, 100); // hueだけでいろいろ指定出来て便利なので。
  hueSet = [0, 10, 17, 35, 52, 64, 80];
  let initialFlow = initialize(); // 初期化でもろもろ準備して最後に最初のFlowを返す
  all = new entity(); // entityを準備
  all.setFlow(initialFlow); // initialFlowをセットする
  clickPosX = -1;
  clickPosY = -1; // クリックするとpos情報が入る
  keyFlag = 0; // キータイプ情報
  all.activate(); // activate. これですべてが動き出すといいのだけどね。

  collisionCount = 0;
}

function draw(){
  const start = performance.now(); // 時間表示。
  all.update();
  all.display();
  const end = performance.now();
  const timeStr = (end - start).toPrecision(4);
  timeCounter.innerText = `${timeStr}ms`;

  collisionCounter.innerText = collisionCount.toString();
}

// -------------------------------------------------------------------------------------------------- //
// イニシャライズ。必要なクラスを一通り作ってつなげる。
// とりあえず単純にpauseとパターンだけ。
function initialize(){
  // パターンを増やしても動かすところはどこにもないし、かつ初期パターンも設定できる。
  let patternArray = [];
  let pause = new pauseState();
  for(let i = 0; i < PATTERN_NUM; i++){
    let ptn = new pattern(i);
    patternArray.push(ptn);
    ptn.convertList.push(pause); // すべてのパターン→pause
    pause.convertList.push(ptn); // pause→すべてのパターン
  }
  return patternArray[INITIAL_PATTERN_INDEX];
}

// ----------------------------------------------------------------------------------------------- //
// クリックされたら
function mouseClicked(){
  clickPosX = mouseX;
  clickPosY = mouseY;
}
function keyTyped(){
  if(key === 'q'){ keyFlag |= 1; } // とりあえずQを登録。
}
function flagReset(){
  clickPosX = -1;
  clickPosY = -1; // リセット
  keyFlag = 0;
}

// 簡単なカウンター. resetの名称をsettingにしました。こっちの方がしっくりくるので。
class counter{
  constructor(){
    this.cnt = 0;
    this.limit = -1; // limit復活(-1かあるいは正の数を取る)
  }
  getCnt(){ return this.cnt; }
  getProgress(){ // 進捗
    if(this.limit < 0){ return this.cnt; }
    if(this.cnt >= this.limit){ return 1; }
    return this.cnt / this.limit;
  }
  setting(limit){ // reset → setting.(改名)
    this.cnt = 0;
    this.limit = limit;
  }
  step(diff = 1){ // diffは正の値が前提
    this.cnt += diff;
  }
}

// ----------------------------------------------------------------------------------------------- //
// flow.

class flow{
  constructor(){
    this.convertList = [];
    this.initialState = PRE; // 基本PRE, 内容が単純ならばACTでOK.
  }
  addFlow(_flow){ this.convertList.push(_flow); }
  execute(_actor){ this.convert(_actor); } // デフォルトはconvertだけ（initializeはオプション）
  convert(_actor){
    // デフォルトはランダムコンバート、undefinedがセットされた場合の処理はactorに書く。
    if(this.convertList.length === 0){ _actor.setFlow(undefined); }
    else{
      let n = this.convertList.length;
      _actor.setFlow(this.convertList[randomInt(n)]);
    }
  }
  update(){} // 更新用
  render(gr){} // 描画用
}

class wanderRectFlow extends flow{
  constructor(){
    super();
    this.initialState = ACT;
  }
  execute(_rect){
    let newX = _rect.pos.x + _rect.vx;
    let newY = _rect.pos.y + _rect.vy;
    if(newX < 0){ newX = 0; _rect.vx = -_rect.vx; }
    else if(newX >= width - _rect._width){ newX = width - _rect._width - 1; _rect.vx = -_rect.vx; }
    if(newY < 0){ newY = 0; _rect.vy = -_rect.vy; }
    else if(newY >= height - _rect._height){ newY = height - _rect._height - 1; _rect.vy = -_rect.vy; }
    _rect.pos.set(newX, newY);
  }
}

class wanderCircleFlow extends flow{
  constructor(){
    super();
    this.initialState = ACT;
  }
  execute(_circle){
    let newX = _circle.pos.x + _circle.vx;
    let newY = _circle.pos.y + _circle.vy;
    if(newX < _circle._radius){ newX = _circle._radius; _circle.vx = -_circle.vx; }
    else if(newX >= width - _circle._radius){ newX = width - _circle._radius - 1; _circle.vx = -_circle.vx; }
    if(newY < _circle._radius){ newY = _circle._radius; _circle.vy = -_circle.vy; }
    else if(newY >= height - _circle._radius){ newY = height - _circle._radius - 1; _circle.vy = -_circle.vy; }
    _circle.pos.set(newX, newY);
  }
}

// ----------------------------------------------------------------------------------------------- //
// quadTree.
class linearQuadTreeSpace {
  constructor(_width, _height, level) {
    this._width = _width;
    this._height = _height;
    this.data = [null];
    this._currentLevel = 0;

    // 入力レベルまでdataを伸長する。
    while(this._currentLevel < level) {
      this._expand();
    }
  }

  // dataをクリアする。
  clear() {
    this.data.fill(null);
  }

  // 要素をdataに追加する。
  // 必要なのは、要素と、レベルと、レベル内での番号。
  _addNode(node, level, index) {
    // オフセットは(4^L - 1)/3で求まる。
    // それにindexを足せば線形四分木上での位置が出る。
    const offset = ((4 ** level) - 1) / 3;
    const linearIndex = offset + index;

    // もしdataの長さが足りないなら拡張する。
    while(this.data.length <= linearIndex) {
      this._expandData();
    }

    // セルの初期値はnullとする。
    // しかし上の階層がnullのままだと面倒が発生する。
    // なので要素を追加する前に親やその先祖すべてを
    // 空配列で初期化する。
    let parentCellIndex = linearIndex;
    while(this.data[parentCellIndex] === null) {
      this.data[parentCellIndex] = [];

      parentCellIndex = Math.floor((parentCellIndex - 1) / 4);
      if(parentCellIndex >= this.data.length) {
        break;
      }
    }

    // セルに要素を追加する。
    const cell = this.data[linearIndex];
    cell.push(node);
  }

  // Actorを線形四分木に追加する。
  // Actorのコリジョンからモートン番号を計算し、
  // 適切なセルに割り当てる。
  addActor(actor) {
    const collider = actor.myCollider;

    // モートン番号の計算。
    const leftTopMorton = this._calc2DMortonNumber(collider.left, collider.top);
    const rightBottomMorton = this._calc2DMortonNumber(collider.right, collider.bottom);

    // 左上も右下も-1（画面外）であるならば、
    // レベル0として扱う。
    // なおこの処理には気をつける必要があり、
    // 画面外に大量のオブジェクトがあるとレベル0に
    // オブジェクトが大量配置され、当たり判定に大幅な処理時間がかかる。
    // 実用の際にはここをうまく書き換えて、あまり負担のかからない
    // 処理に置き換えるといい。
    if(leftTopMorton === -1 && rightBottomMorton === -1) {
      this._addNode(actor, 0, 0);
      return;
    }

    // 左上と右下が同じ番号に所属していたら、
    // それはひとつのセルに収まっているということなので、
    // 特に計算もせずそのまま現在のレベルのセルに入れる。
    if(leftTopMorton === rightBottomMorton) {
      this._addNode(actor, this._currentLevel, leftTopMorton);
      return;
    }

    // 左上と右下が異なる番号（＝境界をまたいでいる）の場合、
    // 所属するレベルを計算する。
    const level = this._calcLevel(leftTopMorton, rightBottomMorton);

    // そのレベルでの所属する番号を計算する。
    // モートン番号の代表値として大きい方を採用する。
    // これは片方が-1の場合、-1でない方を採用したいため。
    const larger = Math.max(leftTopMorton, rightBottomMorton);
    const cellNumber = this._calcCell(larger, level);

    // 線形四分木に追加する。
    this._addNode(actor, level, cellNumber);
  }

  // 線形四分木の長さを伸ばす。
  _expand() {
    const nextLevel = this._currentLevel + 1;
    const length = ((4 ** (nextLevel+1)) - 1) / 3;

    while(this.data.length < length) {
      this.data.push(null);
    }

    this._currentLevel++;
  }

  // 16bitの数値を1bit飛ばしの32bitにする。
  _separateBit32(n) {
    n = (n|(n<<8)) & 0x00ff00ff;
    n = (n|(n<<4)) & 0x0f0f0f0f;
    n = (n|(n<<2)) & 0x33333333;
    return (n|(n<<1)) & 0x55555555;
  }

  // x, y座標からモートン番号を算出する。
  _calc2DMortonNumber(x, y) {
    // 空間の外の場合-1を返す。
    if(x < 0 || y < 0) {
      return -1;
    }

    if(x > this._width || y > this._height) {
      return -1;
    }

    // 空間の中の位置を求める。
    const xCell = Math.floor(x / (this._width / (2 ** this._currentLevel)));
    const yCell = Math.floor(y / (this._height / (2 ** this._currentLevel)));

    // x位置とy位置をそれぞれ1bit飛ばしの数にし、
    // それらをあわせてひとつの数にする。
    // これがモートン番号となる。
    return (this._separateBit32(xCell) | (this._separateBit32(yCell)<<1));
  }

  // オブジェクトの所属レベルを算出する。
  // XORを取った数を2bitずつ右シフトして、
  // 0でない数が捨てられたときのシフト回数を採用する。
  _calcLevel(leftTopMorton, rightBottomMorton) {
    const xorMorton = leftTopMorton ^ rightBottomMorton;
    let level = this._currentLevel - 1;
    let attachedLevel = this._currentLevel;

    for(let i = 0; level >= 0; i++) {
      const flag = (xorMorton >> (i * 2)) & 0x3;
      if(flag > 0) {
        attachedLevel = level;
      }

      level--;
    }

    return attachedLevel;
  }

  // 階層を求めるときにシフトした数だけ右シフトすれば
  // 空間の位置がわかる。
  _calcCell(morton, level) {
    const shift = ((this._currentLevel - level) * 2);
    return morton >> shift;
  }
}

// ----------------------------------------------------------------------------------------------- //
// collider.
class collider {
  constructor(type, x, y) {
    this._type = type;
    this.x = x;
    this.y = y;
  }
  get type() { return this._type; }
}

class rectangleCollider extends collider {
  constructor(x, y, w, h) {
    super('rectangle', x, y);
    this.w = w;
    this.h = h;
  }
  // 各種getter。
  // なくてもいいが、あったほうが楽。
  get top() { return this.y; }
  get bottom() { return this.y + this.h; }
  get left() { return this.x; }
  get right() { return this.x + this.w; }
  update(info){
    this.x = info.x;
    this.y = info.y;
    this.w = info.w;
    this.h = info.h;
  }
}

class circleCollider extends collider{
  constructor(x, y, r){
    super('circle', x, y);
    this.r = r;
  }
  // 登録用。
  get top(){ return this.y - this.r; }
  get bottom(){ return this.y + this.r; }
  get left(){ return this.x - this.r; }
  get top(){ return this.x + this.r; }
  update(info){
    this.x = info.x;
    this.y = info.y;
    this.r = info.r;
  }
}
// ----------------------------------------------------------------------------------------------- //
// detector.
class collisionDetector {
  // 当たり判定を検出する。
  detectCollision(collider1, collider2) {
    if(collider1.type == 'rectangle' && collider2.type == 'rectangle'){
      return this.detectRectangleCollision(collider1, collider2);
    }
    if(collider1.type == 'circle' && collider2.type == 'circle'){
      return this.detectCircleCollision(collider1, collider2);
    }

    return false;
  }

  // 矩形同士の当たり判定を検出する。
  detectRectangleCollision(rect1, rect2){
    const horizontal = (rect2.left < rect1.right) && (rect1.left < rect2.right);
    const vertical = (rect2.top < rect1.bottom) && (rect1.top < rect2.bottom);
    return (horizontal && vertical);
  }
  // 円形同士
  detectCircleCollision(circle1, circle2){
    const distance = Math.sqrt((circle1.x - circle2.x) ** 2 + (circle1.y - circle2.y) ** 2);
    const sumOfRadius = circle1.r + circle2.r;
    return distance < sumOfRadius;
  }
}

// ----------------------------------------------------------------------------------------------- //
// actor.

// timerは必ずしも必要ではないということで。キー入力がトリガーの場合とか。
class actor{
  constructor(){
    this.currentFlow = undefined;
    this.isActive = false;
    this.state = IDLE;
  }
  activate(){ this.isActive = true; }
  inActivate(){ this.isActive = false; }
  setState(newState){ this.state = newState; }
  setFlow(newFlow){
    if(newFlow === undefined){
      this.setState(IDLE); this.inActivate();
    }else{
      this.setState(newFlow.initialState); // flowが始まるときのstate(PREまたはACT)
    }
    this.currentFlow = newFlow;
  }
  update(){
    if(!this.isActive){ return; } // ここはそのまま
    this.currentFlow.execute(this); // これだけ。すっきりした。
  }
  render(){} // 描画用
}

// creature(今までのmovingActor)
class creature extends actor{
  constructor(x, y){
    super(x, y);
    this.timer = new counter();
    this.pos = createVector(x, y);
    this.vx = 2 + random(3);
    this.vy = 2 + random(3);
  }
  setPos(x, y){
    this.pos.set(x, y);
  }
}

class rectangleCreature extends creature{
  constructor(x, y, w, h, colorId = 0){
    super(x, y);
    this._width = w;
    this._height = h;
    this.hue = hueSet[colorId];
    this.visual = createGraphics(w, h);
    this.visual.colorMode(HSB, 100);
    this.visual.background(this.hue, 100, 100);
    this.myCollider = new rectangleCollider(x, y, w, h);
    this.visible = true;
  }
  update(){
    if(!this.isActive){ return; } // ここはそのまま
    this.currentFlow.execute(this); // これだけ。すっきりした。
    this.myCollider.update({x:this.pos.x, y:this.pos.y, w:this._width, h:this._height});
  }
  render(){
    if(!this.visible){ return; }
    image(this.visual, this.pos.x, this.pos.y);
  }
  hit(other){
    if(this.hue !== other.hue){ return; } // 同じ色同士で消えるようにする
    this.inActivate();
    this.pos.set(-100, -100);
    this.visible = false; // 画面外に飛ばす
  }
}

class circleCreature extends creature{
  constructor(x, y, r, colorId = 0){
    super(x, y);
    this._radius = r;
    this.hue = hueSet[colorId];
    this.visual = createGraphics(2 * r, 2 * r);
    this.visual.colorMode(HSB, 100);
    this.visual.fill(this.hue, 100, 100);
    this.visual.noStroke();
    this.visual.ellipse(r, r, 2 * r, 2 * r);
    this.myCollider = new circleCollider(x, y, r);
    this.visible = true;
  }
  update(){
    if(!this.isActive){ return; } // ここはそのまま
    this.currentFlow.execute(this); // これだけ。すっきりした。
    this.myCollider.update({x:this.pos.x, y:this.pos.y, r:this._radius});
  }
  render(){
    if(!this.visible){ return; }
    image(this.visual, this.pos.x - this._radius, this.pos.y - this._radius);
  }
  hit(other){
    if(this.hue === other.hue){ return; } // 違う色同士で消えるようにする
    this.inActivate();
    this.pos.set(-100, -100);
    this.visible = false; // 画面外に飛ばす
  }
}

// ----------------------------------------------------------------------------------------------- //
// entity, pattern, pauseを作る。
// entityのin_progressActionとcompletedActionはもうない・・executeにちゃんと書く。
class entity extends actor{
  constructor(){
    super();
    this.currentPatternIndex = INITIAL_PATTERN_INDEX; // 最初のパターンのインデックス
  }
  display(){
    this.currentFlow.display(); // display内容はflowに従ってね
  }
}
// 説明すると、まずupdateはデフォルトでOK.
// completedActionに書いてたやつ、convertはflowの方で、初期stateもflowに書いてある、
// もしflagResetしたいならグローバルでしょ？flowでやればいいじゃん。以上。
// もちろんこっちでやってもいいんだけど一般的じゃないしね・・

// ----------------------------------------------------------------------------------------------- //

// パターンとポーズだけ。

class pattern extends flow{
  constructor(patternIndex){
    super();
    this.patternIndex = patternIndex; // indexに応じてパターンを生成
    this.actors = [];
    this.activeFlow = []; // updateしたいflowをここに入れる
    this.visited = false; // 最初に来た時にtrueになってそれ以降は再訪してもinitializeが実行されない。
    this.theme = ""; // テーマ名をここに書く（ラベル）
    this.initialState = PRE; // initializeがある
    this.patternColor = color(0); // パターンカラー
    // 衝突関連
    this._qTree = new linearQuadTreeSpace(width, height, 3);
    this._detector = new collisionDetector();
  }
  initialize(_entity){
    _entity.currentPatternIndex = this.patternIndex; // indexの更新
    if(!this.visited){
      createPattern(this.patternIndex, this); // クリエイト、パターン
      background(100);
      this.visited = true;
    }
    _entity.setState(ACT); // これだけ忘れずに・・・
  }
  execute(_entity){
    if(_entity.state === PRE){ this.initialize(_entity); }

    const start_1 = performance.now();
    this.actors.forEach(function(a){ a.update(); })
    const end_1 = performance.now();
    const updateStr = (end_1 - start_1).toPrecision(4);
    updateCounter.innerText = 'update:' + `${updateStr}ms`;

    // ここでやる
    this._qTree.clear(); // 線型四分木のクリア
    let collisionOccur = false; // 衝突が起こるかどうか
    this.actors.forEach((a) => {
      if(a.isActive){
        this._qTree.addActor(a); // 登録
        collisionOccur = true;
      } // activeなものしか登録しない
    });
    if(collisionOccur){
      this._hitTest(); // 判定する
    }

    this.activeFlow.forEach(function(f){ f.update(); })
    // objLayerやめた。render系の命令はrenderにしか書かないことにした

    // 離脱条件はPAUSEのところをクリック
    if(clickPosX > 245 && clickPosX < 395 && clickPosY > 420 && clickPosY < 460){
      this.convert(_entity); // convertするだけ
      flagReset(); // flagのResetはこっちでやる
    }
  }
  // 当たり判定。
  _hitTest(currentIndex = 0, objList = []) {
    const currentCell = this._qTree.data[currentIndex];

    // 現在のセルの中と、衝突オブジェクトリストとで
    // 当たり判定を取る。
    this._hitTestInCell(currentCell, objList);

    // 次に下位セルを持つか調べる。
    // 下位セルは最大4個なので、i=0から3の決め打ちで良い。
    let hasChildren = false;
    for(let i = 0; i < 4; i++) {
      const nextIndex = currentIndex * 4 + 1 + i;

      // 下位セルがあったら、
      const hasChildCell = (nextIndex < this._qTree.data.length) && (this._qTree.data[nextIndex] !== null);
      hasChildren = hasChildren || hasChildCell;
      if(hasChildCell) {
        // 衝突オブジェクトリストにpushして、
        objList.push(...currentCell);
        // 下位セルで当たり判定を取る。再帰。
        this._hitTest(nextIndex, objList);
      }
    }

    // 終わったら追加したオブジェクトをpopする。
    if(hasChildren) {
      const popNum = currentCell.length;
      for(let i = 0; i < popNum; i++) {
        objList.pop();
      }
    }
  }

  // セルの中の当たり判定を取る。
  // 衝突オブジェクトリストとも取る。
  _hitTestInCell(cell, objList) {
    // セルの中。総当たり。
    const length = cell.length;
    const cellColliderCahce = new Array(length); // globalColliderのためのキャッシュ。
    if(length > 0) { cellColliderCahce[0] = cell[0].myCollider; }

    for(let i=0; i < length - 1; i++) {
      const obj1 = cell[i];
      const collider1  = cellColliderCahce[i]; // キャッシュから取ってくる。
      for(let j=i+1; j < length; j++) {
        const obj2 = cell[j];

        // キャッシュから取ってくる。
        // ループ初回は直接取得してキャッシュに入れる。
        let collider2;
        if(i === 0) {
          collider2 = obj2.myCollider;
          cellColliderCahce[j] = collider2;
        } else {
          collider2 = cellColliderCahce[j];
        }

        const hit = this._detector.detectCollision(collider1, collider2);

        if(hit) {
          collisionCount++;
          obj1.hit(obj2);
          obj2.hit(obj1);
        }
      }
    }

    // 衝突オブジェクトリストと。
    const objLength = objList.length;
    const cellLength = cell.length;
    for(let i=0; i<objLength; i++) {
      const obj = objList[i];
      const collider1 = obj.myCollider; // 直接取得する。
      for(let j=0; j<cellLength; j++) {
        const cellObj = cell[j];
        const collider2 = cellColliderCahce[j]; // キャッシュから取ってくる。
        const hit = this._detector.detectCollision(collider1, collider2);

        if(hit) {
          collisionCount++; // ぶつかった回数
          obj.hit(cellObj);
          cellObj.hit(obj);
        }
      }
    }
  }
  convert(_entity){
    // ひとつしかないから簡略化しよう
    _entity.setFlow(this.convertList[0]);
  }
  display(){
    background(this.patternColor);
    const start_2 = performance.now();
    this.actors.forEach(function(a){ a.render(); })
    textSize(20);
    fill(0);
    rect(245, 420, 150, 40);
    fill(255);
    text("TO PAUSE", 270, 450);
    const end_2 = performance.now();
    const renderStr = (end_2 - start_2).toPrecision(4);
    renderCounter.innerText = 'render:' + `${renderStr}ms`;
  }
}

// PAUSE.
// あ、そうか、ランダムコンバートじゃないからコンバート関数上書きしないといけないんだ（馬鹿？）
class pauseState extends flow{
  constructor(){
    super();
    this.currentPatternIndex = -1; // initializeの際にentityから値を受け取ってconvertの際に更新値を返す感じ
    this.initialState = PRE; // initializeあり
  }
  initialize(_entity){
    background(70);
    fill(0);
    textSize(40);
    text("PAUSE", 240, 120);
    textSize(20);
    text('NEXT PATTERN (CLICK)', 180, 240);
    text('PREVIOUS PATTERN (CLICK)', 180, 300);
    // パターンに戻るクリックアクション
    fill(0);
    rect(245, 420, 150, 40);
    fill(100);
    text("TO PATTERN", 260, 450);
    this.currentPatternIndex = _entity.currentPatternIndex; // ここで代入
    _entity.setState(ACT);
  }
  patternShift(curId){
    // clickPosYの値に応じてindexの更新とかobjLayerの更新とかする
    if(clickPosY > 240 && clickPosY < 280){ return curId; }
    let newCurId = curId;
    if(clickPosY < 240){ newCurId = (curId + 1) % PATTERN_NUM; }
    else if(clickPosY > 280){ newCurId = (curId + PATTERN_NUM - 1) % PATTERN_NUM; }
    return newCurId;
  }
  execute(_entity){
    if(_entity.state === PRE){ this.initialize(_entity); }
    // クリックでパターン変数をいじる
    if(clickPosX > 180 && clickPosX < 420 && clickPosY > 220 && clickPosY < 300){
      this.currentPatternIndex = this.patternShift(this.currentPatternIndex);;
      flagReset();
    }
    // 終了条件は画面下のボタンをクリック
    if(clickPosX > 245 && clickPosX < 395 && clickPosY > 420 && clickPosY < 460){
      this.convert(_entity);
      flagReset();
    }
  }
  convert(_entity){
    // ランダムではないのでオーバーライドする
    _entity.currentPatternIndex = this.currentPatternIndex;
    _entity.setFlow(this.convertList[_entity.currentPatternIndex]);
    this.currentPatternIndex = -1; // 初期化～
  }
  display(){
    fill(70);
    noStroke();
    rect(0, 160, 640, 20);
    if(this.currentPatternIndex >= 0){ // 最初だけ描画されないようにする
      push();
      fill(0);
      textSize(20);
      text("CURRENT PATTERN:" + " " + this.currentPatternIndex.toString(), 180, 180);
      pop();
    }
  }
}

// displayとexecuteが似てるな・・
// ----------------------------------------------------------------------------------------------- //

function createPattern(index, _pattern){
  if(index === 0){
    let _wanderFlow = new wanderRectFlow();
    let creatures = [];
    for(let i = 0; i < 100; i++){
      let _creature = new rectangleCreature(50 + randomInt(540), 50 + randomInt(380), 10 + randomInt(20), 10 + randomInt(20), randomInt(7));
      _creature.setFlow(_wanderFlow);
      _creature.activate();
      creatures.push(_creature);
    }
    // 200で既にめちゃくちゃ重いことが分かりました（まる）
    // プログラム書き換えたから1000でも動くよ。
    _pattern.actors = creatures;
    _pattern.patternColor = color(50, 30, 100);
  }else if(index === 1){
    let _wanderFlow = new wanderCircleFlow();
    let creatures = [];
    for(let i = 0; i < 100; i++){
      let _creature = new circleCreature(50 + randomInt(540), 50 + randomInt(380), 10 + randomInt(20), randomInt(7));
      _creature.setFlow(_wanderFlow);
      _creature.activate();
      creatures.push(_creature);
    }
    // 200で既にめちゃくちゃ重いことが分かりました（まる）
    _pattern.actors = creatures;
    _pattern.patternColor = color(30, 30, 100);
  }else if(index === 2){
    let _wanderFlow = new wanderCircleFlow();
    let creatures = [];
    for(let i = 0; i < 100; i++){
      let _creature = new circleCreature(50 + randomInt(270), 50 + randomInt(380), 10 + randomInt(20), 0);
      _creature.setFlow(_wanderFlow);
      creatures.push(_creature);
    }
    for(let i = 0; i < 100; i++){
      let _creature = new circleCreature(320 + randomInt(270), 50 + randomInt(380), 10 + randomInt(20), 5);
      _creature.setFlow(_wanderFlow);
      creatures.push(_creature);
    }
    activateAll(creatures);
    // 200で既にめちゃくちゃ重いことが分かりました（まる）
    _pattern.actors = creatures;
    _pattern.patternColor = color(30, 30, 100);
  }
}

// ----------------------------------------------------------------------------------------------- //
// パターン生成用の汎用関数

// まとめてactivateする
function activateAll(actorSet){
  actorSet.forEach(function(_actor){ _actor.activate(); })
}

// -------------------------------------------------------------------------------------------------- //
// other utility.

function randomInt(n){
  // 0, 1, ..., n-1のどれかを返す
  return Math.floor(random(n));
}
