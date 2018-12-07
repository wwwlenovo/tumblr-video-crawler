# tumblr-video-crawler
Run this app to download the videos and pictures you liked on Tumblr.
It will also download the pictures and video of the users who you are following.

## Requirment

Nodejs 

curl
## How to Run
```bash
npm install
npm start
```

## Congiurations

```javascript
const DOWNLOAD_CONCURRENCY = 8; //How many download process run concurrently
const CRAWL_CONCURRENCY = 3; //How many crawl process run concurrently
const MAX_PAGE = 20;  // Max page of a user to crawl
```