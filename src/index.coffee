###

 @@@@    @@@   @       @@@   @@@@    @@@   @       @@@
 @   @    @    @        @    @   @    @    @        @
 @@@@     @    @        @    @@@@     @    @        @
 @   @    @    @        @    @   @    @    @        @
 @@@@   @@@@@  @@@@@  @@@@@  @@@@   @@@@@  @@@@@  @@@@@

###

import { getFlvUrl, queryUrl, download } from './getFlvUrl'
import { getHash, getAvNumber } from './getLocation'

# it from playurl
# change it if need
SIGN = 'a0cfb0ac98c3ec669cd52ea491ba38ab'

CID = window.cid
body = document.getElementsByTagName('body')[0]
page = getHash()
av = getAvNumber()
div = document.createElement('div')

# init div
div.style.cssText = '
  position: fixed;
  z-index: 100;
  top: 0;
  left: 0;
  padding: 5px;
  background-color: #fff;
  border: 5px solid #000;
'
body.appendChild(div)

start = ()->
  result = await getFlvUrl(CID, SIGN)
  flvList = queryUrl(result.durl)
  for item, index in flvList
    blobUrl = await download(item)
    title = "#{ av }_#{ page }_#{ index + 1 }.flv"
    a = document.createElement('a')
    a.style.cssText = '
      display: block;
      padding: 5px;
    '
    a.href = blobUrl
    a.download = title
    a.innerText = title
    div.appendChild(a)
start()