const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const child_process = require('child_process');
const FOLLOW = 'https://www.tumblr.com/following/';
const DOWNLOAD_CONCURRENCY = 5;
const CRAWL_CONCURRENCY = 2;
const MAX_PAGE = 5;

(async () => {
    const browser = await puppeteer.launch({
        headless: true
    });
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(90000)
    await page.goto('https://www.tumblr.com/login');
    await page.type('#signup_determine_email', '@live.com');
    await page.click('#signup_forms_submit > span.signup_determine_btn.active');
    await page.waitForSelector('#signup_magiclink > div.magiclink_password_container.chrome > a', {
        visible: true
    });
    await page.click('#signup_magiclink > div.magiclink_password_container.chrome > a');
    await page.waitForSelector('#signup_password');
    await page.type('#signup_password', '');
    await page.waitForSelector('#signup_forms_submit > span.signup_login_btn.active', {
        visible: true
    });
    await page.click('#signup_forms_submit > span.signup_login_btn.active');
    await page.waitForNavigation();
    let userList = [];
    for (let i = 0; i <= 100; i += 25) {
        await page.goto(FOLLOW + i);
        userList = userList.concat(await page.$$eval('[class="name-link"]', elems => {
            return elems.map(elem => elem.href);
        }));
    }
    console.log(userList);
    for (let i = 1; i <= userList.length; i = i + CRAWL_CONCURRENCY) {
        try {
            await crawlVideo(browser, userList.filter((value, index) => {
                return index >= i - 1 && index < i + CRAWL_CONCURRENCY - 1;
            }));
            
        } catch (error) {
            console.log(error);
        }
    }
    await browser.close();
})().catch(console.error);

async function download(urls, folder = 'video') {
    let promises = await urls.map(async url => {
        try {
            await fs.ensureDir(`./t/${folder}`);
            if (!fs.existsSync(`./t/${folder}/${parseUrl(url)}`)) {
                await child_process.exec(`cd d: && cd ./t/${folder} && curl -O ${parseUrl(url)} --progress`);
            }
        } catch (err) {
            console.error(err)
        }
    });
    await Promise.all(promises);
}

async function crawlVideo(browser, userArray) {
    let promises = await userArray.map(async user => {
        try {
            await gerUrlPerUser(browser, user);
        } catch (error) {
            console.log(error);
        }
    });
    await Promise.all(promises);

}


async function gerUrlPerUser(browser, user) {
    console.log(`${user} begin to crawl url`)
    const page = await browser.newPage();
    try {
        await page.goto(user);
    } catch (error) {
        console.log(error);
        await page.close();
        return await('Closed');
    }
    try {
        var lists = await page.$$eval('[type="video/mp4"]', elems => {
            return elems.map(elem => elem.src)
        });
        var pagination = await page.$eval('#next_page_link', elem => elem.href);
        var count = 2;
        while (true) {
            await page.goto(pagination);
            lists = lists.concat(await page.$$eval('[type="video/mp4"]', elems => {
                return elems.map(elem => elem.src)
            }));
            if (await page.$('#next_page_link') && count++ < MAX_PAGE) {
                pagination = await page.$eval('#next_page_link', elem => elem.href);
            } else {
                break;
            }
        }
        await page.close();   
    } catch (error) {
        console.log(error);
        await page.close(); 
    }
    console.log(`${user} begin to download! ${lists.length} videos \n${lists}`);
    for (let i = 1; i <= lists.length; i = i + DOWNLOAD_CONCURRENCY) {
        try {
            await download(lists.filter((value, index) => {
                return index >= i - 1 && index < i + DOWNLOAD_CONCURRENCY - 1;
            }), user.slice(8).split('.')[0]);
        } catch (error) {
            console.log(error);
        }
    }
    console.log(`${user} download finished!`);
}
/**
 * 
 * @param {String} url 
 */
function parseUrl(url) {
    let res = `https://vtt.tumblr.com/`;
    let array = url.split('/')
    if (url.endsWith('.mp4')) {
        return url;
    }
    if (url.endsWith('/480')) {
        res = res + array[array.length - 2] + '.mp4';
    } else {
        res = res + array[array.length - 1] + '.mp4';
    }
    //console.log(res);
    return res;

}