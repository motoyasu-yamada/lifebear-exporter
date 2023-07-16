import moment from "moment";
import "moment/locale/ja";
import puppeteer from "puppeteer";
import { temp_dirpath, temp_filepath } from "./temp-filepath";
import {
  GetAnomalyScheduleDetailJson,
  GetCalendarEventsJson,
  GetRoutineScheduleDetailJson,
  GetScheduleDetailJson,
  GetCalendarListJson,
} from "./types/lifebear";
import { GoogleCalendarCsvRow } from "./types/google-calendar";
import { existsSync, promises } from "fs";

moment.locale("ja");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36";
const URL_CALENDAR = "https://lifebear.com/app/calendar";
const URL_LOGIN = "https://lifebear.com/app/user/login";
const URL_CALENDAR_LIST = "https://web.lifebear.com/Calendar/GetCalendarList";

import { stringify } from "csv-stringify";
import { sleep } from "./sleep";

const csvStringify = (head: string[], lines: any[]) =>
  new Promise<string>((resolve, reject) => {
    stringify([head, ...lines], (error, output) => {
      if (error) {
        reject(error);
      } else {
        resolve(output);
      }
    });
  });

async function csvToString(head: string[], lines: any[]): Promise<string> {
  const utf8 = await csvStringify(head, lines);
  return utf8; // iconvLite.encode(utf8, "shiftjis");
}

async function launchNewPage(): Promise<[puppeteer.Browser, puppeteer.Page]> {
  const dir = temp_dirpath("puppeteer-user-data");
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: dir,
    defaultViewport: {
      width: 963,
      height: 624,
    },
  });
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  return [browser, page];
}

async function promptLogin() {
  const [browser, page] = await launchNewPage();

  await page.goto(URL_LOGIN, { waitUntil: "networkidle2" });
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 1000, "timeout"));
    const url = page.url();
    if (url === URL_CALENDAR) {
      break;
    }
  }
  console.log("ログインしました");
  page.close();
  browser.close();
}

async function getApiWithCache<T>(page: puppeteer.Page, url: string, cacheKey: string, cacheGroup: string): Promise<T> {
  const cacheFile = temp_filepath(`${cacheKey}.json`, `api-cache.${cacheGroup}`);
  if (existsSync(cacheFile)) {
    console.log(`キャッシュから読み込みます ${cacheFile}, ${url}`);
    return JSON.parse(await promises.readFile(cacheFile, "utf8"));
  }
  console.log(`APIからスクレイピングします ${url} -> ${cacheFile}`);
  const json = await getApi<T>(page, url);
  await promises.writeFile(cacheFile, JSON.stringify(json));
  return json;
}

async function getApi<T>(page: puppeteer.Page, url: string): Promise<T> {
  const result = new Promise<T>(async (resolve, reject) => {
    const onResponse = async (response: puppeteer.HTTPResponse) => {
      if (response.url() !== url) {
        return;
      }
      page.off("response", onResponse);
      const status = response.status();
      if (status !== 200) {
        reject(`Response: ${status}`);
        return;
      }
      const result = await response.json();
      // {"body":null,"errorMessage":"予定が見つかりません。","errorCode":"NotFound","errorType":"domain"}
      if ("errorCode" in result) {
        reject(`API Error: ${result.errorCode} ${result.errorMessage}`);
        return;
      }
      await sleep(3000);
      resolve(result);
    };
    page.on("response", onResponse);

    await page.goto(url, { waitUntil: "networkidle2" });
  });

  return await result;
}

(async function main(): Promise<void> {
  let [browser, page] = await launchNewPage();
  const waitForNavigation = page.waitForNavigation();
  await page.goto(URL_CALENDAR, { waitUntil: "networkidle2" });
  await waitForNavigation;
  if (page.url() === "https://lifebear.com/") {
    page.close();
    browser.close();
    await promptLogin();
    [browser, page] = await launchNewPage();
    const waitForNavigation = page.waitForNavigation();
    await page.goto(URL_CALENDAR, { waitUntil: "networkidle2" });
    await waitForNavigation;
    if (page.url() !== URL_CALENDAR) {
      throw new Error(`ログインできませんでした ${page.url()}`);
    }
  }

  const calendarArray = (await getApi<GetCalendarListJson>(page, URL_CALENDAR_LIST)).lifebearCalendars;
  console.log("[SUCCESS] Calendar Fetched");
  const calendars: { [id: string]: { id: string; name: string } } = {};
  const csvs: { [id: string]: GoogleCalendarCsvRow[] } = {};
  const head = [
    "Subject",
    "Start Date",
    "Start Time",
    "End Date",
    "End Time",
    "All Day Event",
    "Description",
    "Location",
  ];
  for (const calendar of calendarArray) {
    calendars[calendar.id] = calendar;
    csvs[calendar.id] = [];
  }

  const fetchStart = moment("2024-07-01");
  const fetchEnd = moment("2014-09-01"); // 2014-09-01
  const now = moment();
  for (let i = fetchStart; !fetchStart.isBefore(fetchEnd); i = i.add(-1, "months").startOf("months")) {
    const startString = i.format("YYYY-MM-DD");
    console.log(`[START] Fetch Schedule ${i.format("YYYY-MM-DD")}`);
    const start = moment(startString);
    const end = moment(startString).endOf("months");
    const endString = end.format("YYYY-MM-DD");
    const url = `https://web.lifebear.com/Calendar/GetCalendarEvents?from=${startString}&to=${endString}`;
    const cacheKey = `${startString}.${endString}`;
    const cashGroup = "GetCalendarEvents";
    const scheduleEvents = (await getApiWithCache<GetCalendarEventsJson>(page, url, cacheKey, cashGroup))
      .scheduleEvents;
    console.log(`[SUCCESS] ${startString} Schedule Fetched: ${scheduleEvents.length} events`);

    for (const event of scheduleEvents) {
      const eventStartDate = moment(event.startDate);
      if (eventStartDate.isBefore(start)) {
        console.log(`Event started in the previouse month: ${event.startDate}, ${start}`);
        continue;
      }
      const row = await (async (): Promise<GoogleCalendarCsvRow> => {
        if (eventStartDate.isAfter(now)) {
          const scheduleId = event.scheduleFamilyId.value;
          switch (event.scheduleFamilyId.type) {
            case "normal": {
              const url = `https://web.lifebear.com/Calendar/GetScheduleDetail?scheduleId=${scheduleId}`;
              const cacheKey = `${scheduleId}`;
              const cashGroup = "GetScheduleDetail";
              const detail = await getApiWithCache<GetScheduleDetailJson>(page, url, cacheKey, cashGroup);
              return [
                event.title,
                event.startDate,
                event.startTime,
                event.endDate,
                event.endTime,
                event.isAllday,
                detail.comment,
                detail.location,
              ];
            }
            case "routine": {
              const repeatOrder = event.scheduleFamilyId.repeatOrder;
              const url = `https://web.lifebear.com/Calendar/GetRoutineScheduleDetail?routineId=${scheduleId}&repeatOrder=${repeatOrder}`;
              const cacheKey = `${scheduleId}.${repeatOrder}`;
              const cashGroup = "GetRoutineScheduleDetail";
              const detail = await getApiWithCache<GetRoutineScheduleDetailJson>(page, url, cacheKey, cashGroup);
              return [
                event.title,
                event.startDate,
                event.startTime,
                event.endDate,
                event.endTime,
                event.isAllday,
                detail.comment,
                detail.location,
              ];
            }
            case "anomaly": {
              const url = `https://web.lifebear.com/Calendar/GetAnomalyScheduleDetail?anomalyRoutineId=${scheduleId}`;
              const cacheKey = `${scheduleId}`;
              const cashGroup = "GetAnomalyScheduleDetail";
              const detail = await getApiWithCache<GetAnomalyScheduleDetailJson>(page, url, cacheKey, cashGroup);
              return [
                event.title,
                event.startDate,
                event.startTime,
                event.endDate,
                event.endTime,
                event.isAllday,
                detail.comment,
                detail.location,
              ];
            }
            default:
              throw new Error(`Not implemented: ${event.scheduleFamilyId.type}`);
          }
        } else {
          return [
            event.title,
            event.startDate,
            event.startTime,
            event.endDate,
            event.endTime,
            event.isAllday,
            undefined,
            undefined,
          ];
        }
      })();
      const calendarId = event.calendarLabelDefinitionId;
      csvs[calendarId].push(row);
    }
  }

  // 出力
  for (const calendarId of Object.keys(csvs)) {
    const path = `./.out/${calendars[calendarId].name}.csv`;
    const rows = csvs[calendarId];
    if (rows.length === 0) {
      console.log(`***skip: ${path}`);
      continue;
    }
    const sjis = await csvToString(head, rows);
    console.log(`***write: ${path}`);
    await promises.writeFile(path, sjis);
  }
})()
  .then(() => {
    console.log("done");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
