'use strict';
// パターンとかやめて、ひとつのケースでやる。ポーズは中央に黒い四角、白い文字。Pボタンでポーズ。
// タイトル→セレクト→プレイ？んー・・
// とりあえずいきなり動かすでいいよ。
// てかもうさっさと動かしたい気持ちでいっぱい
// あ、なんかすごい音がしてる・・やっぱ相当負担かかってるなー・・無理させないようにしよ。

// 次にやること・・
// 1. enemyとplayerBulletの衝突判定を作る
// 2. enemyBulletとgunの衝突判定を作る
// 3. enemyBulletとplayerBulletに威力を与える
// 4. enemyとgunにHPを与える
// 5. gunのHPが表示されるようにする
// 6. enemyのHPが減るようにする
// 7. enemyのHPが0になった時の仕様を作る
// gunのHPが0になった時の仕様とかgameoverのstateは後回しで。
// とりあえず敵全員倒したらclearにしてclearのstateも作るけどそれも後回しで。
// とりあえず敵倒せるようにするか・・。
let all;
let hueSet = [];
let clickPosX;
let clickPosY;
let keyFlag;

let collisionCount;

// let bgs = [];

const IDLE = 0;
const PRE = 1;
const ACT = 2;

// 時間表示の設置。
const timeCounter = document.createElement('div');
document.body.appendChild(timeCounter);
const collisionCounter = document.createElement('div');
document.body.appendChild(collisionCounter);
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

  collisionCount = 0;
}

// initialFlowでtitleにすることってできる？

function draw(){
  const start = performance.now(); // 時間表示。
  all.update();
  all.render(); // renderにする
  const end = performance.now();
  const timeStr = (end - start).toPrecision(4);
  timeCounter.innerText = `${timeStr}ms`;

  collisionCounter.innerText = collisionCount.toString();
}

// ------------------------------------------------------------------------------------- //
// initialize.

function initialize(){
  const _titleFlow = new titleFlow();
  const _selectFlow = new selectFlow();
  const _playFlow = new playFlow(); // ステージをいくつか用意したりするかもしれないけど(引数がステージ番号)
  const _pauseFlow = new pauseFlow();
  const _gameoverFlow = new gameoverFlow();
  const _clearFlow = new clearFlow();
  _titleFlow.addFlow(_selectFlow);
  _selectFlow.addFlow(_titleFlow); // selectからはtitleとplayに行けるように
  _selectFlow.addFlow(_playFlow); // 0がtitleで1がplay.
  _playFlow.addFlow(_pauseFlow); // playからはpauseと、あとgameoverとclearにいけるけどまだ。
  _playFlow.addFlow(_gameoverFlow);
  _playFlow.addFlow(_clearFlow);
  _pauseFlow.addFlow(_playFlow);  // pauseからはtitleとplayに行ける
  _pauseFlow.addFlow(_titleFlow); // 0がplayで1がtitle.
  _gameoverFlow.addFlow(_titleFlow);
  _clearFlow.addFlow(_titleFlow);
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
  else if(key === 'r'){ keyFlag |= 128 } // re: gameoverやclearからの離脱に使う。
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

// 複数の敵で共通のflowを共有する場合ね・・あ、そうか、共有しないんだっけ。じゃあいいや（おい）
// 横方向に特化したn_wayHub.
class n_waySimpleHub extends flow{
  constructor(vx, vy, n){
    super();
    this.directionArray = [];
    let _length;
    if(n % 2 === 0){ // 偶数の場合
      _length = -(n / 2) + 0.5;
    }else{ // 奇数の場合
      _length = -((n - 1) / 2);
    }
    for(let i = 0; i < n; i++){
      this.directionArray.push(createVector(vx, vy * _length));
      _length += 1;
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
  reset(){
    this.currentIndex = 0; // 念のため
  }
}
// これを用いたn_wayGunの作り方。
// まず横方向の速度に対する縦方向の速度は比率で、この差でいくつおきに・・
// かませるmatrixは基本1.01の0.8, これで鋭く曲がる。たとえば10, 15, 3で1.01, 0, 0, 0.8だと質の良い3Wayになる。
// 1.01の方を大きくするとより遠くでまっすぐになるようになり。0.8を小さくしても同様の効果が得られる感じ。計算で出せるはず。

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

// コンスタントフロー
class constantFlow extends flow{
  constructor(from, to, span){
    super();
    this.from = from;
    this.to = to;
    this.span = span;
    this.initialState = PRE; // timerのsetting.
  }
  initialize(_enemy){
    _enemy.timer.setting(this.span);
  }
  execute(_enemy){
    if(_enemy.state === PRE){ this.initialize(_enemy); _enemy.setState(ACT); }
    _enemy.timer.step();
    let prg = _enemy.timer.getProgress();
    _enemy.pos.x = map(prg, 0, 1, this.from.x, this.to.x);
    _enemy.pos.y = map(prg, 0, 1, this.from.y, this.to.y);
    _enemy.fire(); // ここでfire.
    if(prg === 1){
      this.convert(_enemy);
    }
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
    this.w = 0; // 横幅、縦幅の半分の長さ。
    this.h = 0;
    // speedはgunだけ（移動操作）
    this.muzzle = []; // shotという辞書を格納する、initialFlowとかwaitについての情報が入ってる
    this.currentMuzzleIndex = 0;
    this.magazine = []; // 弾を格納する。格納の仕方が異なるので・・enemyの場合は親から与えられる感じ。gunは直接作る。
    this.cursor = 0; // non-Activeを調べるための初期位置
    this.wait = 0;
    this.stock = 0; // bulletVolumeはenemyでは可変。
    this.bodyHue = 0;
    this.myCollider = new rectangleCollider(0, 0, this.w * 2, this.h * 2);
    this.maxHP = 0; // 最大HP
    this.currentHP = 0; // 現HP
    this.animId = 0; // アニメーションの種類（0, 1, 2で出現、ダメージ時、やられたとき）
    this.animCount = 0; // 100から減っていく感じで。それを元に透明度を指定。
  }
  setPos(x, y){
    this.pos.set(x, y);
  }
  setParameter(w, h, maxHP){
    // パラメータこっちで。HPとかも・・？
    this.w = w;
    this.h = h;
    this.maxHP = maxHP;
    this.currentHP = maxHP;
    // gunなら位置設定、enemyなら出現時にanim関連のパラメータを決める
    this.animCount = 100;
    this.animId = 0;
  }
  changeHP(value){
    this.currentHP = constrain(this.currentHP + value, 0, this.maxHP);
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
      // if(this._type === 'gun'){ console.log(n); }
      n--;
      let _bullet = this.magazine[this.cursor];
      _bullet.setHueValue(shot['hue']); // hueの値
      _bullet.setFlow(shot['initialFlow']);
      _bullet.setPos(this.pos.x, this.pos.y);
      _bullet.setDamage(shot['damage']); // ダメージ設定
      _bullet.activate(); // used要らない。bullet自身が判断して自分の親のmagazineに戻ればいいだけ。
      _bullet.visible = true;
    }
    this.wait = shot['wait']; // waitを設定
  }
  update(){
    if(!this.isActive){ return; }
    // これ以下の部分はやられるアニメの時はスルーにする。
    // で、その代わりにthis.animId === 2かつthis.animCount === 0ならばset(undefined)する。
    // ただ残機数を決めておく、敵の場合とか、1がデフォルト。gunの場合は2とか3とか増える感じ。
    // 残機数はcheckで減らす。0の場合、復活しないので敵ならやられるけどgunの場合は復活する。
    // 復活はrevive()を設けて（デフォルトは何もしない）、まあ、色々やる。
    if(this.currentHP === 0){
      if(this.animId === 2 && this.animCount === 0){ this.setFlow(undefined); }
      return;
    }
    this.currentFlow.execute(this); // gunの場合はここで設定して・・
    this.myCollider.update({x:this.pos.x - this.w, y:this.pos.y - this.h, w:this.w * 2, h:this.h * 2});
    // 直後に発射。
    this.magazine.forEach(function(b){
      if(b.isActive){ b.update();} // activeなものだけupdateする
    })
    if(this.wait > 0){ this.wait--; } // waitカウントを減らす(executeの前に書かないと1のとき意味をなさなくなる)
  }
  render(){
    this.magazine.forEach(function(b){ if(b.isActive){ b.render(); } });
    this.renderBody();
  }
  renderBody(){
    // デフォルト. gunの方では変えたりとかする
    push();
    let alpha = this.getAlpha();
    noStroke();
    fill(this.bodyHue, 100, 100, alpha);
    rect(this.pos.x - this.w, this.pos.y - this.h, 2 * this.w, 2 * this.h);
    pop();
  }
  reset(){} // リセット処理。gunの場合はtitleに戻るとき発動、enemyの場合はやられたときに発動
  // enemyの場合はtitleに戻るときはenemyオブジェクト自体が破棄される（作り直し）。
  // やられたときのresetはmagazineを空にして参照を入れ直す準備をする（enemyのmagazineは
  // enemyGeneratorの一部分（親がundefined）を切り離して使う）。resetの時に・・
  // enemyGeneratorをresetするときにそこに入ってるenemyBulletの親をまとめてundefinedにする仕様
  hit(other){
    // ダメージを受ける仕様を書きたいね
    // まずisActiveでないときは何も起きないってことで。
    // activeでもotherが消えてる時は何も起きないよね。
    // 両方activeならbulletのダメージとこっちのHPから挙動を決める。
    if(this.animCount === 0){
      this.changeHP(-other.damage);
    }
    // console.log(this.currentHP);
    // gunがHP0になった場合・・アニメは置いといて、とりあえずactiveは切る（でないとオーバーキルになる）。
    // if(this.currentHP === 0){ this.reset(); }
    // そのあと残機ありなら残機減らして再スタート、なしならgameoverにconvertする。それは残機をplayFlowが
    // 監視していて残機0を読み取ったらgameoverにconvertする。
    //if(other._type === 'enemyBullet'){ console.log('gun %d damaged!!', other.damage); }
    //else if(other._type === 'playerBullet'){ console.log('enemy %d damaged!!', other.damage); }
  }
  check(){
    if(this.currentHP > 0){
      this.animId = 1;
      this.animCount = 100;
    }else{
      this.animId = 2;
      this.animCount = 100;
      this.reset(); // やられたらリセット
    }
  }
  // id:0~2, count:99~0.
  getAlpha(){
    if(this.animCount === 0){ return 100; }
    this.animCount--;
    if(this.animId === 0){ return 100 - this.animCount; } // 出現時
    else if(this.animId === 1){ return 100 * (1 - Math.floor(this.animCount / 4) % 2) } // ダメージ時
    else if(this.animId === 2){ return this.animCount; } // やられるとき
  }
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
    // ここには0だけ書くようにして順次グレードアップ、みたいな。
    this.registShot_0();
    this.registShot_1();
    this.registShot_2();
  }
  setParameter(w, h, maxHP){
    // パラメータこっちで。HPとかも・・？
    this.w = w;
    this.h = h;
    this.maxHP = maxHP;
    this.currentHP = maxHP;
    // gunなら位置設定、enemyなら出現時にanim関連のパラメータを決める
    this.animCount = 100;
    this.animId = 0;
    // stockとcurrentHPはここで決める。resetには書かない方向で。
    this.stock = this.magazine.length;
    this.currentHP = this.maxHP;
    this.currentMuzzleIndex = 0;
    this.bodyHue = 0;
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
    let alpha = this.getAlpha();
    noStroke();
    fill(30, 30, 30, alpha);
    // 本体の描画(やられる時のアニメはここでやる、あと出現時とダメージ後のブリンクを予定してる)
    rect(this.pos.x - this.w, this.pos.y - this.h, 2 * this.w, 2 * this.h);
    fill(this.bodyHue, 100, 100, alpha); // 透明度を指定してアニメを行う
    rect(this.pos.x - this.w + 5, this.pos.y - this.h + 5, 2 * (this.w - 5), 2 * (this.h - 5));
    // 弾数ゲージの描画
    if(this.stock > 0){
      fill(5, 100, 100);
      rect(10, 10, this.stock, 20);
    }
    // HPゲージの描画
    fill(70);
    rect(10, 40, this.maxHP, 20);
    if(this.currentHP > 0){
      fill(70, 100, 100);
      rect(10, 40, this.currentHP, 20); // HPゲージ。
    }
    // 弾の位置に応じた弾数表
    fill(0);
    for(let i = 0; i < this.magazine.length; i++){
      if(!this.magazine[i].isActive){ rect(10 + 11 * i, 70, 10, 5); }
    }
    pop();
  }
  // 残機ありの状態でやられた場合（currentHPが0になった場合）は、やられるときのアニメーションをrenderで
  // やったあと、残機をひとつ減らして、resetの内容のうちcursor = 0, wait = 0, bodyHue = 0,
  // magazine各々undefined, stockもリセット、・・・つまりmuzzle関連とsetFlow(undefined)以外すべて
  // 実行したうえで・・ああ、全部でいいのか。な？全部でいい。
  // やられるアニメ→リセット→controlGunはセットしっぱなしでいい気がする。
  reset(){
    // やられたときの処理とは別
    // muzzleに関しては、ステージ内で新しいの手に入るようにするかそれとも履歴が残っていくようにするか考え中
    // いいや、履歴残るようにしよう。最大HPも最大弾数もステージクリアごとに残る仕様で。
    // クッキーとか使えないかな・・何だっけ、ブラウザに記録するあれ。
    //this.muzzle = [];
    //this.currentMuzzleIndex = 0;
    this.cursor = 0;
    this.wait = 0;
    this.magazine.forEach(function(b){ b.setFlow(undefined); }) // magazine...enemyでは空にする
    // controlGunはセットしっぱなしでいい。
    //this.inActivate();
    // resetするのはgameoverから行く場合とclear, pauseから行く場合があって、
    // gameoverから行く場合はupdateの中でsetFlow(undefined)する感じ。それ以外は追加する。
  }
  // cost: 一度に消費する弾数
  // hue: 弾の色
  // initialFlow: 弾にセットされるflow. 最後はないので自動的にinActivate.
  // wait: 撃ってから次に撃てるようになるまでのインターバル
  // damage: 弾がgunに与えるダメージ
  // maxSpeed: xとかy方向のスピードの最大値、たとえばx方向は5まで、とか。
  registShot_0(){
    // 直線弾
    let f0 = new setVelocityHub(3, 0);
    let f1 = new matrixArrow(1.05, 0, 0, 1.05, 240);
    f0.addFlow(f1);
    let shot_0 = {cost:1, hue:0, initialFlow:f0, wait:10, damage:5};
    this.registShot(shot_0);
  }
  registShot_1(){
    // 3WAYガン
    let f0 = new n_waySimpleHub(10, 15, 3);
    let f1 = new matrixArrow(1.01, 0, 0, 0.8, 420);
    f0.addFlow(f1);
    let shot_1 = {cost:3, hue:10, initialFlow:f0, wait:25, damage:3};
    this.registShot(shot_1);
  }
  registShot_2(){
    // 散開弾
    let f0 = new setVelocityHub(10, 0);
    let f1 = new matrixArrow(0.98, 0, 0, 0.98, 30)
    let f2 = new limitedCircularDelayHub(5, 20, 4, 4, 0, PI / 10);
    let f3 = new matrixArrow(1.01, 0, 0, 1.01, 480)
    f0.addFlow(f1);
    f1.addFlow(f2);
    f2.addFlow(f3);
    let shot_2 = {cost:20, hue:17, initialFlow:f0, wait:40, damage:1};
    this.registShot(shot_2);
  }
}

// enemyがやられる・・画面外に出ていった場合もやられる判定としたい。
// HPが0になった時に呼び出されたりとかいろいろ。
// まず、flowをundefinedにセットして自動的にnon-Activeにして、手持ちのbulletについてもすべて親をundefined
// にすると。もちろんflowもundefined...だから、ああそうか、playerBulletの場合はなくなっても親は一緒だけど
// enemyBulletはenemyが倒されることにより消える場合は親の情報がdeleteされるんだっけ。そこね。注意したいのは。
// って、あー、、resetに書いたんだっけ。
class enemy extends fireUnit{
  constructor(){
    super(); // bulletVolumeについては、enemyGenerator側で指定するからいい。（non-Activeなやつから切り出して使う）
    // speedも位置ベースの動きをする分には問題ない、なんなら速度も加えてそういう動きも出来るように改良する。
    // magazineとstockはenemyGeneratorが決めるってこと
    this._type = 'enemy';
    this.timer = new counter(); // timerなかったん・・・
  }
  revolve(){
    this.currentMuzzleIndex = (this.currentMuzzleIndex + 1) % this.muzzle.length;
  }
  reset(){
    // enemyは再利用するのでそのためのデフォルト化処理を書いている。
    // ここら辺はもうちょっと先まで行かないと検証できない、その都度確認する。
    this.muzzle = [];
    this.currentMuzzleIndex = 0;
    this.cursor = 0;
    this.wait = 0;
    for(let i = 0; i < this.magazine.length; i++){
      this.magazine[i].setFlow(undefined); // とりあえず消滅してもらう。このとき親がいないとエラーになるので先に書く。
      this.magazine[i].setParent(undefined); // 親の履歴を消す（再利用化）
    }
    this.magazine = [];
    this.stock = 0;
    //this.setFlow(undefined); // このときnon-Activeになるので描画されなくなる
  }
}

// enemyの設定
function createEnemy(id, _enemy){
  if(id < 3){ createSimpleEnemy(id, _enemy); }
  // ここに追加していく
  _enemy.visible = true; // 生成するときにtrueにしてやられたらfalseに戻す
}

function createSimpleEnemy(id, _enemy){
  // id === 0, 1, 2のとき30x30, 24x24, 18x18. たとえば3, 4, 5だったら3を引くなど。
  // HPは5, 10, 15.
  _enemy.setParameter(15 - id * 3, 15 - id * 3, id * 5 + 5);
  // 弾数は2, 4, 6. この情報を元にmagazineに装填される
  _enemy.stock = 1 + 1 * id;
  // muzzleに入れるのは各々真正面、2方向、3方向で直線的。角度は30°くらいで。arcHub使う。
  let f_0 = new n_waySimpleHub(-4, 6, id + 1);
  let f_1 = new matrixArrow(1.01, 0, 0, 0.9, 360);
  f_0.addFlow(f_1);
  // ダメージは3, 2, 1とする。
  _enemy.muzzle.push({cost: id + 1, hue: id * 5, initialFlow: f_0, wait: 10, damage: 4 - id});
  _enemy.bodyHue = id * 5; // 5, 10, 15.
}

class bullet extends actor{
  constructor(type, parent = undefined){
    super();
    this._type = type; // playerBulletかenemyBulletか
    this.w = 5;  // 幅の半分を設定したほうが都合がいい。
    this.h = 5;
    this.parent = parent; // bulletの所属先。generatorかgunかって話。
    this.pos = createVector();
    this.velocity = createVector();
    this.timer = new counter();
    this.hueValue = 0;
    this.damage = 1; // ダメージ量
    this.myCollider = new rectangleCollider(0, 0, this.w * 2, this.h * 2);
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
  setParent(newParent){
    this.parent = newParent; // 親の設定。enemyの場合はコロコロ変わるので。
  }
  setDamage(newDamage){
    this.damage = newDamage; // ダメージ再設定
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
  // updateを上書きしてcolliderが更新されるようにする
  update(){
    if(!this.isActive){ return; } // ここはそのまま
    this.currentFlow.execute(this); // これだけ。すっきりした。
    this.myCollider.update({x:this.pos.x - this.w, y:this.pos.y - this.h, w:this.w * 2, h:this.h * 2});
  }
  render(){
    if(!this.visible){ return; }
    // その色の四角形を描く、位置に。
    push();
    fill(this.hueValue, 100, 100);
    noStroke();
    rect(this.pos.x - this.w, this.pos.y - this.h, this.w * 2, this.h * 2);
    pop();
  }
  hit(other){
    // bullet側なので当たったら消える仕組みを設けたい所。
    // ただ、当ててもダメージを与えられない場合にも消えて欲しいというふうになるかもしれないので、
    // ダメージを受けるかどうかのフラグが欲しいところ。でないとダメージを与えられない場合にすりぬけてしまうので。
    // this.setFlow(undefined); // 消滅させるだけ。
    // 消滅はcheckで行うため、いまのところやることが無い
  }
  check(){ this.setFlow(undefined); }
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
  constructor(){
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
  update(){
    if(!this.isActive){ return; }
    this.currentFlow.execute(this);
    this.enemySet.forEach(function(e){ e.update(); }) // 上書き忘れてた・・
  }
  initialize(enemyVolume, bulletVolume){
    // 初期化・・。
    for(let i = 0; i < enemyVolume; i++){
      this.enemySet.push(new enemy());
    }
    for(let i = 0; i < bulletVolume; i++){
      this.bulletSet.push(new bullet('enemyBullet')); // 親は定義しない
    }
  }
  chargeBullet(_enemy){
    let n = _enemy.stock;
    let i = 0;
    while(n > 0){
      if(this.bulletSet[i].parent !== undefined){ i++; continue; }
      let b = this.bulletSet[i];
      b.setParent(_enemy); // 親を設定するのはここ
      _enemy.magazine.push(b);
      n--; // これしないと無限ループになる
    }
  }
  render(){
    this.enemySet.forEach(function(e){
      if(e.isActive){ e.render(); } // activeなものだけrenderする
    })
  }
  reset(){
    this.enemySet = [];
    this.bulletSet = [];
    this.setFlow(undefined);
  }
}
// enemyGeneratorはステージセレクトからプレイステートに行くたびに新しいものが用意されるイメージで。
// gunの方はリセットしながら引き続き再利用する。新しい種類が増えて行ったりするので。
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
// generateFlow. enemyGeneratorにセットして敵を配置するための準備をする

// line...直線状に現れていったりきたり
// posArrayにいくつかのposが入ってて順番にconstantFlowにしたがって指定spanで進む感じ
// idで出現場所指定してそれぞれ配列で（以下略）
// 基本となるいくつかのあれ、それを平行移動でコピーする。そのベクトルを引数で渡す。むむ。。
class generateFlow_line extends flow{
  constructor(posArray, span, dx, dy, n, dataSet){
    // posArrayは基本となるいくつかのpos,spanはその間を遷移する必要フレーム数、dx, dyはずらし、nはいくつまで
    // ずらすか, dataSetはenemyのdataと出現位置のデータ。多分他にも色々（？）
    // 以上。今までやってきたmoving~~~と同じことやってるのよね。
    // span・・・spanSetにする必要があれば、そうするけど。
    super();
    this.flowSet = [];
    let m = posArray.length; // 各セグメントのシークエンスの長さ
    posArray.push(posArray[0]); // おしりに頭をくっつける（煩雑さ回避）

    for(let i = 0; i < n; i++){
      let segmentFlowSet = []; // connectingまで一通り終わってからまとめて放り込む。...が使えそう。
      for(let k = 0; k < m; k++){
        let from = createVector(posArray[k].x + dx * i, posArray[k].y + dy * i);
        let to = createVector(posArray[k + 1].x + dx * i, posArray[k + 1].y + dy * i);
        segmentFlowSet.push(new constantFlow(from, to, span));
      }
      connectFlows(segmentFlowSet, arSeq(0, 1, m), arSeq(1, 1, m - 1).concat([0]));
      this.flowSet.push(...segmentFlowSet); // 展開して放り込む。
    }

    this.dataSet = dataSet; // 敵を配置するためのデータセット。enemyIdとflowId.
    // enemyIdのenemyにflowIdのflowをセット、enemyは_generatorからnon-Activeなやつをコピーして使う
    this.enemySet = [];
    this.initialState = PRE;
  }
  initialize(_generator){
    // this.enemySetに_generatorのnon-Activeなenemyをコピーする。
    let n = this.dataSet.length;
    let i = 0;
    while(n > 0){
      if(_generator.enemySet[i].isActive){ i++; continue; } // Activeなものをスルーして
      this.enemySet.push(_generator.enemySet[i]); i++;
      n--;
    }
    for(let i = 0; i < this.dataSet.length; i++){
      let data = this.dataSet[i];
      let _enemy = this.enemySet[i];
      createEnemy(data['enemyId'], _enemy);
      _enemy.setFlow(this.flowSet[data['flowId']]);
      _generator.chargeBullet(_enemy); // bulletの装填メソッド
      _enemy.activate();
    }
  }
  // よく考えたらenemyってgeneratorにセットされてるやつを・・あれするんだっけ。
  execute(_generator){
    if(_generator.state === PRE){
      this.initialize(_generator);
      _generator.setState(ACT);
    }
    // 今回はここでenemyのsettingをしてるけど、flowによっては何匹倒したら離脱、とかそういうのもありだからね
    // そういう場合にはnon-Activeなやつを～ってのが意味を持つんだろうけど今回はそういうの、無しで。
    let flag = true;
    for(let i = 0; i < this.dataSet.length; i++){
      if(this.enemySet[i].isActive){ flag = false; break; } // 誰かしら生きてるなら引き続き
    }
    // この他に、親が生きていれば再現なく周りの敵を復活させるから親玉倒したらコンバート、でもよさそう。
    // その場合は復活メソッドを用意しなきゃ・・
    if(flag){ this.convert(_generator); } // 全員倒したらコンバート
  }
}

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
    if(keyFlag & 2){
      // Zボタンで発射
      _gun.fire(); flagReset();
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
    if(this.nextStateIndex === 0){
      _entity.setFlow(this.convertList[0]); // 0がtitleFLow.
    }else{
      _entity.setFlow(this.convertList[1]); // 1がplayFlow.
      _entity.currentFlow.setStageNumber(this.nextStateIndex); // ステージ数の設定
    }
    // _entity.setFlow(this.convertList[this.nextStateIndex]);
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
  constructor(){
    super();
    this._gun = new gun(50, 5); // 初期状態での弾の数と移動スピード
    // いずれはinitializeでパラメータを設定することになりそう。スピードとか大きさとか。
    //this._enemyGenerator = new enemyGenerator(20, 200); // 一度に出現する敵の数、合計の弾の数
    this._enemyGenerator = new enemyGenerator(); // initializeはsetStageで行う
    this.initialState = PRE;
    this.stageNumber = 0; // 1なら1, 2なら2.
    this.play_on = false; // ステージに来てinitializeしたのちtrueにする
    // selectからきたときはfalseなのでinitializeが発動してそのあとtrueになる
    // pauseからきたときはtrueになってるのでinitializeしないってなる。クリアした時など、pause以外で
    // playを抜けるときにここをfalseにすることで再初期化を促す感じ。
    this.backgroundColor = color(70);
    this.nextStateIndex = 0; // pause, gameover, clearが0, 1, 2.
    // 衝突関連。毎回初期化する。
    this._qTree = new linearQuadTreeSpace(width, height, 3);
    this._detector = new collisionDetector();
  }
  setStageNumber(newNumber){
    this.stageNumber = newNumber; // convertのときに呼び出す。
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
    // やられる場合はここで離脱. やられるときは上記のupdate内でisActiveが消える仕組み。
    if(!this._gun.isActive){
      this.nextStateIndex = 1;
      this.convert(_entity); flagReset(); return;
    }

    this._enemyGenerator.update();
    // クリアする場合はここで離脱
    if(!this._enemyGenerator.isActive){
      this.nextStateIndex = 2;
      this.convert(_entity); flagReset(); return;
    }


    // 衝突判定関連(collisionOccurはとりあえずなしで)
    this._qTree.clear(); // 線型四分木のクリア

    // 登録するのはgun, gunの持ってるbullet, Activeなenemy, Activeなenemyの持ってるbullet.
    // fireUnitにもvisibleを設定しないといけない。

    let collisionOccur = false;
    // animCountが正のときに当たり判定が生じないように修正。
    if(this._gun.isActive && this._gun.animCount === 0){
      this._qTree.addActor(this._gun);
      collisionOccur = true;
    }
    this._gun.magazine.forEach((b) => {
      if(b.visible){
        this._qTree.addActor(b);
        collisionOccur = true;
      }
    });
    // enemyGeneratorのbulletSetってやった方が節約になりそうな気がする
    this._enemyGenerator.enemySet.forEach((e) => {
      if(e.isActive && e.animCount === 0){
        this._qTree.addActor(e);
        collisionOccur = true;
      }
    });
    this._enemyGenerator.bulletSet.forEach((b) => {
      if(b.visible){
        this._qTree.addActor(b);
        collisionOccur = true;
      }
    });
    if(collisionOccur){
      this._hitTest(); // 判定する。_hittestの中でどの組み合わせなら判定するかとか決めるつもり。
    }

    // Pボタンでポーズ
    if(keyFlag & 64){
      this.nextStateIndex = 0;
      this.convert(_entity); flagReset();
    }
    // だめだ。ここに書いちゃうとHPゲージが0にならないし残機もそのまま残っちゃうよ。
    // controlGunにkilledみたいなのつなげてそっちに移行してもらう。
    // それが終わったら自動的にnon-Activeになる。non-Activeを以てgameoverの条件にするとか。
    // killedにcontrolGunとundefinedをつなげて残機がある場合はcontrolGunに、無い場合はundefinedに。
    // アニメーションもそのうち用意するけど・・
    // 敵の方はそのまま消える仕様でいいと。で、今の状態でも、そうしてワンクッションかませれば
    // ちゃんとHP0が描画されてから次のstateに移行してくれる。
    // killedStateのときはtreeに入れないようにしたい。
    // isActiveかどうかで判定してるところも書き換えないといけないし大変だ・・killedでもactiveだし。
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
        // Cahceへの代入までスルーしちゃうとまずいみたい
        // ここでobj1, obj2の性質によるバリデーションかけてfalseならcontinue
        if(!this.validation(obj1._type, obj2._type)){ continue; }

        const hit = this._detector.detectCollision(collider1, collider2);

        if(hit) {
          collisionCount++;
          if(obj1.isActive && obj2.isActive){
            obj1.hit(obj2);
            obj2.hit(obj1);
            // 衝突処理が終了した後の事後処理（消すとかそういうの）
            obj1.check();
            obj2.check();
          }
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

        // objとcellobjの性質からバリデーションかけてfalseならcontinue.
        if(!this.validation(obj._type, cellObj._type)){ continue; }

        const collider2 = cellColliderCahce[j]; // キャッシュから取ってくる。
        const hit = this._detector.detectCollision(collider1, collider2);

        if(hit) {
          collisionCount++; // ぶつかった回数
          if(obj.isActive && cellObj.isActive){
            obj.hit(cellObj);
            cellObj.hit(obj);
            obj.check();
            cellObj.check();
          }
        }
      }
    }
  }
  validation(type1, type2){
    if(type1 === 'enemy' && type2 === 'playerBullet'){ return true; }
    if(type1 === 'playerBullet' && type2 === 'enemy'){ return true; }
    if(type1 === 'gun' && type2 === 'enemyBullet'){ return true; }
    if(type1 === 'enemyBullet' && type2 === 'gun'){ return true; }
    return false;
  }
  convert(_entity){
    // とりあえずpauseだけ、pauseからはtitleかplayに行ける感じで。titleに行く際にはすべてリセット。
    // gameoverからtitle, clearからもtitle.
    _entity.setFlow(this.convertList[this.nextStateIndex]);
    if(this.nextStateIndex > 0){ this.reset(); } // ゲームオーバーの場合はgeneratorだけリセットする
    this.nextStateIndex = 0;
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
    this._gun.render(); // gunは常にrenderする。HPが0でもアニメに必要・・そこらへんはあっちに書くよ。
    // 出現するときとか・・基本アニメ中はダメージ受けないからそこらへんも。何かひとつ数を用意して
    // それが0になっていく過程で透明度を指定しつつアニメ、で、その間はその値が正だからダメージ受けない、
    // そういうのを考えてる。敵についても同じものを想定してる。
    this._enemyGenerator.render();
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
      this._gun.setPos(60, 240);
      this._gun.setParameter(15, 15, 50); // gunの大きさ、HPを設定

      // 各種shotはgunのメソッドで追加するようにした（ステージクリアで増える）。

      this._gun.setFlow(new controlGun());
      this._gun.activate();

      // enemyGeneratorの準備
      this._enemyGenerator.initialize(20, 200);
      let posArray = [createVector(300, 50), createVector(400, 50), createVector(400, 100)];
      let span = 20;
      let dx = 10;
      let dy = 120;
      let n = 3;
      // 9個flowがあって、9匹用意することに。
      let dataSet = [];
      for(let i = 0; i < 9; i++){ dataSet.push({enemyId:i % 3, flowId:i}); }
      this._enemyGenerator.setFlow(new generateFlow_line(posArray, span, dx, dy, n, dataSet));
      this._enemyGenerator.activate();
    }else if(this.stageNumber === 2){
      // ステージ2.
    }
  }
  static createShot(flowSet, cost, hue, wait, damage){
    // shotを作る～flowSetに配列を入れるとその順にくっつけてcostとかhueとか入れて辞書作ってくれる
    // もっとも、分岐させる場合はその限りではない（挙動をランダムで変化させるとか）ので個別に作る必要があるけど。
    for(let i = 1; i < flowSet.length; i++){
      flowSet[i - 1].addFlow(flowSet[i]);
    }
    return {cost:cost, hue:hue, initialFlow:flowSet[0], wait:wait, damage:damage};
  }
  reset(){
    if(this.nextStateIndex > 1){
      this._gun.reset();
      this._gun.setFlow(undefined);
    }
    this._enemyGenerator.reset(); // enemyGeneratorに書く
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

// playFlowにおいてgunの残機が無くなったらゲームオーバーに移行する。
// その際、画像はそのままでグラフィックは上書きにする。
// クリアの時もだけど、pauseからtitleに戻るときのように、playからgameoverやclearに行くときは
// その前にリセットしてしまう、そのうえでいろいろ表示する。playから移行するのでplayのconvertに書く。
class gameoverFlow extends flow{
  constructor(){
    super();
    this.initialState = ACT;
  }
  execute(_entity){
    // Rボタン押したらconvertしてタイトルへ。リセットは終わってる。
    if(keyFlag & 128){
      this.convert(_entity); flagReset();
    }
  }
  render(){
    // 中央に黒い四角とメッセージを表示し、Zボタンを押すとタイトルに戻るようにする。
    push();
    fill(0);
    rect(160, 120, 320, 240);
    fill(100);
    textSize(30);
    text('GAME OVER...', 180, 180)
    textSize(20);
    text('PRESS R BUTTON', 210, 210);
    pop();
  }
}

// クリア時は新しいshotの追加とか最大HP増やしたり弾数増やしたりいろいろやることがあるので・・
// それはおいおい書いていくと。
class clearFlow extends flow{
  constructor(){
    super();
    this.initialState = ACT;
  }
  execute(_entity){
    // Rボタン押したらconvertしてタイトルへ。リセットは終わってる。
    if(keyFlag & 128){
      this.convert(_entity); flagReset();
    }
  }
  render(){
    push();
    fill(0);
    rect(160, 120, 320, 240);
    fill(100);
    textSize(30);
    text('STAGE CLEAR!!', 180, 180)
    textSize(20);
    text('PRESS R BUTTON', 210, 210);
    pop();
  }
}
// ----------------------------------------------------------------------------------------------- //
// パターン生成用の汎用関数

// まとめてactivateする
function activateAll(actorSet){
  actorSet.forEach(function(_actor){ _actor.activate(); })
}

// 面倒なので、idSetのflowにdestinationSetの各flowが登録されるようにした。
function connectFlows(flowSet, idSet, destinationSet){
  for(let i = 0; i < idSet.length; i++){
    flowSet[idSet[i]].addFlow(flowSet[destinationSet[i]]);
  }
}

// -------------------------------------------------------------------------------------------------- //
// utility.
function constSeq(c, n){
  // cがn個。
  let array = [];
  for(let i = 0; i < n; i++){ array.push(c); }
  return array;
}

function jointSeq(arrayOfArray){
  // 全部繋げる
  let array = arrayOfArray[0];
  for(let i = 1; i < arrayOfArray.length; i++){
    array = array.concat(arrayOfArray[i]);
  }
  return array;
}

function multiSeq(a, m){
  // arrayがm個
  let array = [];
  for(let i = 0; i < m; i++){ array = array.concat(a); }
  return array;
}

function arSeq(start, interval, n){
  // startからintervalずつn個
  let array = [];
  for(let i = 0; i < n; i++){ array.push(start + interval * i); }
  return array;
}

function arCosSeq(start, interval, n, radius = 1, pivot = 0){
  // startからintervalずつn個をradius * cos([]) の[]に放り込む。pivotは定数ずらし。
  let array = [];
  for(let i = 0; i < n; i++){ array.push(pivot + radius * cos(start + interval * i)); }
  return array;
}

function arSinSeq(start, interval, n, radius = 1, pivot = 0){
  // startからintervalずつn個をradius * sin([]) の[]に放り込む。pivotは定数ずらし。
  let array = [];
  for(let i = 0; i < n; i++){ array.push(pivot + radius * sin(start + interval * i)); }
  return array;
}

function rotationSeq(x, y, angle, n, centerX = 0, centerY = 0){
  // (x, y)をangleだけ0回～n-1回回転させたもののセットを返す(中心はオプション、デフォルトは0, 0)
  let array = [];
  let vec = createVector(x, y);
  array.push(createVector(x + centerX, y + centerY));
  for(let k = 1; k < n; k++){
    vec.set(vec.x * cos(angle) - vec.y * sin(angle), vec.x * sin(angle) + vec.y * cos(angle));
    array.push(createVector(vec.x + centerX, vec.y + centerY));
  }
  return array;
}

function multiRotationSeq(array, angle, n, centerX = 0, centerY = 0){
  // arrayの中身をすべて然るべくrotationしたものの配列を返す
  let finalArray = [];
  array.forEach(function(vec){
    let rotArray = rotationSeq(vec.x, vec.y, angle, n, centerX, centerY);
    finalArray = finalArray.concat(rotArray);
  })
  return finalArray;
}

function commandShuffle(array, sortArray){
  // arrayを好きな順番にして返す。たとえばsortArrayが[0, 3, 2, 1]なら[array[0], array[3], array[2], array[1]].
  let newArray = [];
  for(let i = 0; i < array.length; i++){
    newArray.push(array[sortArray[i]]);
  }
  return newArray; // もちろんだけどarrayとsortArrayの長さは同じでsortArrayは0~len-1のソートでないとエラーになる
}

function reverseShuffle(array){
  // 通常のリバース。
  let newArray = [];
  for(let i = 0; i < array.length; i++){ newArray.push(array[array.length - i - 1]); }
  return newArray;
}

function randomInt(n){
  // 0, 1, ..., n-1のどれかを返す
  return Math.floor(random(n));
}

function getVector(posX, posY){
  let vecs = [];
  for(let i = 0; i < posX.length; i++){
    vecs.push(createVector(posX[i], posY[i]));
  }
  return vecs;
}
