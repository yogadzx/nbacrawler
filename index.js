const request = require('request');
const cheerio = require('cheerio');
const moment = require('moment');
const Router = require('koa-router');
const fs = require('fs')
const url = 'https://zhibo8.com/schedule/finish_more.htm'
const totalData = []
const Koa = require('koa');
const app = new Koa();

// app.use(async ctx => {
//   await getData();
//   ctx.body = totalData
// });
const router = new Router();
router.get('/api/data', async ctx => {
  await getData();
  ctx.body = JSON.stringify(totalData,null, '\t')
})
app.use(router.routes());
app.use(router.allowedMethods({}));
app.listen(80);
async function getData () {
  return request(url, async function (error, response, body) {
    // 如果请求成功且状态码为 200
    if (!error && response.statusCode == 200) {
      // 使用 cheerio 加载 HTML 文档
      const $ = cheerio.load(body);
      // 存储获取到的数据
      
      await new Promise(async (resolve, reject) => {
        const lis = $('.record ._content').find('ul').find('li')
        const today = moment().format('YYYY-MM-DD');
        for(let i = 0; i< lis.length; i++) {
          const index = i;
          const value = lis[i];
          const id = value.attribs.id.replace('saishi', '')
          const dataTime = value.attribs['data-time'];
          const league = $(value).find('._league').text()
          // https://dc4pc.qiumibao.com/dc/matchs/data/2023-11-01/player_1230900.htm?get=0.5359058104545513 球员数据
          // https://dc4pc.qiumibao.com/dc/matchs/data/2023-11-01/score_team_1230900.htm?get=0.49059831174568114 球队数据
          if(dataTime.indexOf(moment().format('YYYY-MM-DD')) != -1 ) {
            if(league.indexOf('NBA') != -1 || league.indexOf('nba') != -1) {
              const players = await new Promise((resolve, reject)=> {
                request(`https://dc4pc.qiumibao.com/dc/matchs/data/${today}/player_${id}.htm`, (error, response, body) => {
                  if(body) {
                    try {
                      resolve(JSON.parse(body))
                    } catch (error) {
                      resolve(null)
                    }
                    
                  }
                  else {
                    resolve(null)
                  }
                })
              })
              if(players) {
                const gameData = playerGather(players);
                totalData.push(gameData)
              }
            }
          }
          if(index == lis.length - 1) {
            resolve()
          }
        }
      })
      // await writeFs(totalData)
    }
  });
}

function writeFs(totalData){
  fs.writeFile('./data.json', JSON.stringify(totalData,null, '\t'), function (err, data) {
      if (err) {
          throw err
      }
      console.log('数据保存成功');
  })
}

function scoreGather(obj) {
  const score = obj.data;
  if(!score) return null;
  const guest = score.guest;
  const host = score.host;
  const guestTeamName = unicodeEscape(score.guest.team_name);
  const hostTeamName = unicodeEscape(score.host.team_name);
  return {
    title: `${hostTeamName} vs ${guestTeamName}`,
    final: `${host.score} - ${guest.score}`
  }
}

function playerGather(obj) {
  const score = obj.data;
  if(!score) return null;
  const guest = score.guest;
  const host = score.host;
  const hostPlayer = playerInfo(score.host.on);
  const guestPlayer = playerInfo(score.guest.on);
  return {
    ['日期']: moment().format('YYYY-MM-DD'),
    ['场次']: `${host.team_name_cn} vs ${guest.team_name_cn}`,
    ['比分']: `${host.total?.points} - ${guest.total?.points}`,
    [`${host.team_name_cn}球员数据`]: hostPlayer,
    [`${guest.team_name_cn}球员数据`]: guestPlayer
  }
} 
function playerInfo(player) {
  
  return player.map((item)=>{
    const [threeGoal, threeShot] =  item.three.split('-');
    const [goal, shot] =  item.field.split('-');
    const threeRate = isNaN((threeGoal/threeShot*100)) ? '0' : (threeGoal/threeShot*100).toFixed(1)
    const rate = isNaN((goal/shot*100)) ? '0' : (goal/shot*100).toFixed(1)
    return {
      ['球员']: item.player_name_cn, //姓名
      ['得分']: item.points,//得分
      ['投篮']: item.field, //投篮
      ['投篮命中率']: rate, //投篮
      ['三分']: item.three, //三分
      ['三分命中率']: threeRate, //三分
      ['前场篮板']: item.off,//前场篮板
      ['后场篮板']: item.def,//后场篮板
      ['正负值']: item.plusMinus,//正负值
      ['行情']: followValue(item)
    }
  })
}

function followValue(player) {
  const [threeGoal, threeShot] =  player.three.split('-');
  const [goal, shot] =  player.field.split('-');
  const threeRate = isNaN((threeGoal/threeShot*100)) ? 0 : (threeGoal/threeShot*100).toFixed(1)
  const rate = isNaN((goal/shot*100)) ? 0 : (goal/shot*100).toFixed(1)
  // console.log(player.player_name_cn)
  // console.log(rate)
  if(player.plusMinus > 0) {
    if(threeRate > 40 && rate > 60) {
      return '👍👍👍'
    }
    else if(threeRate > 40 || rate > 60) {
      return '👍👍'
    }
    return '👍'
  }
  return '👎'
}

function unicodeEscape(code) {
  return eval("'" + code + "'");
}