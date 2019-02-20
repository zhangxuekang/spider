const cheerio = require('cheerio')
const iconv = require('iconv-lite')
const fs = require('fs')
const request = require('request')
const ProgressBar = require('progress')

var url = 'http://image.so.com/i?q=%E7%8C%AB&src=tab_www'

request(url, (err, res, body) => {
  if (!err && res.statusCode === 200) {
    const $ = cheerio.load(body);
    const imgList = []
    JSON.parse($('script[id="initData"]').html()).list.forEach(item => imgList.push(item.img))
    const bar = new ProgressBar(' downloading [:bar] :percent :rate/s :etas', {
      complete: '=',
      incomplete: '_',
      width: 20,
      total: imgList.length
    })
    // 超过10秒没有反应就停止下载
    const handle = poison(() => {
      bar.tick(imgList.length)
    }, 1000 * 10)
    imgList.forEach((pic, index) => {
      if (index > 0) {
        download(pic, index, false, 3, (e, data) => {
          bar.tick()
          handle()
        })
      }
    })
  }
})


function download(src, name, progress = true, limit = 3, callback = () => { }) {
  const type = src.substring(src.lastIndexOf('.'))
  if (/^\.\w+$/.test(type)) {
    const req = request(src)
    req.on('error', (e) => { callback(e) })
      .on('response', (res) => {
        const len = parseInt(res.headers['content-length'], 10)
        const lenM = parseFloat((len / 1024 / 1024).toFixed(3))
        if (progress) {
          bar = new ProgressBar(' downloading [:bar] :rate/bps :percent :etas', {
            complete: '=',
            incomplete: '_',
            width: 20,
            total: len
          });
          req.on('data', (chunk) => {
            bar.tick(chunk.length)

          }).on('complete', () => {
            console.log('\n')
          })
        }
        // 过滤大于3m的图片
        if (lenM <= limit) {
          req.pipe(fs.createWriteStream('src/pack/' + name + type))
            .on('close', () => {
              callback(null, name + type + ' done ' + lenM + 'm')
            })
        } else {
          callback('资源过大')
        }
      })
  } else {
    callback('file url error:' + name + type)
  }
}


function writeData(data) {
  fs.writeFile('src/result.txt', JSON.stringify(data), (e) => {
    if (e) {
      console.log(e, '写入文本失败')
    }
  })
}

// 毒药, 必须每天给解药, 如果超过时间不给解药就发作
function poison(fn, time) {
  let tik = setTimeout(() => {
    fn()
  }, time)
  function antidote() {
    clearTimeout(tik)
    tik = setTimeout(() => {
      fn()
    }, time)
    return antidote
  }
  return antidote
}