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

// let bgs = [];

const IDLE = 0;
const PRE = 1;
const ACT = 2;

// 時間表示の設置。
const timeCounter = document.createElement('div');
document.body.appendChild(timeCounter);
// メインループだけ調べる

/*
function preload(){
  bgs.push(loadImage('./assets/sky.JPG'));
}*/


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
  const _playFlow = new playFlow(1); // ステージをいくつか用意したりするかもしれないけど(引数がステージ番号)
  const _pauseFlow = new pauseFlow();
  _titleFlow.addFlow(_selectFlow);
  _selectFlow.addFlow(_titleFlow); // selectからはtitleとplayに行けるように
  _selectFlow.addFlow(_playFlow); // 0がtitleで1がplay.
  _playFlow.addFlow(_pauseFlow); // playからはpauseと、あとgameoverとclearにいけるけどまだ。
  _pauseFlow.addFlow(_playFlow);  // pauseからはtitleとplayに行ける
  _pauseFlow.addFlow(_titleFlow); // 0がplayで1がtitle.
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
  else if(key === 'a'){ keyFlag |= 16; } // Aは左に使う（かも）
  else if(key === 'd'){ keyFlag |= 32; } // Dは右に使う（かも）
  else if(key === 'p'){ keyFlag |= 64; } // Pはpauseに使う
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
  setting(limit = 0){ // reset → setting.(改名)
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
    // デフォルトは0番、undefinedがセットされた場合の処理はactorに書く。
    if(this.convertList.length === 0){ _actor.setFlow(undefined); }
    else{
      // ひとつしかないなら0番だし複数ある時はどうせ上書き、ランダムがいいならハブをかませりゃいいんだ
      _actor.setFlow(this.convertList[0]);
    }
  }
  update(){} // 更新用
  // render(gr){} // 描画用
}
// ----------------------------------------------------------------------------------------------- //
// bulletの挙動を制御するためのflow群

// 速度をセットするだけのハブ
class setVelocityHub extends flow{
  constructor(vx, vy){
    super();
    this.vx = vx;
    this.vy = vy;
    this.initialState = ACT;
  }
  execute(_bullet){
    _bullet.setVelocity(this.vx, this.vy);
    this.convert(_bullet);
  }
}

// 行列フロー
class matrixArrow extends flow{
  constructor(a, b, c, d, spanTime = 60){
    super();
    this.elem =  [a, b, c, d];
    this.spanTime = spanTime;
    this.initialState = PRE;
  }
  execute(_bullet){
    if(_bullet.state === PRE){ _bullet.timer.setting(this.spanTime); _bullet.setState(ACT); }
    _bullet.timer.step();
    let vx = _bullet.velocity.x;
    let vy = _bullet.velocity.y;
    _bullet.setVelocity(this.elem[0] * vx + this.elem[1] * vy, this.elem[2] * vx + this.elem[3] * vy);
    _bullet.pos.add(_bullet.velocity); // 位置の更新はここで。
    if(_bullet.timer.getCnt() === this.spanTime){ this.convert(_bullet); }
    // 画面の端に触れたら消える仕様。
    if(_bullet.vanish()){
      //this.convert(_bullet);
      _bullet.setFlow(undefined); // こっちでしょ。
    }
  }
}
// n_wayHubの移植。
// イメージ的にはmainAngleの方向にnWayGunみたいにして(2n+1)個の速度を順繰りに与えるんだけど、
// その方向にほんとうにnWayShotを撃ちたいのであればmatrixFlowを工夫する必要がある。
// 具体的には行列を然るべき対称行列で与える必要がある。それはmainAngleをθとして、
// [α(cosθ)^2 + β(sinθ)^2, (α-β)cosθsinθ, (α-β)cosθsinθ, α(sinθ)^2 + β(cosθ)^2]ですね。
// これは関数作って成分を出せるようにしましょう。
class n_wayHub extends flow{
  constructor(speed, mainAngle, diffAngle, n){
    super();
    this.directionArray = [];
    let diffVector = createVector(-sin(mainAngle), cos(mainAngle)).mult(speed * tan(diffAngle));
    for(let i = -n; i <= n; i++){
      this.directionArray.push(createVector(speed * cos(mainAngle) + i * diffVector.x, speed * sin(mainAngle) + i * diffVector.y));
    }
    this.currentIndex = 0;
    this.initialState = ACT;
  }
  execute(_bullet){
    let v = this.directionArray[this.currentIndex];
    _bullet.setVelocity(v.x, v.y);
    this.currentIndex = (this.currentIndex + 1) % this.directionArray.length;
    this.convert(_bullet);
  }
}

// Gun用に作り替えよう。まあ、そのうち整理するけどね・・・
// count * intervalだけのタイマーをセットする。limitまでいくとリセット。
// すべてのタイマーは1フレームでセットし終わるので毎フレームの更新などは存在しない。
// これは一度に到達する弾数が限定された状況に特化している。
class limitedDelayHub extends flow{
  constructor(interval, limit){
    super();
    this.interval = interval;
    this.count = 0;
    this.limit = limit;
    this.initialState = PRE;
  }
  setVelocity(_bullet){} // ここに個別の処理を書く
  execute(_bullet){
    if(_bullet.state === PRE){
      this.count++;
      _bullet.timer.setting(this.count * this.interval);
      if(this.count === this.limit){
        this.count = 0; // ここをresetとでもして個別の処理を与えるとか？(ごめん勘違いバグでもなんでも無かった)
      }
      this.setVelocity(_bullet);
      _bullet.state = ACT;
    }
    _bullet.timer.step();
    if(_bullet.timer.getCnt() === _bullet.timer.limit){
      this.convert(_bullet);
    }
  }
}

// 円を描くように発射
class limitedCircularDelayHub extends limitedDelayHub{
  constructor(interval, limit, r1, r2, mainAngle, diffAngle){
    super(interval, limit);
    this.r1 = r1;
    this.r2 = r2;
    this.angle = mainAngle;
    this.diffAngle = diffAngle;
  }
  setVelocity(_bullet){
    let r = this.r1 + random(this.r2 - this.r1);
    _bullet.setVelocity(r * cos(this.angle), r * sin(this.angle));
    this.angle += this.diffAngle;
  }
}

// ----------------------------------------------------------------------------------------------- //
// enemyにセットするflow群

// 位置ベースの動きを指定するflow群、単振動とか円運動とかその辺。三角形とか？
// もしくは・・たとえば(1, 1)を100回とか(0, -1)を100回とかそういうのでもよさそう（組み合わせて使う）
// enemy自身にはflowとは別にbullet用のflowが用意されて一定の時間間隔でgeneratorの指示のもとに発射される。
// その際に位置情報が使われる仕組み。

// (vx, vy)をlimit回足すだけのflow
class simpleMove extends flow{
  constructor(vx, vy, limit){
    super();
    this.vx = vx;
    this.vy = vy;
    this.limit = limit;
    this.initialState = PRE;
  }
  execute(_enemy){
    if(_enemy.state === PRE){
      _enemy.timer.setting(this.limit);
      _enemy.setState(ACT);
    }
    _enemy.timer.step();
    _enemy.pos.x += this.vx;
    _enemy.pos.y += this.vy;
    if(_enemy.timer.getProgress() === 1){ this.convert(_enemy); }
  }
}

// enemyを出現させるときにflowの中身をいじることも考えないといけないかも。同じもの使いまわすなら・・んー。
// あ、そうか、enemyTemplateを用意しとけば後は出現位置だけが問題で、あとはflowに個別に指定するのも自由だね。
// 特定の位置を中心に単振動

// うーん、単振動と円運動とたとえば三葉曲線とかもだけど、同じクラスに入れちゃうべきよね・・・
// リサージュとか複雑なのけっこうあるしね。
// simpleMoveのような動きの組み合わせ（今までMVFとかで作ってきたやつ）のクラスがあって、
// こういうswingやcircleみたいなorbital系の動きのクラスがあって、
// たとえば画面外から出てきて画面外へ去っていく動きのクラスがあって、というイメージ。直線とか、ゆらゆらとか。
// それをenemyとしてgeneratorに登録して、それとは別に攻撃のタイミングや種類を指定する。

// 初期位相も指定できるようにすれば複数の敵がぐるぐる回るのとか表現できそうね。
// 画面中心を中心として5つくらい、多方向にショットを発射しながらぐるぐる回るのとか面白そう。
// で、あたりまえだけどこれは派生で書くべき。orbitalFlowとかずっと書いてきた。
// あの蓄積を今こそ使うべきなんだけど枠組みきちんとしてからでいいです。今は別の事をやらないと・・・
class swing extends flow{
  constructor(cx, cy, ax, ay, speed){
    super();
    this.cx = cx; // データ部分はspeedも含めて辞書扱いにして、入力メソッドも統一したほうがいいかも。
    this.cy = cy; // そうすれば色んな動きを統一的に記述できるようになるしより複雑な動きも実現できる。
    this.ax = ax;
    this.ay = ay;
    this.speed = speed; // 1のとき60カウントで一周、2で2倍速、3で3倍速（以下略）
    this.initialState = PRE;
  }
  execute(_enemy){
    if(_enemy.state === PRE){
      _enemy.timer.setting();
      _enemy.setState(ACT);
    }
    _enemy.timer.step(this.speed);
    let cnt = _enemy.timer.getCnt();
    _enemy.pos.set(this.cx + this.ax * sin(cnt * PI / 30), this.cy + this.ay * sin(cnt * PI / 30));
    // convertはしない。倒れたら終わり。
  }
  setData(cx, cy, ax, ay, speed){
    // 再利用のためのデータ決定メソッド
    this.cx = cx;
    this.cy = cy;
    this.ax = ax;
    this.ay = ay;
    this.speed = speed;
  }
}
// 円軌道

// ----------------------------------------------------------------------------------------------- //
// generateFlow. enemyGeneratorにセットして敵を配置するための準備をする


// ちょっとまって
// バリエーションは限られているんだよね、だからenemyのstaticでenemyのバリエーションを用意して、
// 横幅、縦幅、色、まだだけどHP, 攻撃の威力などが既にテンプレとして与えられてると。
// こっちではそのidを指定するだけで敵が配置されるようにしたいね。で、こっちでは動きを指定するだけにするとか。
// たとえば円軌道上にいくつかの敵を等間隔で配置してぐるぐる回させる、
// たとえば直線上に並べる、3×3状に並べる、5×2状に並べる、行ったり来たりさせる、
// あるいは親玉がいてそこから無数に敵が出てきて、大元を倒すと全員倒れて次のフェイズ、とか。
// だからそういうのまで含めてここで決めようってなっちゃうともう意味不明の極みでしょ。
// 多分、ここ最近のもやもやの一番大きな原因がそれなんじゃないかって思った。事前に決めておくんだ。
// というか作っておくんだよ、モンスターを。後はそれに動きを付けて配置するだけでいいんだ。
// あ、bullet関連のメソッドはenemyGenerator持ちだけど。切り崩す処理とかも書かないと。

// ----------------------------------------------------------------------------------------------- //
// quadTree.
class linearQuadTreeSpace {
  constructor(_width, _height, level){
    this._width = _width;
    this._height = _height;
    this.data = [null];
    this._currentLevel = 0;

    // 入力レベルまでdataを伸長する。
    while(this._currentLevel < level){
      this._expand();
    }
  }

  // dataをクリアする。
  clear() {
    this.data.fill(null);
  }

  // 要素をdataに追加する。
  // 必要なのは、要素と、レベルと、レベル内での番号。
  _addNode(node, level, index){
    // オフセットは(4^L - 1)/3で求まる。
    // それにindexを足せば線形四分木上での位置が出る。
    const offset = ((4 ** level) - 1) / 3;
    const linearIndex = offset + index;

    // もしdataの長さが足りないなら拡張する。
    while(this.data.length <= linearIndex){
      this._expandData();
    }

    // セルの初期値はnullとする。
    // しかし上の階層がnullのままだと面倒が発生する。
    // なので要素を追加する前に親やその先祖すべてを
    // 空配列で初期化する。
    let parentCellIndex = linearIndex;
    while(this.data[parentCellIndex] === null){
      this.data[parentCellIndex] = [];

      parentCellIndex = Math.floor((parentCellIndex - 1) / 4);
      if(parentCellIndex >= this.data.length){
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
  addActor(actor){
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
    if(leftTopMorton === -1 && rightBottomMorton === -1){
      this._addNode(actor, 0, 0);
      return;
    }

    // 左上と右下が同じ番号に所属していたら、
    // それはひとつのセルに収まっているということなので、
    // 特に計算もせずそのまま現在のレベルのセルに入れる。
    if(leftTopMorton === rightBottomMorton){
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
  _expand(){
    const nextLevel = this._currentLevel + 1;
    const length = ((4 ** (nextLevel+1)) - 1) / 3;

    while(this.data.length < length) {
      this.data.push(null);
    }

    this._currentLevel++;
  }

  // 16bitの数値を1bit飛ばしの32bitにする。
  _separateBit32(n){
    n = (n|(n<<8)) & 0x00ff00ff;
    n = (n|(n<<4)) & 0x0f0f0f0f;
    n = (n|(n<<2)) & 0x33333333;
    return (n|(n<<1)) & 0x55555555;
  }

  // x, y座標からモートン番号を算出する。
  _calc2DMortonNumber(x, y){
    // 空間の外の場合-1を返す。
    if(x < 0 || y < 0){
      return -1;
    }

    if(x > this._width || y > this._height){
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
  _calcLevel(leftTopMorton, rightBottomMorton){
    const xorMorton = leftTopMorton ^ rightBottomMorton;
    let level = this._currentLevel - 1;
    let attachedLevel = this._currentLevel;

    for(let i = 0; level >= 0; i++){
      const flag = (xorMorton >> (i * 2)) & 0x3;
      if(flag > 0){
        attachedLevel = level;
      }

      level--;
    }

    return attachedLevel;
  }

  // 階層を求めるときにシフトした数だけ右シフトすれば
  // 空間の位置がわかる。
  _calcCell(morton, level){
    const shift = ((this._currentLevel - level) * 2);
    return morton >> shift;
  }
}

// ----------------------------------------------------------------------------------------------- //
// collider.
class collider{
  constructor(type, x, y){
    this._type = type;
    this.x = x;
    this.y = y;
  }
  get type(){ return this._type; }
}

class rectangleCollider extends collider{
  constructor(x, y, w, h){
    super('rectangle', x, y);
    this.w = w;
    this.h = h;
  }
  // 各種getter。
  // なくてもいいが、あったほうが楽。
  get top(){ return this.y; }
  get bottom(){ return this.y + this.h; }
  get left(){ return this.x; }
  get right(){ return this.x + this.w; }
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
  constructor(){
    this._type = ""; // タイプ・・衝突判定のバリデーションに使う. 必要に応じて設定する
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
    super();
  }
  render(){
    this.currentFlow.render(); // flowの内容による
  }
}

// 衝突判定考えるんならcolliderも持たせないとね・・・

// fireUnitを作ってgunとenemyはその派生とするってのもありかな
// typeは派生の方でgunなりenemyなり設定する
class fireUnit extends actor{
  constructor(){ // bulletVolumeはenemyの場合はころころ変わるので・・speedはenemyの場合は不要.
    super();
    // typeは派生先で
    this.pos = createVector();
    this.w = 0; // 描画用
    this.h = 0;
    // speedはgunだけ（移動操作）
    this.muzzle = []; // shotという辞書を格納する、initialFlowとかwaitについての情報が入ってる
    this.currentMuzzleIndex = 0;
    this.magazine = []; // 弾を格納する。格納の仕方が異なるので・・enemyの場合は親から与えられる感じ。gunは直接作る。
    this.cursor = 0; // non-Activeを調べるための初期位置
    this.wait = 0;
    this.stock = 0; // bulletVolumeはenemyでは可変。
    this.bodyHue = 0;
  }
  setParameter(x, y, w, h){
    // パラメータこっちで。HPとかも・・？
    this.pos.set(x, y);
    this.w = w;
    this.h = h;
  }
  registShot(shot){
    this.muzzle.push(shot); // shotは辞書で、
  }
  revolve(){} // shotを変更する手続き
  fire(){
    // cost: 一度に消費する弾数
    // hue: 弾の色
    // initialFlow: 弾にセットされるflow. 最後はないので自動的にinActivate.
    // wait: 撃ってから次に撃てるようになるまでのインターバル
    // damage: 弾にセットされる被ダメージ量。これと相手の耐久力から相手に与えるダメージが以下略
    // damageはHP作ってから追加で実装する感じ
    if(this.wait > 0){ return; } // 待ち時間に満たない場合
    let shot = this.muzzle[this.currentMuzzleIndex];
    let n = shot['cost'];
    if(this.stock < n){ return; } // costに相当する弾数が用意されていない場合
    // となるとbullet側が親の(parent)Gunを知っていないといけないからまずいなー
    this.stock -= n;
    while(n > 0){
      if(this.magazine[this.cursor].isActive){
        this.cursor = (this.cursor + 1) % this.magazine.length; // カーソルを進める. こっちに書かないとね。
        continue;
      }
      n--;
      let _bullet = this.magazine[this.cursor];
      _bullet.setHueValue(shot['hue']); // hueの値
      _bullet.setFlow(shot['initialFlow']);
      _bullet.setPos(this.pos.x, this.pos.y);
      _bullet.activate(); // used要らない。bullet自身が判断して自分の親のmagazineに戻ればいいだけ。
      _bullet.visible = true;
    }
    this.wait = shot['wait']; // waitを設定
  }
  update(){
    if(!this.isActive){ return; }
    this.magazine.forEach(function(b){
      if(b.isActive){ b.update(); } // activeなものだけupdateする
    })
    if(this.wait > 0){ this.wait--; } // waitカウントを減らす(executeの前に書かないと1のとき意味をなさなくなる)
    this.currentFlow.execute(this);
  }
  render(){
    this.magazine.forEach(function(b){ if(b.isActive){ b.render(); } });
    this.renderBody();
  }
  renderBody(){
    // デフォルト. gunの方では変えたりとかする
    push();
    fill(this.bodyHue, 100, 100);
    rect(this.pos.x - this.w, this.pos.y - this.h, 2 * this.w, 2 * this.h);
    pop();
  }
  reset(){} // リセット処理。gunの場合はtitleに戻るとき発動、enemyの場合はやられたときに発動
  // enemyの場合はtitleに戻るときはenemyオブジェクト自体が破棄される（作り直し）。
  // やられたときのresetはmagazineを空にして参照を入れ直す準備をする（enemyのmagazineは
  // enemyGeneratorの一部分（親がundefined）を切り離して使う）。resetの時に・・
  // enemyGeneratorをresetするときにそこに入ってるenemyBulletの親をまとめてundefinedにする仕様
}

class gun extends fireUnit{
  constructor(bulletVolume, speed){
    super();
    this._type = 'gun';
    this.speed = speed;
    for(let i = 0; i < bulletVolume; i++){
      this.magazine.push(new bullet('playerBullet', this));
    }
    this.stock = bulletVolume; // enemyの場合はsettingの際にこれを設定する感じ。
  }
  revolve(){
    this.currentMuzzleIndex = (this.currentMuzzleIndex + 1) % this.muzzle.length;
    let shot = this.muzzle[this.currentMuzzleIndex];
    this.bodyHue = shot['hue']; // gunの場合はshotに応じたボディカラーにする。enemyの場合は固定。
  }
  setSpeed(newSpeed){
    this.speed = newSpeed; // enemyにはspeedは設定しない
  }
  addBullet(n){
    // 増やすことがあるかもしれないので一応
    while(n > 0){
      this.magazine.push(new bullet("playerBullet", this));
      this.stock++;
      n--;
    }
  }
  renderBody(){
    push();
    noStroke();
    fill(30);
    rect(this.pos.x - this.w, this.pos.y - this.h, 2 * this.w, 2 * this.h);
    fill(this.bodyHue, 100, 100);
    rect(this.pos.x - this.w + 5, this.pos.y - this.h + 5, 2 * (this.w - 5), 2 * (this.h - 5));
    if(this.stock > 0){
      rect(10, 10, this.stock, 20); // 弾数を表すゲージ表示
    }
    pop();
  }
  reset(){
    this.muzzle = [];
    this.currentMuzzleIndex = 0;
    this.cursor = 0;
    this.wait = 0;
    this.bodyHue = 0;
    this.magazine.forEach(function(b){ b.setFlow(undefined); }) // magazine...enemyでは空にする
    this.stock = this.magazine.length;
  }
}

class enemy extends fireUnit{
  constructor(){
    super(); // bulletVolumeについては、enemyGenerator側で指定するからいい。（non-Activeなやつから切り出して使う）
    // speedも位置ベースの動きをする分には問題ない、なんなら速度も加えてそういう動きも出来るように改良する。
    // magazineとstockはenemyGeneratorが決めるってこと
  }
  revolve(){
    this.currentMuzzleIndex = (this.currentMuzzleIndex + 1) % this.muzzle.length;
  }
  update(){
    if(!this.isActive){ return; }
    this.magazine.forEach(function(b){
      if(b.isActive){ b.update(); } // activeなものだけupdateする
    })
    if(this.wait > 0){
      this.wait--;
      if(this.wait === 0){ this.revolve(); } // waitが0になるたびに次のshot,と切り替わる
    } // waitカウントを減らす(executeの前に書かないと1のとき意味をなさなくなる)
    this.currentFlow.execute(this); // この場合は動く感じで。
    this.fire(); // fireは毎フレーム。waitだったり弾が足りないと発射されない感じ。
    // たとえばstock上限が5で5発を10フレーム間隔で発射する場合そのあとそれが戻るまで間が空くとかそういう感じ。
  }
  reset(){
    this.muzzle = [];
    this.currentMuzzleIndex = 0;
    this.cursor = 0;
    this.wait = 0;
    this.bodyHue = 0;
    this.magazine = [];
    this.stock = 0;
  }
}

class bullet extends actor{
  constructor(type, parent){
    super();
    this._type = type; // playerBulletかenemyBulletか
    this.parent = parent; // bulletの所属先。generatorかgunかって話。
    this.pos = createVector();
    this.velocity = createVector();
    this.timer = new counter();
    this.hueValue = 0;
    this.visible = false; // 当たり判定に使う
  }
  setPos(x, y){
    this.pos.set(x, y);
  }
  setVelocity(vx, vy){
    this.velocity.set(vx, vy);
  }
  setHueValue(newHueValue){
    this.hueValue = newHueValue;
  }
  vanish(){
    // 消滅条件. みたすときtrueを返す
    return (this.pos.x <= 5) || (this.pos.x >= width - 5) || (this.pos.y <= 5) || (this.pos.y >= height -5);
  }
  inActivate(){
    this.isActive = false;
    this.parent.stock++; // ストックを戻す
    this.visible = false;
  }
  render(){
    if(!this.visible){ return; }
    // その色の四角形を描く、位置に。
    push();
    fill(this.hueValue, 100, 100);
    noStroke();
    rect(this.pos.x - 5, this.pos.y - 5, 10, 10);
    pop();
  }
}

// enemyの挙動は位置制御にする。速度持たせてもいいけど・・どうするかな。要相談。
/*
class enemy extends actor{
  constructor(){
    super();
    this.timer = new counter();
  }
}*/ // enemyはfireUnitの派生として書くことになった

class enemyGenerator extends actor{
  constructor(enemyVolume, bulletVolume){
    super();
    this.timer = new counter(); // 敵を出現させるカウント
    // ステージごとに決められる倒すべき敵の総数。
    // ボスは1匹の場合もあるし3匹の場合もあるかも（わかんない）
    // 敵が出現するインターバルを計るためにタイマーが必要
    // で、ボス以外は攻撃パターン1種類だけ。ボスは複数持ってるから分けた方がいいかな・・クラス。今はちょっと考えられない。。
    this.enemySet = [];
    // this.bossEnemy; // ？？？
    this.bulletSet = [];
  }
}
// 倒れたenemyは戻る・・一応白の棒で目とか付けた方が分かりやすそう。


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
// control Gun. gunにセットして使う。
class controlGun extends flow{
  constructor(){
    super();
    this.initialState = ACT;
  }
  execute(_gun){
    // 上下左右キーで移動、Qでガン入れ替え、Zで発射
    if(keyIsDown(UP_ARROW)){ _gun.pos.y -= _gun.speed; }
    else if(keyIsDown(DOWN_ARROW)){ _gun.pos.y += _gun.speed; }
    else if(keyIsDown(RIGHT_ARROW)){ _gun.pos.x += _gun.speed; }
    else if(keyIsDown(LEFT_ARROW)){ _gun.pos.x -= _gun.speed; }
    if(_gun.pos.x <= _gun.w){ _gun.pos.x = _gun.w; }
    if(_gun.pos.x >= width - _gun.w){ _gun.pos.x = width - _gun.w - 1; }
    if(_gun.pos.y <= _gun.h){ _gun.pos.y = _gun.h; }
    if(_gun.pos.y >= height - _gun.h){ _gun.pos.y = height - _gun.h - 1; }
    if(keyIsDown(90)){
      // Zボタン
      _gun.fire();
    }
    // Qボタンで切り替え
    if(keyFlag & 1){
      _gun.revolve(); flagReset();
    }
  }
}

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
    // if(this.nextStateIndex === 1){ return; } // playが制作中なので0しか機能しない
    _entity.setFlow(this.convertList[this.nextStateIndex]);
    this.nextStateIndex = 0; // インデックスリセット
  }
  render(){
    background(70);
    // titleとかstage1とか表示されてるのだけど、カーソルはnextStateIndexのところに四角形
    fill(0);
    rect(100, 100 + 40 * this.nextStateIndex, 30, 30);
    fill(0, 100, 100);
    rect(140, 100, 80, 30);
    fill(10, 100, 100);
    rect(140, 140, 80, 30);
  }
}

// 次から次へと敵が出て来ては消え、出て来ては消える感じで。
// こっちも攻撃する。おわり。（？）
// 最初は当たり判定どうでもいいから攻撃出せるようにして・・
// ほぼコピペでいけるはず・・だけどわかんないな。グラフィックとか整理しないと（全部rectでいい）。
// 画面外については画面から消えたら自動的にflowを離脱して初期化されるものとし、(hide等の処理)
// 衝突判定のサイズを若干大きく取ってその幅の分を考慮して登録する、というかcolliderをそのように
// 指定する（数を増やすとか）。更新もそれに倣うものとする。

// ステージを増やすことについて・・
// 最初に作って後はそれを使いまわす感じかな・・パターンの作り方だけ個別に指定する。
// ・・いいや、気楽にやろ。
// ステージごとの差が何であるかを考える感じ。
// enemyGeneratorに渡すflowを変化させることで敵が出てくるパターンが変わる・・全員倒れたら次のflow, みたいな
// ショットの種類はステージクリアするごとに増える感じで

// enemy関連は後回しにしよう。

class playFlow extends flow{
  constructor(stageNumber){
    super();
    this._gun = new gun(100, 5); // 初期状態での弾の数
    // いずれはinitializeでパラメータを設定することになりそう。スピードとか大きさとか。
    //this._enemyGenerator = new enemyGenerator(20, 200); // 一度に出現する敵の数、合計の弾の数
    this.initialState = PRE;
    this.stageNumber = stageNumber; // 1なら1, 2なら2.
    this.play_on = false; // ステージに来てinitializeしたのちtrueにする
    // selectからきたときはfalseなのでinitializeが発動してそのあとtrueになる
    // pauseからきたときはtrueになってるのでinitializeしないってなる。クリアした時など、pause以外で
    // playを抜けるときにここをfalseにすることで再初期化を促す感じ。
    this.backgroundColor = color(70);
    this.nextStateIndex = 0; // pause, gameover, clearが0, 1, 2.
  }
  initialize(_entity){
    if(this.play_on){ return; }
    // initializeの内容をここに書く
    this.setStage();
    this.play_on = true;
  }
  execute(_entity){
    if(_entity.state === PRE){
      this.initialize(_entity);
      _entity.setState(ACT);
    }
    // とりあえずupdateくらいで
    this._gun.update();
    //this._enemyGenerator.update();
    // Pボタンでポーズ
    if(keyFlag & 64){
      this.nextStateIndex = 0;
      this.convert(_entity); flagReset();
    }
  }
  convert(_entity){
    console.log(_entity);
    // とりあえずpauseだけ、pauseからはtitleかplayに行ける感じで。titleに行く際にはすべてリセット。
    // gameoverからtitle, clearからもtitle.
    _entity.setFlow(this.convertList[this.nextStateIndex]);
    // リセットはしなくていい
    // pauseに行くとき以外はthis.play_on = falseと書く。（gameover, clear）
  }
  render(){
    // ショット用のゲージ、HP用のゲージ、他にも色々な情報。残りの敵の数とか？ステージ番号とか？
    // ボス用のライフゲージとか・・色々。
    // gunとenemyGeneratorのrenderをする、弾とかenemyとか色々。
    // でもたとえばボスのライフゲージとかはボス用にクラス作ってそれのrenderに書けばいいし
    // ショットの残数の描画とかもgunのところに書けばいい

    background(this.backgroundColor);
    //image(bgs[0], 0, 0);
    this._gun.render();
    //this._enemyGenerator.render();
  }
  setStage(){
    if(this.stageNumber === 1){
      // gunに色々・・んー、難しい。ステージクリアするごとに新しい武器が追加されたり強化、んー。
      // enemyGeneratorに違うflowをセットするくらいしか思いつかないな。
      this.backgroundColor = color(0, 30, 100); // ステージ1の背景色は薄い赤、みたいな？
      // 最初の状態では普通のガンと3WAYガンだけ用意しておく。3WAYは威力を落とす感じで。
      // クリアするごとに新しいの増やしていってそれは引き継がれるっていう風にして、
      // ここではenemyGeneratorだけ新しく用意するようにしたいね。
      // 初期状態でのガンの設定はconstructorに書く・・かも。
      // つまりconstructorに初期の直進オンリーのガンだけかいておいてあとはクリアするたびに
      // 追加されて行って追加されたガンは前のステージでも使えるっていうふうにしようねっていう話。
      this._gun.setParameter(60, 240, 15, 15);

      // とりあえずめんどくさいので
      let flow_0_0 = new setVelocityHub(3, 0);
      let flow_0_1 = new matrixArrow(1.05, 0, 0, 1.05, 240);
      let shot_0 = playFlow.createShot([flow_0_0, flow_0_1], 1, 0, 10);
      this._gun.registShot(shot_0);

      let flow_1_0 = new n_wayHub(10, 0, PI / 4, 1);
      let flow_1_1 = new matrixArrow(1.01, 0, 0, 0.8, 420);
      let shot_1 = playFlow.createShot([flow_1_0, flow_1_1], 3, 10, 25);
      this._gun.registShot(shot_1);

      let flow_2_0 = new setVelocityHub(10, 0);
      let flow_2_1 = new matrixArrow(0.98, 0, 0, 0.98, 30)
      let flow_2_2 = new limitedCircularDelayHub(5, 20, 4, 4, 0, PI / 10);
      let flow_2_3 = new matrixArrow(1.01, 0, 0, 1.01, 480)
      let shot_2 = playFlow.createShot([flow_2_0, flow_2_1, flow_2_2, flow_2_3], 20, 17, 40);
      // まとめてflow用意してそれらをconnectしてshotにするまでをstaticかなんかでメソッドにするといいかもね。
      this._gun.registShot(shot_2);

      // もちろんいきなりこんないろいろ使えるのではなくて徐々に増やしていくんだけどとりあえず。
      // さて次はenemyの実装。動きは言ったように位置ベースでやる。円軌道とか色々。振動とか。
      // 動かずに攻撃しまくるのもありかな・・攻撃パターンも考えなきゃだし。攻撃の際の、
      // bulletの消費の仕方とかもろもろは同じように実装したいけどどうなるか分かんないな。
      // 一定フレームごとに自動的に、って流れになりそう。なんせ自動ですべて制御
      // おやすみなさい

      this._gun.setFlow(new controlGun());
      this._gun.activate();
      // cost: 一度に消費する弾数
      // hue: 弾の色
      // initialFlow: 弾にセットされるflow. 最後はないので自動的にinActivate.
      // wait: 撃ってから次に撃てるようになるまでのインターバル
    }
  }
  static createShot(flowSet, cost, hue, wait){
    // shotを作る～flowSetに配列を入れるとその順にくっつけてcostとかhueとか入れて辞書作ってくれる
    // もっとも、分岐させる場合はその限りではない（挙動をランダムで変化させるとか）ので個別に作る必要があるけど。
    for(let i = 1; i < flowSet.length; i++){
      flowSet[i - 1].addFlow(flowSet[i]);
    }
    return {cost:cost, hue:hue, initialFlow:flowSet[0], wait:wait};
  }
  reset(){
    this._gun.reset(); // gunの所に書く
    // this._enemyGenerator.reset(); // enemyGeneratorに書く
    this.play_on = false;
  }
}
// enemyGeneratorにはgenerateFlowのシークエンスのinitialFlowをセットすることになりそう。
// 各generateFlowには敵の出現のさせ方やインターバルの長さなどが記述されてる。その通りに挙動する。

// 現時点で考えているレベリング・・
// 最初は通常のショットだけ、弾数は20からスタート、HPも50からスタート
// クリアするごとにupdate, 内容は弾数増やす、ショット増やす、HP増やす。
// 最終的にショットは6種類くらいにしたい。HPも300くらいまで上げて・・敵も強くする感じ。おわり。
// そういうわけなので、setStageにはショット関連の記述は書かないことになりそう。（敵の用意云々だけ書く感じ）
// clearしたときにplayの方でメソッド使って拡張処理しつつclearStateにconvertしてとかそんな感じになりそう。

class pauseFlow extends flow{
  constructor(){
    super();
    this.initialState = ACT;
    this.nextStateIndex = 0; // デフォルトは「playに戻る」、その下に「titleに戻る」。
    // titleに行く場合はplayの方をresetする（その処理の中でplay_onをfalseにしたり色々する）
  }
  execute(_entity){
    // Wキーで上、Xキーで下に動くカーソル。Zキーで決定。
    if(keyFlag & 4){
      this.nextStateIndex = (this.nextStateIndex + 1) % 2; flagReset();
    }else if(keyFlag & 8){
      this.nextStateIndex = (this.nextStateIndex + 1) % 2; flagReset();
    }else if(keyFlag & 2){
      this.convert(_entity); flagReset();
    }
  }
  convert(_entity){
    _entity.setFlow(this.convertList[this.nextStateIndex]);
    if(this.nextStateIndex === 1){
      this.convertList[0].reset(); // titleに戻る際にはすべてリセットする・・
    }
    this.nextStateIndex = 0; // インデックスリセット
  }
  render(_entity){
    // 中央に黒い四角と選択肢とカーソルを表示する。カーソルはキー操作で動かす。
    push();
    fill(0);
    rect(160, 120, 320, 240);
    fill(100);
    textSize(30);
    text('PAUSE', 180, 180)
    textSize(20);
    text('TO PLAY', 210, 210);
    text('TO TITLE', 210, 240);
    fill(80, 100, 100);
    rect(180, 190 + 30 * this.nextStateIndex, 20, 20);
    pop();
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
