'use strict';
// パターンとかやめて、ひとつのケースでやる。ポーズは中央に黒い四角、白い文字。Pボタンでポーズ。
// タイトル→セレクト→プレイ？んー・・
// とりあえずいきなり動かすでいいよ。
// てかもうさっさと動かしたい気持ちでいっぱい
// あ、なんかすごい音がしてる・・やっぱ相当負担かかってるなー・・無理させないようにしよ。
let all;
let hueSet = [];
let clickPosX;
let clickPosY;
let keyFlag;

const IDLE = 0;
const PRE = 1;
const ACT = 2;

// 時間表示の設置。
const timeCounter = document.createElement('div');
document.body.appendChild(timeCounter);
// メインループだけ調べる

function setup(){
  createCanvas(640, 480);
  colorMode(HSB, 100); // hueだけでいろいろ指定出来て便利なので。
  hueSet = [0, 10, 17, 35, 52, 64, 80];
  let initialFlow = initialize(); // 初期化でもろもろ準備して最後に最初のFlowを返す
  all = new entity(); // entityを準備
  all.setFlow(initialFlow); // initialFlowをセットする
  clickPosX = -1;
  clickPosY = -1; // クリックするとpos情報が入る
  keyFlag = 0; // キータイプ情報
  all.activate(); // activate. これですべてが動き出すといいのだけどね。
}

// initialFlowでtitleにすることってできる？

function draw(){
  const start = performance.now(); // 時間表示。
  all.update();
  all.render(); // renderにする
  const end = performance.now();
  const timeStr = (end - start).toPrecision(4);
  timeCounter.innerText = `${timeStr}ms`;
}

// ------------------------------------------------------------------------------------- //
// initialize.

function initialize(){
  const _titleFlow = new titleFlow();
  const _selectFlow = new selectFlow();
  const _playFlow = new playFlow(); // ステージをいくつか用意したりするかもしれないけど
  _titleFlow.addFlow(_selectFlow);
  _selectFlow.addFlow(_titleFlow); // selectからはtitleとplayに行けるように
  _selectFlow.addFlow(_playFlow);
  return _titleFlow;
}

// ----------------------------------------------------------------------------------------------- //
// クリックされたら
function mouseClicked(){
  clickPosX = mouseX;
  clickPosY = mouseY;
}
function keyTyped(){
  if(key === 'q'){ keyFlag |= 1; } // とりあえずQ.
  else if(key === 'z'){ keyFlag |= 2; } // Zは決定、発射に使う
  else if(key === 'w'){ keyFlag |= 4; } // Wを登録(カーソルの上移動)
  else if(key === 'x'){ keyFlag |= 8; } // Xを登録(カーソルの下移動)
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
// actorのtypeによるバリデーションも用意したほうがいいかもしれない

// ----------------------------------------------------------------------------------------------- //
// actor.

// timerは必ずしも必要ではないということで。キー入力がトリガーの場合とか。
class actor{
  constructor(type){
    this._type = type; // タイプ・・衝突判定のバリデーションに使う
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

class entity extends actor{
  constructor(){
    super('entity');
  }
  render(){
    this.currentFlow.render(); // flowの内容による
  }
}

// 用意するactorのリスト：
// entity: title, selectなどの状態をflowとして受け取り、状態の遷移を・・
// gun: 四角形でいいよー。灰色で、中央部分の色だけガンの種類で変える
// bullet: 親への参照を持ち、親に所属する。flowを与えられてactivateされると動き出す。
// playerBullet extends bullet: 四角形でいいよー. こっちはenemyにダメージを与えるやつ。
// enemyBullet extends bullet: 四角形で。こっちはgunにダメージを与えるやつ。
// enemy: 四角形で・・enemyBulletを放出する感じ。
// enemyGenerator: enemyを作ったり手元に戻したりする係。enemyが放出するbulletはすべてこの
// enemyGeneratorのもつbulletArrayから出すようにし、戻すようにしたい。
// 最初は全部小さい規模でやる。大きくするのはいつでもできる。
// 速度だけ変えるとかね・・

// ちなみにplayまで出番がないです //

// ----------------------------------------------------------------------------------------------- //
// state関連
class titleFlow extends flow{
  constructor(){
    super();
    this.initialState = ACT;
  }
  execute(_entity){
    // Zキー押したらconvertしてさっさと終了
    if(keyFlag & 2){
      this.convert(_entity); flagReset();
    }
  }
  convert(_entity){
    _entity.setFlow(this.convertList[0]); // ひとつだけしか行先がない
  }
  render(){
    background(70);
    push();
    textSize(40);
    fill(0);
    text('TITLE', 100, 100);
    text('PRESS Z BUTTON', 100, 200);
    pop();
  }
}

class selectFlow extends flow{
  constructor(){
    super();
    this.initialState = ACT;
    this.limit = 2;
    this.nextStateIndex = 0;
  }
  execute(_entity){
    // とりあえずtitleに戻れるようにしておいて。0番がtitleで1番が・・まあ、いいや
    // Wキーで上、Xキーで下に動くカーソル。Zキーで決定。W, X, A, Dで上下左右のカーソル移動やりたい。
    if(keyFlag & 4){
      this.nextStateIndex = (this.nextStateIndex + this.limit - 1) % this.limit; flagReset();
    }else if(keyFlag & 8){
      this.nextStateIndex = (this.nextStateIndex + 1) % this.limit; flagReset();
    }else if(keyFlag & 2){
      this.convert(_entity); flagReset();
    }
  }
  convert(_entity){
    if(this.nextStateIndex === 1){ return; } // playが制作中なので0しか機能しない
    _entity.setFlow(this.convertList[this.nextStateIndex]);
  }
  render(){
    background(70);
    // titleとかstage1とか表示されてるのだけど、カーソルはnextStateIndexのところに四角形
    fill(0);
    rect(100, 100 + 40 * this.nextStateIndex, 30, 30);
    fill(0, 100, 100);
    rect(140, 100, 80, 30);
    fill(5, 100, 100);
    rect(140, 140, 80, 30);
  }
}

// 次から次へと敵が出て来ては消え、出て来ては消える感じで。
// こっちも攻撃する。おわり。（？）
class playFlow extends flow{
  constructor(){
    super();
  }
}
