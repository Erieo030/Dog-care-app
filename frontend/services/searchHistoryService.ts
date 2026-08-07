/** 用途：只在目前裝置保存最近搜尋關鍵字，不保存搜尋結果。 */
import {File,Paths} from 'expo-file-system';
const file=(userId:string)=>new File(Paths.document,`pawlog-search-${userId}.json`);
export async function getSearchHistory(userId:string):Promise<string[]>{try{const target=file(userId);if(!target.exists)return [];const value=JSON.parse(await target.text());return Array.isArray(value)?value.filter(x=>typeof x==='string').slice(0,10):[];}catch{return [];}}
export async function addSearchHistory(userId:string,query:string){const value=query.trim();if(!value)return getSearchHistory(userId);const current=await getSearchHistory(userId);const next=[value,...current.filter(x=>x!==value)].slice(0,10);file(userId).write(JSON.stringify(next));return next;}
export async function clearSearchHistory(userId:string){const target=file(userId);if(target.exists)target.delete();}
