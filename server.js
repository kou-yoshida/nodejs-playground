const Redis = require('ioredis');
const express = require('express');
const app = express();

// redisの接続
const redis = new Redis({
  port: 6379,
  host:'redis-redis-demo',
  password:'password',
  enableOfflineQueue: false
});


const init = async()=>{
  // await Promise.all([
  //   redis.set('user:1','value1'),
  //   redis.set('user:2','value2'),
  //   redis.set('user:3','value3'),
  // ])
  await redis.set('user:1','value1');
  await redis.set('user:2','value2');
  await redis.set('user:3','value3');
}


app.get('/',(req,res,next)=>{
  // エラーをnext()に渡すと、エラーハンドリングミドルウェアに処理が移る
  // throw new Error('エラーです'); →これでも、包括的エラーハンドリングミドルウェアに処理が移る
  try{
    // throw new Error('エラーです');
    res.status(200).send('Hello world');
  }catch(e){
    next(e);
  }
});


app.get('/user/:id',async (req,res)=>{
  try{
    // ここでidをもとにredisから値を取得する
    const result = await redis.get(`user:${req.params.id}`);
    
    console.log(result,'取得結果')
    if(!result){
      // 404エラーを返す
      res.status(404).send(new Error('ユーザーが見つかりません'))
    }
  
    res.status(200).send(result)
  }catch(e){
    next(e);
  }
  
});


app.get('/users', async (req,res)=>{

  const users =[];

  // redisから、すべてのユーザーデータを取得して返したい
  const stream = redis.scanStream({
    match:'user:*',
    count:2
  });

  for await (const user of stream){
    users.push(...user);
  }
  res.status(200).send(users);
})


// app.useで、共通ミドルウェアを登録できる
// 実行順は、上から順に実行される


// app.get('/',A,B,C)で、連鎖的にミドルウェアを実行できる
// 引数のnext()で次のミドルウェアを実行する
// 例えば、logMiddlewareのように切り出して、共通の処理を実行できる



const router = express.Router();
router.use((req,res)=>{
  // ルーティングの共通処理を書ける
  console.log('router.use')
})

/**
 * NOTE
 * 包括的エラーハンドリング
 * 最後に呼ばれる必要がある
 * 4つの引数は必須
 * 非同期エラーはキャッチできない
 */
app.use((err,req,res,next)=>{
  console.log('包括的エラーハンドラだよ',err)
  res.status(500).send('internal server errorだよ')
})





// 何度も呼び出される可能性があるのでonce()を使う
redis.once('ready',async()=>{
  // throw new Error('キャッチできないエラー')
  try{
    await init();
    app.listen(3000,()=>{
      console.log('listening on port 3000');
    })
  }catch(e){
    console.error(e);
    // エラーが発生したら、プロセスを終了する exit(0)は、正常終了 exit(1)は、異常終了
    process.exit(1);
  }
})



redis.on('error',(e)=>{
  console.error('redis error',e)
  process.exit(1);
})




// NOTE
// redis.once('ready', async () => {
//   throw new Error('例外がスローされました'); // これは、redis.on('error')にはキャッチされない
//   redis.set('key1', 'value1'); // ここで例外が発生すると、redis.on('error')にキャッチされる
// });
