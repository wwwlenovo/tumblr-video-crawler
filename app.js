const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const child_process = require('child_process');
const FOLLOW = 'https://www.tumblr.com/following/';
const LIKES = 'https://www.tumblr.com/likes';
const DOWNLOAD_CONCURRENCY = 8;
const CRAWL_CONCURRENCY = 3;
const MAX_PAGE = 20;

(async () => {
    const browser = await puppeteer.launch({
        headless: true
    });
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(90000);
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
    userList.push(LIKES); //download likes in www folder
    console.log(userList);
    for (let i = 1; i <= userList.length; i = i + CRAWL_CONCURRENCY) {
        try {
            console.log(`${i}/${userList.length}`);
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
            const path = `d:/t/${folder}`;
            await fs.ensureDir(path);
            const parsedUrl = parseUrl(url);
            //console.log(`cd ./t/${ folder } && curl - C - O ${ parseUrl(url) }`)
            if(!fs.existsSync(`${path}/${parsedUrl.slice(parsedUrl.lastIndexOf('/') + 1)}`)) {
                await child_process.exec(`d: && cd ./t/${folder} && curl -O ${parsedUrl}`);
            } else {
                console.log(`${path}/${parsedUrl.slice(parsedUrl.lastIndexOf('/') + 1)} exisit.`);
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
    await page.setDefaultNavigationTimeout(90000);
    try {
        await page.goto(user);
    } catch (error) {
        console.log(`Can't open ${user}`);
        try {
            if (user.startsWith('https')) {
                user = 'http' + user.slice(5);
                console.log(`Try ${user}`);
                await page.goto(user);
            }else if (user.startsWith('http')) {
                user = 'https' + user.slice(4);
                console.log(`Try ${user}`);
                await page.goto(user);
            } 
        } catch (error) {
            console.log(error)
            await page.close();
            return await ('Closed');
        }
    }
    try {
        var lists = await page.$$eval('[type="video/mp4"]', elems => {
            return elems.map(elem => elem.src)
        });
        let reg = /(http|https)(:\/\/)([a-zA-Z0-9\.\_\/]+?)([0-9]{3,4}(\.jpg))/g;
        let content = await page.content();
        let pics = content.match(reg);
//        console.log(pics);
        if (pics !== null) {
            lists = lists.concat(pics);
        }
        var count = 2;
        try {
            var pagination = await page.$eval('#next_page_link', elem => elem.href);
            while (true) {
                await page.goto(pagination);
                lists = lists.concat(await page.$$eval('[type="video/mp4"]', elems => {
                    return elems.map(elem => elem.src)
                }));
                let reg = /(http|https)(:\/\/)([a-zA-Z0-9\.\_\/]+?)([0-9]{3,4}(\.jpg))/g;
                let content = await page.content();
                let pics = content.match(reg);
                //        console.log(pics);
                if (pics !== null) {
                    lists = lists.concat(pics);
                }
                if (await page.$('#next_page_link') && count++ < MAX_PAGE) {
                    pagination = await page.$eval('#next_page_link', elem => elem.href);
                } else {
                    break;
                }
            }

        } catch (error) {
            throw new Error(`${user} no page ${count}`);
        }
    } catch (error) {
        console.log(error);
        await page.close();
    }
    console.log(`${user} begin to download! Total:${lists.length} \n`);
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
    if (url.endsWith('.mp4') || url.endsWith('.jpg')) {
        //console.log(url)
        return url;
    }
    let array = url.split('/')
    if (url.endsWith('/480')) {
        res = res + array[array.length - 2] + '.mp4';
    } else {
        res = res + array[array.length - 1] + '.mp4';
    }
    //console.log(res);
    return res;

}