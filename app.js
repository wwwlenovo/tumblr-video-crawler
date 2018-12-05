const puppeteer = require('puppeteer');
const fs = require('fs');
const child_process = require('child_process');

(async () => {
    const browser = await puppeteer.launch({
        headless: true
    });
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(90000)
    await page.goto('https://www.tumblr.com/login');
    await page.type('#signup_determine_email', 'email@live.com');
    await page.click('#signup_forms_submit > span.signup_determine_btn.active');
    await page.waitForSelector('#signup_magiclink > div.magiclink_password_container.chrome > a', {
        visible: true
    });
    await page.click('#signup_magiclink > div.magiclink_password_container.chrome > a');
    await page.waitForSelector('#signup_password');
    await page.type('#signup_password', 'password');
    await page.waitForSelector('#signup_forms_submit > span.signup_login_btn.active', {
        visible: true
    });
    await page.click('#signup_forms_submit > span.signup_login_btn.active');
    await page.waitForNavigation();
    await page.goto('https://www.tumblr.com/likes');
    var lists = await page.$$eval('[type="video/mp4"]', elems => {
        return elems.map(elem => elem.src)
    });
    var pagination = await page.$eval('#next_page_link', elem => elem.href);
    console.log(pagination)
    var i = 2;
    while (true) {
        await page.goto(pagination);
        lists = lists.concat(await page.$$eval('[type="video/mp4"]', elems => {
            return elems.map(elem => elem.src)
        }));
        if (await page.$('#next_page_link')) {
            pagination = await page.$eval('#next_page_link', elem => elem.href);
            console.log(pagination)
        } else {
            break;
        }
    }
    console.log(lists);
    const CONCURRENCY = 5;
    for(let i = 1; i<= lists.length; i=i+CONCURRENCY){
        try {
            await download(lists.filter((value, index) =>{
                return index>=i-1 && index <i+CONCURRENCY-1;
            }));
        } catch (error) {
            console.log(error);
        }
    }
    await browser.close();
})().catch(console.error);

async function download(urls) {
    await urls.map(async url => {
        try{
            if (!fs.existsSync(`./t/${parseUrl(url)}`)){
                await child_process.exec(`cd ./t && curl -O ${parseUrl(url)} --progress`);
            }
        }
        catch(err){
            console.error(err)
        }
    });
}

/**
 * 
 * @param {String} url 
 */
function parseUrl(url) {
    let res = `https://vtt.tumblr.com/`;
    let array = url.split('/')
    if(url.endsWith('.mp4')){
        return url;
    }
    if (url.endsWith('/480')) {
        res = res + array[array.length-2] + '.mp4';
     }else{
        res = res + array[array.length-1] + '.mp4';
     }
     console.log(res);
     return res;
    
}